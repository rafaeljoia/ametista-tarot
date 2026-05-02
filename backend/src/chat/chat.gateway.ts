import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { PresenceService } from '../presence/presence.service';
import { BillingService } from '../billing/billing.service';

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
  private readonly LOW_CREDITS_THRESHOLD_MIN = 2; // emit warning when < 2 minutes left

  constructor(
    private chatService: ChatService,
    private presenceService: PresenceService,
    private billingService: BillingService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Conectado: ${client.id}`);
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
    this.presenceService.setUserSocket(data.userId, client.id);
    client.join(`user:${data.userId}`);
  }

  @SubscribeMessage('consultant-online')
  handleConsultantOnline(client: Socket, data: { consultantId: string }) {
    this.presenceService.setConsultantOnline(data.consultantId, client.id);
    client.join(`consultant:${data.consultantId}`);
    this.server.emit('consultant-status', {
      consultantId: data.consultantId,
      isOnline: true,
    });
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
    const consultantSocketId = this.presenceService.getConsultantSocket(data.consultantId);

    if (!consultantSocketId) {
      client.emit('call-failed', { reason: 'Consultor está offline' });
      return;
    }

    this.presenceService.setUserSocket(data.clientId, client.id);
    client.join(`user:${data.clientId}`);

    const callId = `${data.clientId}-${data.consultantId}`;

    this.server.to(consultantSocketId).emit('incoming-call', {
      callId,
      clientId: data.clientId,
      clientName: data.clientName,
    });

    client.emit('calling', { status: 'ringing', callId });
  }

  @SubscribeMessage('accept-call')
  async handleAcceptCall(
    client: Socket,
    data: { callId: string; clientId: string; consultantId: string },
  ) {
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

    // Kick off the per-minute billing tick
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
    client.join(data.consultationId);
    this.presenceService.setUserSocket(data.userId, client.id);
    client.emit('joined', { consultationId: data.consultationId });
    this.logger.log(
      `Socket ${client.id} (user ${data.userId}) entrou na sala ${data.consultationId}`,
    );

    // Recover the tick if the server restarted while a consultation is still active
    const c = await this.billingService.findActive(data.consultationId);
    if (c && c.status === 'active' && !this.tickIntervals.has(data.consultationId)) {
      this.startBillingTick(data.consultationId);
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    client: Socket,
    data: { consultationId: string; senderId: string; recipientId: string; content: string },
  ) {
    const message = await this.chatService.saveMessage(
      data.consultationId,
      data.senderId,
      data.recipientId,
      data.content,
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
          await this.billingService.endConsultation(consultationId, result.minutesElapsed);
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

    // First tick after one minute, not immediately
    const interval = setInterval(tick, this.TICK_MS);
    this.tickIntervals.set(consultationId, interval);
  }

  private stopBillingTick(consultationId: string) {
    const t = this.tickIntervals.get(consultationId);
    if (t) clearInterval(t);
    this.tickIntervals.delete(consultationId);
    this.startTimes.delete(consultationId);
  }

  /** Public so ConsultationsController can broadcast manual end events. */
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
