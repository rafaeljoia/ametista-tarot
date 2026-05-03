import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WebrtcService } from './webrtc.service';

@Controller('webrtc')
@UseGuards(AuthGuard('jwt'))
export class WebrtcController {
  constructor(private webrtc: WebrtcService) {}

  /**
   * GET /api/webrtc/ice-servers
   * Retorna STUN público + TURN com credenciais TTL (se configurado).
   * Qualquer usuário autenticado pode chamar.
   */
  @Get('ice-servers')
  iceServers(@Request() req: any) {
    return this.webrtc.getIceServers(req.user?.id || 'anon');
  }
}
