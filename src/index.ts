import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

import { generateDependencyReport } from '@discordjs/voice';

import { loadConfig } from './config.ts';
import { createDiscordClient } from './discord/client.ts';
import { registerMessageRouter } from './discord/messageRouter.ts';
import { MusicService } from './music/MusicService.ts';
import { createLogger } from './util/logger.ts';

async function checkCommand(bin: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${bin} ${args.join(' ')} (exit ${code})`));
    });
  });
}

async function preflight(opts: { ytdlpBin: string; ffmpegBin: string }): Promise<void> {
  // Voice dependency report is useful on servers.
  // eslint-disable-next-line no-console
  console.log(generateDependencyReport());

  if (!crypto.getCiphers().includes('aes-256-gcm')) {
    throw new Error('Required cipher missing: aes-256-gcm. Install a supported crypto backend (e.g. sodium) and retry.');
  }

  try {
    // Ensure DAVE protocol lib is resolvable as a direct dependency.
    await import('@snazzah/davey');
  } catch (err) {
    throw new Error(
      'Missing @snazzah/davey dependency. Install it (npm i @snazzah/davey) to ensure DAVE (E2EE) support.',
    );
  }

  // Fail fast if required binaries are missing.
  await checkCommand(opts.ytdlpBin, ['--version']);
  await checkCommand(opts.ffmpegBin, ['-version']);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  await preflight({ ytdlpBin: config.ytdlpBin, ffmpegBin: config.ffmpegBin });

  const client = createDiscordClient();
  const music = new MusicService({ client, config, logger });
  await music.init();

  registerMessageRouter({ client, config, music, logger });

  client.once('ready', () => {
    logger.info(`Logged in as ${client.user?.tag ?? '(unknown)'}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.warn(`Shutting down (${signal})...`);
    await music.stopAll();
    try {
      await client.destroy();
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await client.login(config.discordToken);
}

try {
  await main();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
}
