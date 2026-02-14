import { describe, expect, it } from 'vitest';

import { extractUrls, isSkipCommand, isStopCommand, isYouTubeUrl } from '../src/discord/parse.ts';

describe('extractUrls', () => {
  it('extracts http/https URLs in order', () => {
    const urls = extractUrls('a https://youtu.be/SkcRUbqhCko b https://example.com');
    expect(urls).toEqual(['https://youtu.be/SkcRUbqhCko', 'https://example.com']);
  });

  it('strips discord <> wrapping', () => {
    const urls = extractUrls('<https://youtu.be/SkcRUbqhCko>');
    expect(urls).toEqual(['https://youtu.be/SkcRUbqhCko']);
  });
});

describe('isYouTubeUrl', () => {
  it('accepts youtu.be', () => {
    expect(isYouTubeUrl('https://youtu.be/SkcRUbqhCko')).toBe(true);
  });

  it('accepts youtube.com subdomains', () => {
    expect(isYouTubeUrl('https://music.youtube.com/watch?v=SkcRUbqhCko')).toBe(true);
  });

  it('rejects non-youtube', () => {
    expect(isYouTubeUrl('https://example.com/watch?v=123')).toBe(false);
  });
});

describe('commands', () => {
  it('stop', () => {
    expect(isStopCommand('정지')).toBe(true);
    expect(isStopCommand('stop')).toBe(true);
    expect(isStopCommand('!stop')).toBe(true);
  });

  it('skip', () => {
    expect(isSkipCommand('다음')).toBe(true);
    expect(isSkipCommand('skip')).toBe(true);
    expect(isSkipCommand('next')).toBe(true);
    expect(isSkipCommand('!skip')).toBe(true);
  });
});

