import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceService {
  private consultantToSocket = new Map<string, string>();
  private socketToConsultant = new Map<string, string>();
  private userToSocket = new Map<string, string>();
  private socketToUser = new Map<string, string>();

  setConsultantOnline(consultantId: string, socketId: string): void {
    this.consultantToSocket.set(consultantId, socketId);
    this.socketToConsultant.set(socketId, consultantId);
  }

  setUserSocket(userId: string, socketId: string): void {
    this.userToSocket.set(userId, socketId);
    this.socketToUser.set(socketId, userId);
  }

  removeSocket(socketId: string): { consultantId?: string; userId?: string } {
    const consultantId = this.socketToConsultant.get(socketId);
    const userId = this.socketToUser.get(socketId);

    if (consultantId) {
      this.consultantToSocket.delete(consultantId);
      this.socketToConsultant.delete(socketId);
    }

    if (userId) {
      this.userToSocket.delete(userId);
      this.socketToUser.delete(socketId);
    }

    return { consultantId, userId };
  }

  getConsultantSocket(consultantId: string): string | undefined {
    return this.consultantToSocket.get(consultantId);
  }

  getUserSocket(userId: string): string | undefined {
    return this.userToSocket.get(userId);
  }

  isConsultantOnline(consultantId: string): boolean {
    return this.consultantToSocket.has(consultantId);
  }

  getOnlineConsultantIds(): string[] {
    return Array.from(this.consultantToSocket.keys());
  }
}
