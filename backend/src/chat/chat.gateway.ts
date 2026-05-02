import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ChatService } from './chat.service';
import { PresenceService } from '../presence/presence.service';
import { BillingService } from '../billing/billing.service';
import { AvailabilityAlertService } from '../notifications/availability-alert.service';

type IncomingMessageType = 'text' | 'image';

interface SocketIdentity {
  sub: string;
  role: 'user' | 'consultant';
}

@WebSocketGateway({
  path: '/api/socket.io',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private tickIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private startTimes = new Map<string, number>();
  private readonly TICK_MS = 60_000;
  private readonly LOW_CREDITS_THRESHOLD_MIN = 2;

  constructor(
    private chatService: ChatService,
    private presenceService: PresenceService,
    private billingService: BillingService,
    private availabilityAlerts: AvailabilityAlertService,
  ) {}

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
    data: { consultantId: string; clientId: string; clientName: string },
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

    this.server.to(consultantSocketId).emit('incoming-call', {
      callId,
      clientId,
      clientName: data.clientName,
    });

    client.emit('calling', { status: 'ringing', callId });
  }

  @SubscribeMessage('accept-call')
  async handleAcceptCall(
    client: Socket,
    data: { callId: string; clientId: string; consultantId: string },
  ) {
    const id = this.getIdentity(client);
    // Only the consultant being called may accept.
    if (id && id.role === 'consultant' && id.sub !== data.consultantId) {
      this.logger.warn(`accept-call rejected: identity mismatch ${id.sub} vs ${data.consultantId}`);
      return;
    }

    const consultation = await this.chatService.startConsultation(
      data.clientId,
      data.consultantId,
    );

    this.server.to(`user:${data.clientId}`).emit('call-accepted', {
      callId: data.callId,
      consultationId: consultation.id,
      consultantId: data.consultantId,
    });

    client.emit('call-started', {
      callId: data.callId,
      consultationId: consultation.id,
      clientId: data.clientId,
    });

    this.startBillingTick(consultation.id);
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

    if (type === 'text' && !data.content?.trim()) return;
    if (type === 'image') {
      // Apenas aceita URLs servidas pela própria API (multer escreveu em /api/uploads/chat/...)
      if (!mediaUrl || !mediaUrl.startsWith('/api/uploads/chat/')) {
        client.emit('send-error', { reason: 'invalid-media-url' });
        return;
      }
    }

    const message = await this.chatService.saveMessage(
      data.consultationId,
      senderId,
      data.recipientId,
      data.content || '',
      type,
      mediaUrl,
    );

    const recipientSocketId = this.presenceService.getUserSocket(data.recipientId);

    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('message', message);
    } else {
      client.to(data.consultationId).emit('message', message);
    }

    client.emit('message-sent', { id: message.id, tempId: data.content });
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
  }
}
