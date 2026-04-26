import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>();

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
    this.userSockets.delete(client.id);
  }

  @SubscribeMessage('join-consultation')
  async handleJoinConsultation(
    client: Socket,
    data: { userId: string; consultationId: string },
  ) {
    client.join(data.consultationId);
    this.userSockets.set(client.id, data.userId);
    client.emit('joined', { consultationId: data.consultationId });
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    client: Socket,
    data: {
      consultationId: string;
      senderId: string;
      recipientId: string;
      content: string;
    },
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
  handleTyping(
    client: Socket,
    data: { consultationId: string; userId: string },
  ) {
    client.to(data.consultationId).emit('user-typing', { userId: data.userId });
  }

  @SubscribeMessage('stop-typing')
  handleStopTyping(
    client: Socket,
    data: { consultationId: string; userId: string },
  ) {
    client
      .to(data.consultationId)
      .emit('user-stop-typing', { userId: data.userId });
  }
}
