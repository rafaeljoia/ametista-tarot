import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { PresenceService } from '../presence/presence.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private presenceService: PresenceService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Conectado: ${client.id}`);
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
    client.emit('joined', { consultationId: data.consultationId });
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
    this.server.to(data.consultationId).emit('message', message);
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, data: { consultationId: string; userId: string }) {
    client.to(data.consultationId).emit('user-typing', { userId: data.userId });
  }

  @SubscribeMessage('stop-typing')
  handleStopTyping(client: Socket, data: { consultationId: string; userId: string }) {
    client.to(data.consultationId).emit('user-stop-typing', { userId: data.userId });
  }
}
