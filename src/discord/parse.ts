const URL_REGEX = /https?:\/\/[^\s<>]+/gi;

function cleanUrlToken(token: string): string {
  let t = token.trim();

  // Discord sometimes wraps links as <https://...>
  if (t.startsWith('<')) t = t.slice(1);
  if (t.endsWith('>')) t = t.slice(0, -1);

  // Strip common trailing punctuation.
  t = t.replace(/[),.!?\]}]+$/g, '');
  return t;
}

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  const urls = matches.map(cleanUrlToken).filter(Boolean);

  // Preserve order, remove exact duplicates
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export function isYouTubeUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  if (host === 'youtu.be') return true;
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) return true;
  return false;
}

export function isStopCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === '정지' || t === 'stop' || t === '!stop';
}

export function isSkipCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === '다음' || t === 'skip' || t === 'next' || t === '!skip';
}

