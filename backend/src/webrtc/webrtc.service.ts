import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface IceServersResponse {
  iceServers: IceServer[];
  ttl: number;
}

@Injectable()
export class WebrtcService {
  private readonly logger = new Logger(WebrtcService.name);
  private readonly TTL_SECONDS = 3600;

  /**
   * Gera lista de ICE servers (STUN público + TURN próprio se configurado).
   *
   * Quando TURN_SHARED_SECRET ou TURN_HOST estiverem ausentes, retorna apenas
   * STUN. Não quebra a aplicação — só limita o WebRTC a redes "fáceis".
   * Padrão de credenciais segue draft-uberti-behave-turn-rest:
   *   username = `<unix_ts_expiracao>:<identifier>`
   *   credential = base64(HMAC-SHA1(secret, username))
   */
  getIceServers(identifier: string): IceServersResponse {
    const iceServers: IceServer[] = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ];

    const secret = process.env.TURN_SHARED_SECRET;
    const host = process.env.TURN_HOST;

    if (secret && host) {
      const expiresAt = Math.floor(Date.now() / 1000) + this.TTL_SECONDS;
      const safeId = (identifier || 'anon').replace(/[^a-zA-Z0-9_-]/g, '');
      const username = `${expiresAt}:${safeId}`;
      const credential = createHmac('sha1', secret)
        .update(username)
        .digest('base64');

      iceServers.push({
        urls: [
          `turn:${host}:3478?transport=udp`,
          `turn:${host}:3478?transport=tcp`,
        ],
        username,
        credential,
      });
    } else {
      this.logger.warn(
        'TURN não configurado (TURN_SHARED_SECRET / TURN_HOST). Servindo apenas STUN.',
      );
    }

    return { iceServers, ttl: this.TTL_SECONDS };
  }
}
