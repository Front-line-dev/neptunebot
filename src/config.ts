import 'dotenv/config';

import path from 'node:path';
import { z } from 'zod';

import type { LogLevel } from './util/logger.ts';

export type AppConfig = {
  discordToken: string;
  allowedCommandContexts: Set<string>;
  cacheDir: string;
  ytdlpBin: string;
  ffmpegBin: string;
  idleDisconnectSec: number;
  logLevel: LogLevel;
};

function parseAllowedCommandContexts(raw: string): Set<string> {
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error('ALLOWED_COMMAND_CONTEXTS must have at least one entry.');
  }

  const set = new Set<string>();
  for (const part of parts) {
    const [guildId, channelId, extra] = part.split(':').map((s) => s.trim());
    if (!guildId || !channelId || extra) {
      throw new Error(`Invalid ALLOWED_COMMAND_CONTEXTS entry: "${part}" (expected GUILD_ID:TEXT_CHANNEL_ID)`);
    }
    if (!/^\d+$/.test(guildId) || !/^\d+$/.test(channelId)) {
      throw new Error(`Invalid ALLOWED_COMMAND_CONTEXTS entry: "${part}" (IDs must be numeric strings)`);
    }
    set.add(`${guildId}:${channelId}`);
  }

  return set;
}

export function loadConfig(): AppConfig {
  const schema = z.object({
    DISCORD_TOKEN: z.string().min(1),
    ALLOWED_COMMAND_CONTEXTS: z.string().min(1),

    CACHE_DIR: z.string().default('./cache'),
    YTDLP_BIN: z.string().default('yt-dlp'),
    FFMPEG_BIN: z.string().default('ffmpeg'),
    IDLE_DISCONNECT_SEC: z.coerce.number().int().nonnegative().default(60),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  });

  const parsed = schema.parse(process.env);

  return {
    discordToken: parsed.DISCORD_TOKEN,
    allowedCommandContexts: parseAllowedCommandContexts(parsed.ALLOWED_COMMAND_CONTEXTS),
    cacheDir: path.resolve(process.cwd(), parsed.CACHE_DIR),
    ytdlpBin: parsed.YTDLP_BIN,
    ffmpegBin: parsed.FFMPEG_BIN,
    idleDisconnectSec: parsed.IDLE_DISCONNECT_SEC,
    logLevel: parsed.LOG_LEVEL,
  };
}

