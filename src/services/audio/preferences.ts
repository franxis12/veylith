const KEY = 'veylith.audio.v1';
export function readAudioPreferences(): { enabled: boolean; volume: number } {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (
      value &&
      typeof value === 'object' &&
      'enabled' in value &&
      'volume' in value &&
      typeof value.enabled === 'boolean' &&
      typeof value.volume === 'number' &&
      Number.isFinite(value.volume) &&
      value.volume >= 0 &&
      value.volume <= 1
    )
      return { enabled: value.enabled, volume: value.volume };
  } catch {
    /* Storage can be unavailable in a private WebView. */
  }
  return { enabled: true, volume: 0.65 };
}
export function saveAudioPreferences(enabled: boolean, volume: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ enabled, volume }));
  } catch {
    /* Keep the session preference. */
  }
}
