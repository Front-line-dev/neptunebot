import { spawn } from 'node:child_process';

export type VideoMeta = {
  id: string;
  title: string;
  durationSec?: number;
  webpageUrl?: string;
};

async function runProcess(bin: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });

    child.on('error', (err) => {
      reject(err);
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const e = new Error(`Process failed: ${bin} ${args.join(' ')} (exit ${code})\n${stderr}`);
      reject(e);
    });
  });
}

function pickVideoObject(obj: unknown): any {
  if (!obj || typeof obj !== 'object') return null;
  // If it's a playlist-like object, pick the first entry.
  const anyObj: any = obj;
  if (Array.isArray(anyObj.entries) && anyObj.entries.length > 0) {
    return anyObj.entries[0];
  }
  return anyObj;
}

export async function ytdlpGetInfo(ytdlpBin: string, url: string): Promise<VideoMeta> {
  const { stdout } = await runProcess(ytdlpBin, ['--no-playlist', '--no-warnings', '-j', '--', url]);

  const line = stdout
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)[0];
  if (!line) {
    throw new Error('yt-dlp returned empty metadata output');
  }

  const parsed = pickVideoObject(JSON.parse(line));
  if (!parsed?.id || !parsed?.title) {
    throw new Error('yt-dlp metadata missing id/title');
  }

  const duration = typeof parsed.duration === 'number' ? parsed.duration : undefined;
  const webpageUrl = typeof parsed.webpage_url === 'string' ? parsed.webpage_url : undefined;

  return {
    id: String(parsed.id),
    title: String(parsed.title),
    durationSec: duration,
    webpageUrl,
  };
}

export async function ytdlpDownloadOpus(opts: {
  ytdlpBin: string;
  ffmpegBin: string;
  url: string;
  outputTemplate: string;
}): Promise<void> {
  const { ytdlpBin, ffmpegBin, url, outputTemplate } = opts;

  const args = [
    '--no-playlist',
    '--no-warnings',
    '-f',
    'bestaudio',
    '-x',
    '--audio-format',
    'opus',
    '--audio-quality',
    '0',
    '-o',
    outputTemplate,
    '--',
    url,
  ];

  // If ffmpeg is just on PATH (default "ffmpeg"), let yt-dlp resolve it.
  // Only force a location when a path-like value is provided.
  if (ffmpegBin.includes('/') || ffmpegBin.includes('\\')) {
    args.splice(args.indexOf('-o'), 0, '--ffmpeg-location', ffmpegBin);
  }

  await runProcess(ytdlpBin, args);
}
