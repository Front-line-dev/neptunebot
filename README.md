# neptunebot (Discord YouTube Music Bot)

Discord YouTube music bot for **Node.js 24** using **TypeScript (.ts executed directly)**, with:
- **DAVE (E2EE) voice encryption enabled**
- **Multiple allowed (server + text channel) command contexts**
- **Concurrent playback across multiple guilds** (one voice session per guild)
- **YouTube download + disk cache** using `yt-dlp` + `ffmpeg`

## Important: DAVE (E2EE) requirement
Discord has announced that from **2026-03-01**, clients/apps/bots that do not support **DAVE (E2EE)** may be blocked from joining voice calls.
This bot uses `@discordjs/voice` and explicitly enables `daveEncryption: true` when connecting.

## Features
- Send a YouTube URL in an allowed text channel:
  - The bot joins the voice channel where the requester is currently connected.
  - If nothing is playing, it starts immediately.
  - If something is playing, it is queued and plays after the current track finishes.
- Commands (message-based):
  - `정지` / `stop` / `!stop`: stop playback, clear queue, disconnect.
  - `다음` / `skip` / `next` / `!skip`: skip current track.
- Cache:
  - Downloads are stored under `CACHE_DIR` as `${videoId}.opus`.
  - Already downloaded tracks are reused.

## Limitations
- Discord bots can only maintain **one voice connection per guild**. You can control the same guild session from multiple text channels, but you cannot play in multiple voice channels within the same guild at the same time.
- If the bot is already playing in a different voice channel in the same guild, it will reject new play requests from other voice channels.
- Playlists are not supported (we use `--no-playlist`).

## Prerequisites (Ubuntu)
- Node.js **24**
- `ffmpeg`
- `yt-dlp`

Example:
```bash
sudo apt update
sudo apt install -y ffmpeg yt-dlp
node -v
```

## Discord Developer Portal setup
1. Create an application and add a Bot.
2. Enable **Message Content Intent** (required because this bot reads message text).
3. Invite the bot to your server with permissions:
   - View Channel, Send Messages
   - Connect, Speak

## Configure `.env`
Copy `.env.example` to `.env` and fill values.

### Getting IDs (Guild/Channel)
- In Discord: User Settings -> Advanced -> enable **Developer Mode**
- Right click server/channel -> **Copy ID**

Example:
```env
DISCORD_TOKEN=YOUR_TOKEN_HERE
ALLOWED_COMMAND_CONTEXTS=111111111111111111:222222222222222222,333333333333333333:444444444444444444

CACHE_DIR=./cache
YTDLP_BIN=yt-dlp
FFMPEG_BIN=ffmpeg
IDLE_DISCONNECT_SEC=60
LOG_LEVEL=info
```

## Install & Run (local)
```bash
npm install
npm run typecheck
npm run start
```

Development mode:
```bash
npm run dev
```

## Run 24/7 on Ubuntu with systemd
Create `/etc/systemd/system/neptunebot.service`:
```ini
[Unit]
Description=neptunebot (Discord music bot)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/neptunebot
EnvironmentFile=/opt/neptunebot/.env
ExecStart=/usr/bin/node /opt/neptunebot/src/index.ts
Restart=always
RestartSec=3
User=ubuntu

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now neptunebot
sudo systemctl status neptunebot
sudo journalctl -u neptunebot -f
```

## Notes
- You are responsible for complying with YouTube/Discord terms and applicable laws.

## Troubleshooting
- If the bot exits with `Missing @snazzah/davey`, ensure dependencies are installed (`npm install`) and the package is present in `node_modules`.
- If the bot exits with `Required cipher missing: aes-256-gcm`, your environment crypto backend is missing required ciphers. Install a supported backend (for example `libsodium`) and retry.
