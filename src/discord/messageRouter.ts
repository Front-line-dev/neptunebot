import type { Client, Message } from 'discord.js';

import type { AppConfig } from '../config.ts';
import type { Logger } from '../util/logger.ts';
import { extractUrls, isSkipCommand, isStopCommand, isYouTubeUrl } from './parse.ts';
import type { MusicService } from '../music/MusicService.ts';

async function safeSend(message: Message, content: string): Promise<void> {
  try {
    const ch: unknown = message.channel;
    if (!ch || typeof (ch as any).send !== 'function') return;
    await (ch as any).send({ content });
  } catch {
    // ignore
  }
}

export function registerMessageRouter(opts: {
  client: Client;
  config: AppConfig;
  music: MusicService;
  logger: Logger;
}): void {
  const { client, config, music, logger } = opts;

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const contextKey = `${message.guild.id}:${message.channel.id}`;
    if (!config.allowedCommandContexts.has(contextKey)) return;

    const content = message.content ?? '';

    if (isStopCommand(content)) {
      const stopped = await music.stopGuild(message.guild.id);
      if (!stopped) {
        await safeSend(message, '재생중이 아닙니다.');
        return;
      }
      await safeSend(message, '정지했습니다.');
      return;
    }

    if (isSkipCommand(content)) {
      const skipped = await music.skipGuild(message.guild.id);
      if (!skipped) {
        await safeSend(message, '스킵할 트랙이 없습니다.');
        return;
      }
      await safeSend(message, '다음 트랙으로 넘어갑니다.');
      return;
    }

    const urls = extractUrls(content).filter(isYouTubeUrl);
    if (urls.length === 0) return;

    if (!message.member?.voice?.channelId) {
      await safeSend(message, '음성 채널에 먼저 들어가세요.');
      return;
    }

    try {
      const results = await music.enqueueUrls({
        guild: message.guild,
        voiceChannelId: message.member.voice.channelId,
        textChannelId: message.channel.id,
        requestedByUserId: message.author.id,
        requestedByTag: message.author.tag,
        urls,
      });

      for (const r of results) {
        if (r.ok) {
          const prefix = r.cached ? '캐시 사용' : '큐 추가됨';
          await safeSend(message, `${prefix}: ${r.title}`);
        } else {
          await safeSend(message, `추가 실패: ${r.url} (${r.errorMessage})`);
        }
      }
    } catch (err) {
      logger.error('enqueueUrls failed', err);
      const msg = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.';
      await safeSend(message, msg);
    }
  });
}
