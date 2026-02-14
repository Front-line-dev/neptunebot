import type { Client, Guild } from 'discord.js';

import type { AppConfig } from '../config.ts';
import type { Logger } from '../util/logger.ts';
import { CacheManager } from './cache.ts';
import { GuildMusicController } from './GuildMusicController.ts';

export type EnqueueResult =
  | { ok: true; url: string; title: string; cached: boolean }
  | { ok: false; url: string; errorMessage: string };

export class MusicService {
  client: Client;
  logger: Logger;
  config: AppConfig;
  cache: CacheManager;
  controllers: Map<string, GuildMusicController>;

  constructor(opts: { client: Client; config: AppConfig; logger: Logger }) {
    this.client = opts.client;
    this.config = opts.config;
    this.logger = opts.logger;
    this.cache = new CacheManager({
      cacheDir: this.config.cacheDir,
      ytdlpBin: this.config.ytdlpBin,
      ffmpegBin: this.config.ffmpegBin,
      logger: this.logger,
    });
    this.controllers = new Map();
  }

  async init(): Promise<void> {
    await this.cache.init();
  }

  getOrCreateController(guildId: string): GuildMusicController {
    const existing = this.controllers.get(guildId);
    if (existing) return existing;
    const c = new GuildMusicController({
      guildId,
      client: this.client,
      logger: this.logger,
      idleDisconnectSec: this.config.idleDisconnectSec,
    });
    this.controllers.set(guildId, c);
    return c;
  }

  async enqueueUrls(opts: {
    guild: Guild;
    voiceChannelId: string;
    textChannelId: string;
    requestedByUserId: string;
    requestedByTag: string;
    urls: string[];
  }): Promise<EnqueueResult[]> {
    const { guild, voiceChannelId, textChannelId, requestedByUserId, requestedByTag, urls } = opts;

    const controller = this.getOrCreateController(guild.id);
    await controller.ensureConnected({
      guildId: guild.id,
      adapterCreator: (guild as any).voiceAdapterCreator,
      voiceChannelId,
    });

    const results: EnqueueResult[] = [];

    for (const url of urls) {
      try {
        const prepared = await this.cache.prepare(url);
        controller.enqueue({
          id: prepared.id,
          title: prepared.title,
          url: prepared.url,
          durationSec: prepared.durationSec,
          filePath: prepared.filePath,
          cached: prepared.cached,
          requestedByUserId,
          requestedByTag,
          textChannelId,
          ready: prepared.ready,
        });
        results.push({ ok: true, url, title: prepared.title, cached: prepared.cached });
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : 'unknown error';
        results.push({ ok: false, url, errorMessage: msg });
      }
    }

    return results;
  }

  async stopGuild(guildId: string): Promise<boolean> {
    const c = this.controllers.get(guildId);
    if (!c) return false;
    if (!c.hasActiveSession() && c.queue.length === 0 && !c.current) return false;
    await c.stop();
    return true;
  }

  async skipGuild(guildId: string): Promise<boolean> {
    const c = this.controllers.get(guildId);
    if (!c) return false;
    return await c.skip();
  }

  async stopAll(): Promise<void> {
    const controllers = Array.from(this.controllers.values());
    await Promise.allSettled(controllers.map((c) => c.stop()));
  }
}
