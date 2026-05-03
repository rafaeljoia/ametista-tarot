import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ChatService } from './chat.service';
import { PresenceService } from '../presence/presence.service';
import { BillingService } from '../billing/billing.service';
import { AvailabilityAlertService } from '../notifications/availability-alert.service';
import { ConsultantsService } from '../consultants/consultants.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

type IncomingMessageType = 'text' | 'image';

interface SocketIdentity {
  sub: string;
  role: 'user' | 'consultant';
}

@WebSocketGateway({
  path: '/api/socket.io',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private tickIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private startTimes = new Map<string, number>();
  private readonly TICK_MS = 60_000;
  private readonly LOW_CREDITS_THRESHOLD_MIN = 2;

  // Auto-logout cron: scans every minute for consultants stuck in 'busy' for
  // more than BUSY_TIMEOUT_MIN; flips them to offline and force-logs-out the
  // socket.
  private busyCronInterval: ReturnType<typeof setInterval> | null = null;
  private readonly BUSY_CRON_MS = 60_000;
  private readonly BUSY_TIMEOUT_MIN = 20;

  constructor(
    private chatService: ChatService,
    private presenceService: PresenceService,
    private billingService: BillingService,
    private availabilityAlerts: AvailabilityAlertService,
    private consultantsService: ConsultantsService,
    private systemSettings: SystemSettingsService,
  ) {}

  onModuleInit() {
    this.busyCronInterval = setInterval(
      () => this.runBusyTimeoutCron(),
      this.BUSY_CRON_MS,
    );
  }

  onModuleDestroy() {
    if (this.busyCronInterval) clearInterval(this.busyCronInterval);
    this.busyCronInterval = null;
  }

  /**
   * Scan for consultants in `busy` for over BUSY_TIMEOUT_MIN minutes and
   * force-logout their socket. Idempotent — running it twice in a row on the
   * same consultant is a no-op (status already 'offline').
   */
  private async runBusyTimeoutCron() {
    try {
      const ids = await this.consultantsService.findBusyExpiredIds(
        this.BUSY_TIMEOUT_MIN,
      );
      for (const consultantId of ids) {
        await this.consultantsService
          .setStatus(consultantId, 'offline')
          .catch((e) =>
            this.logger.warn(`busy-cron setStatus offline failed: ${e?.message}`),
          );
        const socketId = this.presenceService.getConsultantSocket(consultantId);
        if (socketId) {
          this.server.to(socketId).emit('force-logout', {
            reason: 'busy-timeout',
            message:
              'Sessão encerrada após 20 minutos em "Ocupado". Faça login novamente para voltar a atender.',
          });
          // Disconnect after a short delay to let the client process the event.
          setTimeout(() => {
            const s = this.server.sockets.sockets.get(socketId);
            if (s) s.disconnect(true);
          }, 1500);
        }
        this.server.emit('consultant-status', { consultantId, isOnline: false });
        this.logger.log(`busy-cron: consultor ${consultantId} → offline (timeout 20min)`);
      }
    } catch (err: any) {
      this.logger.error(`busy-cron failed: ${err?.message}`);
    }
  }

  /** Verify the JWT presented at handshake time and bind identity to socket.data. */
  private getIdentity(client: Socket): SocketIdentity | null {
    return (client.data?.identity as SocketIdentity) || null;
  }

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.headers?.authorization || '').replace(/^Bearer /, '');
    if (token) {
      try {
        const payload = jwt.verify(
          token,
          process.env.JWT_SECRET || 'your-secret-key',
        ) as any;
        if (payload?.sub && (payload.role === 'user' || payload.role === 'consultant')) {
          client.data.identity = { sub: payload.sub, role: payload.role };
        }
      } catch (err: any) {
        this.logger.warn(`Invalid socket token from ${client.id}: ${err?.message}`);
      }
    }
    this.logger.log(`Conectado: ${client.id} (auth=${!!client.data?.identity})`);
  }

  handleDisconnect(client: Socket) {
    const removed = this.presenceService.removeSocket(client.id);
    if (removed.consultantId) {
      this.server.emit('consultant-status', {
        consultantId: removed.consultantId,
        isOnline: false,
      });
      // Fire-and-forget: don't block the disconnect on a DB write.
      this.consultantsService
        .setStatus(removed.consultantId, 'offline')
        .catch((e) =>
          this.logger.warn(`disconnect setStatus offline failed: ${e?.message}`),
        );
    }
  }

  @SubscribeMessage('register-user')
  handleRegisterUser(client: Socket, data: { userId: string }) {
    const id = this.getIdentity(client);
    // If we have a verified identity, force it; otherwise fall back to the
    // legacy behavior so existing clients keep working during rollout.
    const userId = id?.role === 'user' ? id.sub : data.userId;
    if (!userId) return;
    this.presenceService.setUserSocket(userId, client.id);
    client.join(`user:${userId}`);
  }

  @SubscribeMessage('consultant-online')
  async handleConsultantOnline(client: Socket, data: { consultantId: string }) {
    const id = this.getIdentity(client);
    const consultantId = id?.role === 'consultant' ? id.sub : data.consultantId;
    if (!consultantId) return;

    const wasOnline = this.presenceService.isConsultantOnline(consultantId);
    this.presenceService.setConsultantOnline(consultantId, client.id);
    client.join(`consultant:${consultantId}`);
    this.server.emit('consultant-status', { consultantId, isOnline: true });

    // Sync DB status, but never overwrite 'busy' (consultant explicitly asked
    // to stay busy) or 'in_consultation' (in an active call).
    this.consultantsService
      .findById(consultantId)
      .then((c: any) => {
        const current = c?.availabilityStatus;
        if (current !== 'busy' && current !== 'in_consultation') {
          return this.consultantsService.setStatus(consultantId, 'online');
        }
        return null;
      })
      .catch((e) =>
        this.logger.warn(`consultant-online setStatus failed: ${e?.message}`),
      );

    // Disparo de notificações por e-mail somente em transições offline→online
    // para evitar spam quando o consultor reconecta o socket.
    if (!wasOnline) {
      try {
        const sent = await this.availabilityAlerts.dispatchForConsultantOnline(consultantId);
        if (sent > 0) {
          this.logger.log(`Notificações enviadas para ${sent} usuário(s) (consultor ${consultantId} online)`);
        }
      } catch (err: any) {
        this.logger.error(`Falha ao despachar alertas: ${err?.message}`);
      }
    }
  }

  @SubscribeMessage('get-online-consultants')
  handleGetOnlineConsultants(client: Socket) {
    client.emit('online-consultants', {
      ids: this.presenceService.getOnlineConsultantIds(),
    });
  }

  @SubscribeMessage('call-consultant')
  handleCallConsultant(
    client: Socket,
    data: {
      consultantId: string;
      clientId: string;
      clientName: string;
      kind?: 'chat' | 'voice' | 'video';
    },
  ) {
    const id = this.getIdentity(client);
    const clientId = id?.role === 'user' ? id.sub : data.clientId;
    if (!clientId || !data.consultantId) return;

    const consultantSocketId = this.presenceService.getConsultantSocket(data.consultantId);
    if (!consultantSocketId) {
      client.emit('call-failed', { reason: 'Consultor está offline' });
      return;
    }

    this.presenceService.setUserSocket(clientId, client.id);
    client.join(`user:${clientId}`);

    const callId = `${clientId}-${data.consultantId}`;
    const kind = (data.kind === 'voice' || data.kind === 'video') ? data.kind : 'chat';

    this.server.to(consultantSocketId).emit('incoming-call', {
      callId,
      clientId,
      clientName: data.clientName,
      kind,
    });

    client.emit('calling', { status: 'ringing', callId, kind });
  }

  @SubscribeMessage('accept-call')
  async handleAcceptCall(
    client: Socket,
    data: {
      callId: string;
      clientId: string;
      consultantId: string;
      kind?: 'chat' | 'voice' | 'video';
    },
  ) {
    const id = this.getIdentity(client);
    // Only the consultant being called may accept.
    if (id && id.role === 'consultant' && id.sub !== data.consultantId) {
      this.logger.warn(`accept-call rejected: identity mismatch ${id.sub} vs ${data.consultantId}`);
      return;
    }

    const kind: 'chat' | 'voice' | 'video' =
      data.kind === 'voice' || data.kind === 'video' ? data.kind : 'chat';

    // Snapshot do preço vigente — protege billing contra mudanças de preço durante a chamada.
    const priceSnapshot = await this.systemSettings
      .getPricePerMinute(kind)
      .catch(() => undefined);

    const consultation = await this.chatService.startConsultation(
      data.clientId,
      data.consultantId,
      kind,
      priceSnapshot,
    );

    // Mark the consultant as 'in_consultation' for the duration of the call.
    this.consultantsService
      .setStatus(data.consultantId, 'in_consultation')
      .catch((e) =>
        this.logger.warn(`accept-call setStatus failed: ${e?.message}`),
      );

    this.server.to(`user:${data.clientId}`).emit('call-accepted', {
      callId: data.callId,
      consultationId: consultation.id,
      consultantId: data.consultantId,
      kind,
    });

    client.emit('call-started', {
      callId: data.callId,
      consultationId: consultation.id,
      clientId: data.clientId,
      kind,
    });

    this.startBillingTick(consultation.id);
  }

  // -------- WebRTC signaling (Fase 2) --------
  // O servidor não inspeciona SDP/ICE — só repassa entre os 2 participantes da
  // sala (consultationId). Authz: só quem participa da consulta pode emitir
  // (validado pela existência do socket na sala via join-consultation).

  @SubscribeMessage('webrtc-offer')
  handleWebrtcOffer(client: Socket, data: { consultationId: string; sdp: any }) {
    if (!data?.consultationId || !data?.sdp) return;
    client.to(data.consultationId).emit('webrtc-offer', {
      consultationId: data.consultationId,
      sdp: data.sdp,
    });
  }

  @SubscribeMessage('webrtc-answer')
  handleWebrtcAnswer(client: Socket, data: { consultationId: string; sdp: any }) {
    if (!data?.consultationId || !data?.sdp) return;
    client.to(data.consultationId).emit('webrtc-answer', {
      consultationId: data.consultationId,
      sdp: data.sdp,
    });
  }

  @SubscribeMessage('webrtc-ice-candidate')
  handleWebrtcIce(
    client: Socket,
    data: { consultationId: string; candidate: any },
  ) {
    if (!data?.consultationId || !data?.candidate) return;
    client.to(data.consultationId).emit('webrtc-ice-candidate', {
      consultationId: data.consultationId,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('webrtc-call-end')
  handleWebrtcCallEnd(
    client: Socket,
    data: { consultationId: string; reason?: string },
  ) {
    if (!data?.consultationId) return;
    client.to(data.consultationId).emit('webrtc-call-end', {
      consultationId: data.consultationId,
      reason: data.reason || 'peer',
    });
  }

  @SubscribeMessage('webrtc-media-toggle')
  handleWebrtcMediaToggle(
    client: Socket,
    data: { consultationId: string; mic?: boolean; camera?: boolean },
  ) {
    if (!data?.consultationId) return;
    client.to(data.consultationId).emit('webrtc-media-toggle', data);
  }

  @SubscribeMessage('decline-call')
  handleDeclineCall(client: Socket, data: { callId: string; clientId: string }) {
    this.server.to(`user:${data.clientId}`).emit('call-declined', { callId: data.callId });
  }

  @SubscribeMessage('cancel-call')
  handleCancelCall(client: Socket, data: { callId: string; consultantId: string }) {
    this.server.to(`consultant:${data.consultantId}`).emit('call-cancelled', { callId: data.callId });
  }

  @SubscribeMessage('join-consultation')
  async handleJoinConsultation(
    client: Socket,
    data: { userId: string; consultationId: string },
  ) {
    const id = this.getIdentity(client);
    const userId = id ? id.sub : data.userId;
    if (!userId || !data.consultationId) return;

    client.join(data.consultationId);
    this.presenceService.setUserSocket(userId, client.id);
    client.emit('joined', { consultationId: data.consultationId });
    this.logger.log(`Socket ${client.id} (user ${userId}) entrou na sala ${data.consultationId}`);

    const c = await this.billingService.findActive(data.consultationId);
    if (c && c.status === 'active' && !this.tickIntervals.has(data.consultationId)) {
      this.startBillingTick(data.consultationId);
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    client: Socket,
    data: {
      consultationId: string;
      senderId: string;
      recipientId: string;
      content: string;
      type?: IncomingMessageType;
      mediaUrl?: string | null;
    },
  ) {
    const id = this.getIdentity(client);
    // If we know who the socket is, force the senderId to match the JWT subject.
    const senderId = id ? id.sub : data.senderId;
    if (!senderId || !data.consultationId || !data.recipientId) return;

    const type: IncomingMessageType = data.type === 'image' ? 'image' : 'text';
    const mediaUrl = type === 'image' ? (data.mediaUrl || '').trim() : null;
    const tempId = (data as any).tempId as string | undefined;

    if (type === 'text' && !data.content?.trim()) return;
    if (type === 'image') {
      // Apenas aceita URLs servidas pela própria API (multer escreveu em /api/uploads/chat/...)
      if (!mediaUrl || !mediaUrl.startsWith('/api/uploads/chat/')) {
        client.emit('send-error', { tempId, reason: 'invalid-media-url' });
        return;
      }
    }

    // Autorização: o remetente precisa ser participante da consulta. Sem isso,
    // qualquer socket autenticado poderia escrever em qualquer consultationId
    // (IDOR). Usuário deve ser cliente, consultor deve ser o consultor da consulta.
    const consultation = await this.chatService.findConsultation(data.consultationId);
    if (!consultation) {
      client.emit('send-error', { tempId, reason: 'consultation-not-found' });
      return;
    }
    const role = id?.role;
    const isMember =
      (role === 'user' && consultation.clientId === senderId) ||
      (role === 'consultant' && consultation.consultantId === senderId);
    if (!isMember) {
      this.logger.warn(
        `send-message rejeitado por authz: socket=${client.id} sender=${senderId} role=${role} consultation=${data.consultationId}`,
      );
      client.emit('send-error', { tempId, reason: 'forbidden' });
      return;
    }

    // Recipiente correto é sempre a contraparte da consulta — nunca confiar no client.
    const recipientId =
      role === 'user' ? consultation.consultantId : consultation.clientId;

    const message = await this.chatService.saveMessage(
      data.consultationId,
      senderId,
      recipientId,
      data.content || '',
      type,
      mediaUrl,
    );

    const recipientSocketId = this.presenceService.getUserSocket(recipientId);

    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('message', message);
    } else {
      client.to(data.consultationId).emit('message', message);
    }

    // Eco para o remetente reconciliar o id real com o tempId otimista.
    client.emit('message-sent', {
      id: message.id,
      tempId,
      createdAt: message.createdAt,
    });
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, data: { consultationId: string; userId: string }) {
    client.to(data.consultationId).emit('user-typing', { userId: data.userId });
  }

  @SubscribeMessage('stop-typing')
  handleStopTyping(client: Socket, data: { consultationId: string; userId: string }) {
    client.to(data.consultationId).emit('user-stop-typing', { userId: data.userId });
  }

  // -------- Billing helpers --------

  private startBillingTick(consultationId: string) {
    if (this.tickIntervals.has(consultationId)) return;
    this.startTimes.set(consultationId, Date.now());

    const tick = async () => {
      try {
        const c = await this.billingService.findActive(consultationId);
        if (!c || c.status !== 'active') {
          this.stopBillingTick(consultationId);
          return;
        }

        const baseStart = c.startedAt
          ? new Date(c.startedAt).getTime()
          : this.startTimes.get(consultationId) || Date.now();
        const elapsedMinutes = Math.max(0, (Date.now() - baseStart) / 60000);

        const result = await this.billingService.chargeForMinutes(
          consultationId,
          elapsedMinutes,
        );
        if (!result) return;

        this.server.to(consultationId).emit('billing-tick', {
          consultationId,
          minutesElapsed: result.minutesElapsed,
          minutesCharged: result.minutesCharged,
          creditsRemaining: result.creditsRemaining,
          costSoFar: result.costSoFar,
          pricePerMinute: result.pricePerMinute,
        });

        // Tick separado para o consultor com valor LÍQUIDO (já com comissão
        // aplicada). O consultor não deve ver o valor cheio cobrado do cliente.
        try {
          const consultation = await this.chatService.findConsultation(consultationId);
          if (consultation?.consultantId) {
            const consultant: any = await this.consultantsService.findById(
              consultation.consultantId,
            );
            const percent = Number(consultant?.commissionPercent ?? 50);
            const consultantEarnings = +(result.costSoFar * (percent / 100)).toFixed(2);
            this.server
              .to(`consultant:${consultation.consultantId}`)
              .emit('billing-tick-consultant', {
                consultationId,
                minutesElapsed: result.minutesElapsed,
                minutesCharged: result.minutesCharged,
                consultantEarnings,
                commissionPercent: percent,
              });
          }
        } catch (e: any) {
          this.logger.warn(`billing-tick-consultant failed: ${e?.message}`);
        }

        const minutesLeft =
          result.pricePerMinute > 0
            ? result.creditsRemaining / result.pricePerMinute
            : Number.POSITIVE_INFINITY;

        if (
          result.creditsRemaining > 0 &&
          minutesLeft <= this.LOW_CREDITS_THRESHOLD_MIN
        ) {
          this.server.to(consultationId).emit('low-credits', {
            consultationId,
            creditsRemaining: result.creditsRemaining,
            minutesLeft: Math.max(0, minutesLeft),
          });
        }

        if (result.outOfCredits) {
          await this.billingService.endConsultation(consultationId);
          this.notifyEnded(consultationId, {
            reason: 'out-of-credits',
            minutesUsed: result.minutesCharged,
            creditsUsed: result.costSoFar,
          });
        }
      } catch (err: any) {
        this.logger.error(`Billing tick failed: ${err?.message}`);
      }
    };

    const interval = setInterval(tick, this.TICK_MS);
    this.tickIntervals.set(consultationId, interval);
  }

  private stopBillingTick(consultationId: string) {
    const t = this.tickIntervals.get(consultationId);
    if (t) clearInterval(t);
    this.tickIntervals.delete(consultationId);
    this.startTimes.delete(consultationId);
  }

  notifyEnded(
    consultationId: string,
    payload: { reason: string; minutesUsed: number; creditsUsed: number },
  ) {
    this.server.to(consultationId).emit('consultation-ended', {
      consultationId,
      ...payload,
    });
    this.stopBillingTick(consultationId);

    // Revert the consultant back to 'online' (or 'offline' if disconnected).
    this.chatService
      .findConsultation(consultationId)
      .then((c) => {
        if (!c?.consultantId) return null;
        const stillConnected = this.presenceService.isConsultantOnline(
          c.consultantId,
        );
        return this.consultantsService.setStatus(
          c.consultantId,
          stillConnected ? 'online' : 'offline',
        );
      })
      .catch((e) =>
        this.logger.warn(`notifyEnded setStatus failed: ${e?.message}`),
      );
  }
}
