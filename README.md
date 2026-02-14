# neptunebot (Discord YouTube Music Bot)

> Codex, Antigravity를 사용하여 자동 제작된 디스코드 봇입니다.

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
# 시스템 업데이트 및 ffmpeg 설치
sudo apt update
sudo apt install -y ffmpeg

# yt-dlp 최신 버전 설치
sudo wget -O /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### Node.js (nvm 등) 설치
이 봇은 **Node.js 24** 버전 이상을 권장합니다. `nvm`(Node Version Manager)을 사용하면 간편하게 설치하고 관리할 수 있습니다.

1. **nvm 설치**:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# 설치 후 터미널을 껐다 켜거나 아래 명령어를 입력하세요.
source ~/.bashrc
```

2. **Node.js 24 설치**:
```bash
nvm install 24
nvm use 24
node -v # v24.x.x 확인
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

### Crontab으로 자동 실행 및 유지 (Auto-restart)
서버가 재부팅되거나 봇이 예기치 않게 종료되었을 때, 자동으로 봇을 다시 실행하기 위해 `crontab`과 쉘 스크립트를 사용합니다.

#### 1. 실행 스크립트 작성 (`neptunebot.sh`)
프로젝트 루트 디렉토리에 `neptunebot.sh` 파일을 생성합니다.

```bash
#!/bin/bash

# 1. nvm 또는 Node.js 환경 변수 로드
# nvm을 사용하는 경우 아래 경로를 자신의 환경에 맞게 추가하세요.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 2. 봇이 위치한 디렉토리로 이동
# 자신의 환경에 맞게 경로를 수정하세요.
APP_DIR="/home/ubuntu/neptunebot"
cd "$APP_DIR" || exit

# 3. 프로세스가 실행 중인지 확인 ("node src/index.ts" 프로세스 감지)
if ! pgrep -f "node src/index.ts" > /dev/null; then
    echo "[$(date)] Bot is dead. Restarting..." >> bot_monitor.log
    
    # 로그를 남기며 백그라운드 실행
    nohup npm run start > bot_output.log 2>&1 &
fi
```

#### 2. 실행 권한 부여
스크립트 파일에 실행 권한을 부여합니다.
```bash
chmod +x neptunebot.sh
```

#### 3. Crontab 등록
1분마다 위 스크립트를 실행하도록 설정하여, 봇이 죽으면 1분 내에 되살아나도록 합니다.

**Crontab 편집 모드 진입:**
```bash
crontab -e
```

**파일 맨 아래에 다음 줄을 추가합니다:**
(반드시 `neptunebot.sh` 파일의 절대 경로를 적어야 합니다.)

```cron
# 1분마다 봇 상태 체크 및 재시작
* * * * * /home/ubuntu/neptunebot/neptunebot.sh
```

저장하고 나옵니다.
- `nano` 에디터인 경우: `Ctrl+O` -> `Enter` -> `Ctrl+X`
- `vim` 에디터인 경우: `:wq` -> `Enter`

#### 4. 로그 확인 및 봇 종료 방법

**봇 출력 로그 (실시간 확인):**
```bash
tail -f bot_output.log
```

**재시작 기록 확인:**
```bash
cat bot_monitor.log
```

**봇 완전히 종료하기 (Stop):**
단순히 프로세스만 죽이면 crontab이 1분 뒤에 다시 살려내므로, crontab을 비활성화한 후 종료해야 합니다.

1.  **Crontab 주석 처리**:
    ```bash
    crontab -e
    # 해당 라인 앞에 #을 붙여 주석 처리 후 저장
    # * * * * * /home/ubuntu/neptunebot/neptunebot.sh
    ```

2.  **프로세스 종료**:
    ```bash
    pkill -f "node src/index.ts"
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
