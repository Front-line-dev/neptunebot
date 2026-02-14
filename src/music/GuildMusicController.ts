import fs from 'node:fs';

import type { Client } from 'discord.js';
import {
  AudioPlayerStatus,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  demuxProbe,
  entersState,
  joinVoiceChannel,
} from '@discordjs/voice';

import type { Logger } from '../util/logger.ts';
import type { CacheEntry } from './cache.ts';

export type Track = {
  id: string;
  title: string;
  url: string;
  durationSec?: number;
  filePath: string;
  cached: boolean;
  requestedByUserId: string;
  requestedByTag: string;
  textChannelId: string;
  ready: Promise<CacheEntry>;
};

export class GuildMusicController {
  guildId: string;
  client: Client;
  logger: Logger;
  idleDisconnectSec: number;

  queue: Track[];
  current: Track | null;
  playNextRunning: boolean;

  audioPlayer: ReturnType<typeof createAudioPlayer>;
  voiceConnection: any;
  connectedVoiceChannelId: string | null;
  idleTimer: NodeJS.Timeout | null;

  constructor(opts: { guildId: string; client: Client; logger: Logger; idleDisconnectSec: number }) {
    this.guildId = opts.guildId;
    this.client = opts.client;
    this.logger = opts.logger;
    this.idleDisconnectSec = opts.idleDisconnectSec;

    this.queue = [];
    this.current = null;
    this.playNextRunning = false;

    this.audioPlayer = createAudioPlayer();
    this.voiceConnection = null;
    this.connectedVoiceChannelId = null;
    this.idleTimer = null;

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      void this.playNext();
    });

    this.audioPlayer.on('error', (err) => {
      this.logger.error(`[${this.guildId}] AudioPlayer error`, err);
      void this.playNext();
    });
  }

  hasActiveSession(): boolean {
    return Boolean(this.voiceConnection);
  }

  async ensureConnected(opts: {
    guildId: string;
    adapterCreator: any;
    voiceChannelId: string;
  }): Promise<void> {
    const { guildId, adapterCreator, voiceChannelId } = opts;

    if (this.voiceConnection && this.connectedVoiceChannelId === voiceChannelId) {
      return;
    }

    const isBusy = Boolean(this.current) || this.queue.length > 0 || this.audioPlayer.state.status !== AudioPlayerStatus.Idle;
    if (this.voiceConnection && this.connectedVoiceChannelId && this.connectedVoiceChannelId !== voiceChannelId && isBusy) {
      throw new Error('이미 다른 음성 채널에서 재생 중입니다.');
    }

    if (this.voiceConnection) {
      try {
        this.voiceConnection.destroy();
      } catch {
        // ignore
      }
      this.voiceConnection = null;
      this.connectedVoiceChannelId = null;
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannelId,
      guildId,
      adapterCreator,
      selfDeaf: true,
      // Explicitly enable DAVE encryption.
      daveEncryption: true,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        // reconnected (or reconnecting)
      } catch (err) {
        this.logger.warn(`[${this.guildId}] VoiceConnection disconnected permanently`, err);
        try {
          connection.destroy();
        } catch {
          // ignore
        }
        if (this.voiceConnection === connection) {
          this.voiceConnection = null;
          this.connectedVoiceChannelId = null;
        }
      }
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

    connection.subscribe(this.audioPlayer);
    this.voiceConnection = connection;
    this.connectedVoiceChannelId = voiceChannelId;

    this.clearIdleTimer();
  }

  enqueue(track: Track): void {
    this.queue.push(track);
    this.clearIdleTimer();

    if (this.audioPlayer.state.status === AudioPlayerStatus.Idle && !this.playNextRunning) {
      void this.playNext();
    }
  }

  async stop(): Promise<void> {
    this.queue = [];
    this.current = null;
    this.clearIdleTimer();

    try {
      this.audioPlayer.stop(true);
    } catch {
      // ignore
    }

    if (this.voiceConnection) {
      try {
        this.voiceConnection.destroy();
      } catch {
        // ignore
      }
      this.voiceConnection = null;
      this.connectedVoiceChannelId = null;
    }
  }

  async skip(): Promise<boolean> {
    const hasSomething = Boolean(this.current) || this.queue.length > 0;
    try {
      this.audioPlayer.stop(true);
    } catch {
      // ignore
    }
    return hasSomething;
  }

  clearIdleTimer(): void {
    if (!this.idleTimer) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  scheduleIdleDisconnect(): void {
    this.clearIdleTimer();

    if (!this.voiceConnection) return;
    if (this.queue.length > 0) return;
    if (this.audioPlayer.state.status !== AudioPlayerStatus.Idle) return;

    this.idleTimer = setTimeout(() => {
      if (!this.voiceConnection) return;
      if (this.queue.length > 0) return;
      if (this.audioPlayer.state.status !== AudioPlayerStatus.Idle) return;
      try {
        this.voiceConnection.destroy();
      } catch {
        // ignore
      }
      this.voiceConnection = null;
      this.connectedVoiceChannelId = null;
    }, this.idleDisconnectSec * 1000);
  }

  async sendToTextChannel(channelId: string, content: string): Promise<void> {
    try {
      const ch = await this.client.channels.fetch(channelId);
      if (!ch) return;
      if (!('send' in ch)) return;
      await (ch as any).send({ content });
    } catch {
      // ignore
    }
  }

  async playNext(): Promise<void> {
    if (this.playNextRunning) return;
    this.playNextRunning = true;

    try {
      // Keep pulling until we successfully start a track or the queue is empty.
      for (;;) {
        if (this.queue.length === 0) {
          this.current = null;
          this.scheduleIdleDisconnect();
          return;
        }

        const track = this.queue.shift();
        if (!track) continue;

        this.current = track;

        let entry: CacheEntry;
        try {
          entry = await track.ready;
        } catch (err) {
          await this.sendToTextChannel(track.textChannelId, `다운로드 실패: ${track.title}`);
          this.logger.warn(`[${this.guildId}] Track download failed`, err);
          this.current = null;
          continue;
        }

        try {
          const stream = fs.createReadStream(entry.filePath);
          const probe = await demuxProbe(stream);
          const resource = createAudioResource(probe.stream, {
            inputType: probe.type,
          });

          this.audioPlayer.play(resource);
          await this.sendToTextChannel(track.textChannelId, `재생 시작: ${track.title} (요청: ${track.requestedByTag})`);
          return;
        } catch (err) {
          await this.sendToTextChannel(track.textChannelId, `재생 실패: ${track.title}`);
          this.logger.warn(`[${this.guildId}] Track playback failed`, err);
          this.current = null;
          continue;
        }
      }
    } finally {
      this.playNextRunning = false;
    }
  }
}
