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

export interface PostCallOffer {
  enabled: boolean;
  price: number;
  text: string;
}

const KEYS = {
  chat: 'price_chat_per_min',
  voice: 'price_voice_per_min',
  video: 'price_video_per_min',
  postCallEnabled: 'post_call_offer_enabled',
  postCallPrice: 'post_call_offer_price',
  postCallText: 'post_call_offer_text',
  offeringDeadlineHours: 'offering_deadline_hours',
} as const;

const OFFERING_DEADLINE_DEFAULT_HOURS = 24;

const DEFAULTS: Pricing = { chat: 1, voice: 3, video: 5 };
const POST_CALL_DEFAULT: PostCallOffer = {
  enabled: false,
  price: 5,
  text:
    'Por apenas R$ {{price}}, você pode receber indicação de banhos e orações. ' +
    'A atendente {{consultant}} pode preparar e enviar diretamente no seu e-mail.',
};
const CACHE_TTL_MS = 60_000;

@Injectable()
export class SystemSettingsService {
  private cache: { data: Pricing; expiresAt: number } | null = null;
  private offerCache: { data: PostCallOffer; expiresAt: number } | null = null;

  constructor(
    @InjectRepository(SystemSetting)
    private repo: Repository<SystemSetting>,
  ) {}

  async getPricing(): Promise<Pricing> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.data;
    const rows = await this.repo.find();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const data: Pricing = {
      chat: this.toNum(map.get(KEYS.chat), DEFAULTS.chat),
      voice: this.toNum(map.get(KEYS.voice), DEFAULTS.voice),
      video: this.toNum(map.get(KEYS.video), DEFAULTS.video),
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

  // ----- Oferta pós-atendimento -----

  async getPostCallOffer(): Promise<PostCallOffer> {
    if (this.offerCache && this.offerCache.expiresAt > Date.now()) {
      return this.offerCache.data;
    }
    const rows = await this.repo.find();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const data: PostCallOffer = {
      enabled: this.toBool(map.get(KEYS.postCallEnabled), POST_CALL_DEFAULT.enabled),
      price: this.toNum(map.get(KEYS.postCallPrice), POST_CALL_DEFAULT.price),
      text: (map.get(KEYS.postCallText) ?? POST_CALL_DEFAULT.text) || POST_CALL_DEFAULT.text,
    };
    this.offerCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return data;
  }

  async setPostCallOffer(input: Partial<PostCallOffer>): Promise<PostCallOffer> {
    if (typeof input.enabled === 'boolean') {
      await this.repo.upsert(
        { key: KEYS.postCallEnabled, value: input.enabled ? 'true' : 'false' } as any,
        { conflictPaths: ['key'] },
      );
    }
    if (typeof input.price === 'number') {
      if (!Number.isFinite(input.price) || input.price < 0) {
        throw new Error(`Preço inválido para oferta: ${input.price}`);
      }
      await this.repo.upsert(
        { key: KEYS.postCallPrice, value: input.price.toFixed(2) } as any,
        { conflictPaths: ['key'] },
      );
    }
    if (typeof input.text === 'string') {
      const t = input.text.trim();
      if (t.length < 10) throw new Error('Texto da oferta muito curto');
      await this.repo.upsert(
        { key: KEYS.postCallText, value: t } as any,
        { conflictPaths: ['key'] },
      );
    }
    this.offerCache = null;
    return this.getPostCallOffer();
  }

  // ----- Prazo das oferendas (horas) -----

  async getOfferingDeadlineHours(): Promise<number> {
    const row = await this.repo.findOne({ where: { key: KEYS.offeringDeadlineHours } });
    const n = this.toNum(row?.value, OFFERING_DEADLINE_DEFAULT_HOURS);
    return Math.max(1, Math.min(24 * 30, Math.floor(n)));
  }

  async setOfferingDeadlineHours(hours: number): Promise<number> {
    if (!Number.isFinite(hours) || hours < 1 || hours > 24 * 30) {
      throw new Error('Prazo deve estar entre 1 e 720 horas');
    }
    const value = String(Math.floor(hours));
    await this.repo.upsert(
      { key: KEYS.offeringDeadlineHours, value } as any,
      { conflictPaths: ['key'] },
    );
    return this.getOfferingDeadlineHours();
  }

  private toNum(v: any, def: number): number {
    if (v === undefined || v === null || v === '') return def;
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }
  private toBool(v: any, def: boolean): boolean {
    if (v === undefined || v === null || v === '') return def;
    if (typeof v === 'boolean') return v;
    const s = String(v).trim().toLowerCase();
    if (['true', '1', 'yes', 'sim'].includes(s)) return true;
    if (['false', '0', 'no', 'nao', 'não'].includes(s)) return false;
    return def;
  }
}
