import fs from 'node:fs/promises';
import path from 'node:path';

import type { Logger } from '../util/logger.ts';
import { ytdlpDownloadOpus, ytdlpGetInfo } from './ytdlp.ts';

export type CacheEntry = {
  id: string;
  title: string;
  url: string;
  durationSec?: number;
  filePath: string;
  cached: boolean;
};

export type PreparedTrack = {
  id: string;
  title: string;
  url: string;
  durationSec?: number;
  filePath: string;
  cached: boolean;
  ready: Promise<CacheEntry>;
};

async function fileExistsNonEmpty(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

export class CacheManager {
  cacheDir: string;
  ytdlpBin: string;
  ffmpegBin: string;
  logger: Logger;
  inFlight: Map<string, Promise<CacheEntry>>;

  constructor(opts: { cacheDir: string; ytdlpBin: string; ffmpegBin: string; logger: Logger }) {
    this.cacheDir = opts.cacheDir;
    this.ytdlpBin = opts.ytdlpBin;
    this.ffmpegBin = opts.ffmpegBin;
    this.logger = opts.logger;
    this.inFlight = new Map();
  }

  async init(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }

  async prepare(url: string): Promise<PreparedTrack> {
    const meta = await ytdlpGetInfo(this.ytdlpBin, url);
    const resolvedUrl = meta.webpageUrl ?? url;

    const filePath = path.join(this.cacheDir, `${meta.id}.opus`);
    const metaPath = path.join(this.cacheDir, `${meta.id}.json`);

    // Always try to write metadata (best-effort).
    void fs
      .writeFile(
        metaPath,
        JSON.stringify(
          {
            id: meta.id,
            title: meta.title,
            url: resolvedUrl,
            durationSec: meta.durationSec,
            updatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        'utf8',
      )
      .catch(() => undefined);

    const alreadyCached = await fileExistsNonEmpty(filePath);
    if (alreadyCached) {
      return {
        id: meta.id,
        title: meta.title,
        url: resolvedUrl,
        durationSec: meta.durationSec,
        filePath,
        cached: true,
        ready: Promise.resolve({
          id: meta.id,
          title: meta.title,
          url: resolvedUrl,
          durationSec: meta.durationSec,
          filePath,
          cached: true,
        }),
      };
    }

    const existing = this.inFlight.get(meta.id);
    if (existing) {
      return {
        id: meta.id,
        title: meta.title,
        url: resolvedUrl,
        durationSec: meta.durationSec,
        filePath,
        cached: false,
        ready: existing,
      };
    }

    const outputTemplate = path.join(this.cacheDir, '%(id)s.%(ext)s');

    const p = (async (): Promise<CacheEntry> => {
      this.logger.info(`Downloading: ${resolvedUrl}`);
      await ytdlpDownloadOpus({
        ytdlpBin: this.ytdlpBin,
        ffmpegBin: this.ffmpegBin,
        url: resolvedUrl,
        outputTemplate,
      });

      const ok = await fileExistsNonEmpty(filePath);
      if (!ok) {
        throw new Error(`Download completed but cache file missing: ${filePath}`);
      }

      return {
        id: meta.id,
        title: meta.title,
        url: resolvedUrl,
        durationSec: meta.durationSec,
        filePath,
        cached: false,
      };
    })()
      .catch((err) => {
        this.logger.error('Download failed', err);
        throw err;
      })
      .finally(() => {
        this.inFlight.delete(meta.id);
      });

    this.inFlight.set(meta.id, p);

    return {
      id: meta.id,
      title: meta.title,
      url: resolvedUrl,
      durationSec: meta.durationSec,
      filePath,
      cached: false,
      ready: p,
    };
  }
}

