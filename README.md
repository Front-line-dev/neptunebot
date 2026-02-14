# neptunebot (Discord YouTube Music Bot)

**Node.js 24**와 **TypeScript**로 작성된 디스코드 유튜브 음악 봇입니다. 
최신 디스코드 음성 보안 표준인 **DAVE (E2EE)**를 지원하며, 여러 서버에서 동시에 끊김 없이 음악을 재생할 수 있도록 설계되었습니다.

## ✨ 주요 기능

- **DAVE (E2EE) 지원**: 2026년 3월부터 필수화되는 디스코드의 종단간 암호화(End-to-End Encryption) 음성 프로토콜을 완벽하게 지원합니다.
- **다중 컨텍스트 지원**: 특정 서버의 특정 텍스트 채널에서만 명령어를 받도록 설정하여 봇 오남용을 방지할 수 있습니다.
- **동시 재생**: 여러 서버(Guild)에서 동시에 각각 다른 음악을 재생할 수 있습니다. (서버당 1개의 음성 채널)
- **스마트 캐싱**: 한 번 재생된 유튜브 영상은 `yt-dlp`와 `ffmpeg`를 통해 로컬에 캐시되어, 다음 재생 시 다운로드 없이 즉시 재생됩니다.

## 🛠 필수 요구 사항 (Prerequisites)

이 봇을 실행하기 위해서는 서버 또는 로컬 환경에 다음 프로그램들이 설치되어 있어야 합니다.

- **Node.js 24** 이상
- **ffmpeg** (오디오 변환용)
- **yt-dlp** (유튜브 오디오 다운로드용)

### Ubuntu 설치 예시
```bash
# 시스템 업데이트
sudo apt update

# ffmpeg 및 yt-dlp 설치
sudo apt install -y ffmpeg yt-dlp

# Node.js 버전 확인 (24 이상이어야 함)
node -v
```

## 🚀 설치 및 설정 (Setup)

### 1. 저장소 클론 및 패키지 설치
```bash
git clone https://github.com/kms/neptunebot.git
cd neptunebot
npm install
```

### 2. 디스코드 봇 생성 및 설정
1. [Discord Developer Portal](https://discord.com/developers/applications)에 접속하여 새 애플리케이션을 생성합니다.
2. **Bot** 탭으로 이동하여 봇을 생성합니다.
3. **Privileged Gateway Intents** 섹션에서 **Message Content Intent**를 반드시 활성화하세요. (메시지 내용을 읽어야 URL을 인식할 수 있습니다.)
4. **OAuth2** -> **URL Generator**에서 다음 권한을 선택하여 초대 링크를 생성하고 서버에 초대합니다.
   - `bot` 스코프 선택
   - 권한: `Send Messages`, `View Channels`, `Connect`, `Speak`

### 3. 환경 변수 설정 (`.env`)
`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 내용을 수정합니다.

```bash
cp .env.example .env
vi .env
```

**설정 항목 설명:**

- `DISCORD_TOKEN`: 디스코드 봇 토큰입니다. Developer Portal에서 확인 가능합니다.
- `ALLOWED_COMMAND_CONTEXTS`: 봇이 명령을 허용할 **서버 ID**와 **채널 ID**의 쌍입니다.
  - 형식: `서버ID:채널ID,서버ID:채널ID`
  - 봇이 아무 채널에서나 반응하지 않도록, 음악 신청을 받을 특정 채널을 지정해야 합니다.
  - **ID 확인 방법**: 디스코드 설정 -> 고급 -> **개발자 모드** 켜기 -> 서버 이름 우클릭 '서버 ID 복사' / 채널 이름 우클릭 '채널 ID 복사'
- `CACHE_DIR`: 다운로드한 음악 파일이 저장될 경로 (기본값: `./cache`)
- `YTDLP_BIN`: `yt-dlp` 실행 파일 경로 (환경변수 PATH에 있다면 `yt-dlp` 그대로 둠)
- `FFMPEG_BIN`: `ffmpeg` 실행 파일 경로 (환경변수 PATH에 있다면 `ffmpeg` 그대로 둠)
- `IDLE_DISCONNECT_SEC`: 대기열이 비었을 때 봇이 음성 채널을 나갈 때까지의 대기 시간(초)

**예시 `.env`:**
```env
DISCORD_TOKEN=MTE... (토큰값)
# 예: 서버ID 1234, 채널ID 5678인 곳에서만 명령어 허용
ALLOWED_COMMAND_CONTEXTS=123456789012345678:987654321098765432
CACHE_DIR=./cache
YTDLP_BIN=yt-dlp
FFMPEG_BIN=ffmpeg
IDLE_DISCONNECT_SEC=60
LOG_LEVEL=info
```

## ▶️ 실행 방법 (Running)

### 개발 모드 (로컬 테스트)
코드가 변경되면 자동으로 재시작됩니다.
```bash
npm run dev
```

### 프로덕션 실행
```bash
# TypeScript 타입 체크 (선택 사항)
npm run typecheck

# 실행
npm run start
```

### 서버 데몬으로 실행 (Linux Systemd)
서버 재부팅 시에도 자동으로 실행되도록 설정하는 방법입니다.

1. 서비스 파일 생성: `/etc/systemd/system/neptunebot.service`
```ini
[Unit]
Description=neptunebot (Discord music bot)
After=network-online.target

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

2. 서비스 활성화 및 시작
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now neptunebot
```

## 🎵 사용 방법 (Usage)

1. 봇이 있는 서버의 **허용된 텍스트 채널** (`ALLOWED_COMMAND_CONTEXTS`에 등록된 채널)로 이동합니다.
2. 사용자가 먼저 **음성 채널**에 입장합니다.
3. 텍스트 채널에 **유튜브 영상 주소(URL)**를 입력합니다. (별도 명령어 없이 URL만 입력하면 됩니다.)
4. 봇이 자동으로 음성 채널에 들어와 음악을 재생합니다.

### 명령어 목록
명령어는 한글과 영어를 모두 지원합니다.

| 기능 | 명령어 (한글) | 명령어 (영어) | 설명 |
|---|---|---|---|
| **재생 정지** | `정지` | `stop`, `!stop` | 재생을 멈추고 대기열을 비운 후, 봇이 퇴장합니다. |
| **다음 곡** | `다음` | `skip`, `!skip`, `next` | 현재 곡을 넘기고 다음 곡을 재생합니다. |

## ❓ 문제 해결 (Troubleshooting)

- **`Missing @snazzah/davey` 오류 발생 시:**
  - `npm install`을 다시 실행하여 의존성을 확인하세요. DAVE 암호화를 위해 필수적인 라이브러리입니다.
- **`Required cipher missing: aes-256-gcm` 오류 발생 시:**
  - 실행 환경의 Node.js 암호화 백엔드가 AES-256-GCM을 지원하지 않는 경우입니다.
- **음악이 재생되지 않고 바로 끊기는 경우:**
  - `yt-dlp` 버전이 최신인지 확인하세요. 유튜브의 다운로드 방식 변경으로 인해 구버전에서는 작동하지 않을 수 있습니다. (`sudo yt-dlp -U`)

---
**주의:** 본 봇을 사용하여 유튜브 음원을 재생/다운로드하는 행위에 대한 책임은 사용자 본인에게 있습니다. 유튜브 이용 약관 및 저작권법을 준수하여 사용하시기 바랍니다.
