import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../database/entities/system-setting.entity';

export type ConsultationKind = 'chat' | 'voice' | 'video';

export interface Pricing {
  chat: number;
  voice: number;
  video: number;
}

const KEYS = {
  chat: 'price_chat_per_min',
  voice: 'price_voice_per_min',
  video: 'price_video_per_min',
} as const;

const DEFAULTS: Pricing = { chat: 1, voice: 3, video: 5 };
const CACHE_TTL_MS = 60_000;

@Injectable()
export class SystemSettingsService {
  private cache: { data: Pricing; expiresAt: number } | null = null;

  constructor(
    @InjectRepository(SystemSetting)
    private repo: Repository<SystemSetting>,
  ) {}

  async getPricing(): Promise<Pricing> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.data;
    const rows = await this.repo.find();
    const map = new Map(rows.map((r) => [r.key, Number(r.value)]));
    const data: Pricing = {
      chat: map.get(KEYS.chat) ?? DEFAULTS.chat,
      voice: map.get(KEYS.voice) ?? DEFAULTS.voice,
      video: map.get(KEYS.video) ?? DEFAULTS.video,
    };
    this.cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return data;
  }

  async getPricePerMinute(kind: ConsultationKind): Promise<number> {
    const p = await this.getPricing();
    return p[kind] ?? p.chat;
  }

  async setPricing(input: Partial<Pricing>): Promise<Pricing> {
    const entries: Array<[string, number]> = [];
    if (typeof input.chat === 'number') entries.push([KEYS.chat, input.chat]);
    if (typeof input.voice === 'number') entries.push([KEYS.voice, input.voice]);
    if (typeof input.video === 'number') entries.push([KEYS.video, input.video]);

    for (const [key, value] of entries) {
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Preço inválido para ${key}: ${value}`);
      }
      await this.repo.upsert(
        { key, value: value.toFixed(2) } as any,
        { conflictPaths: ['key'] },
      );
    }
    this.cache = null;
    return this.getPricing();
  }
}
