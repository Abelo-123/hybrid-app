import type { TelegramWebApp, TelegramUser } from '../telegram.d';

// ─── Safe Raw WebApp Accessor (0ms overhead) ────────────────
export const getTg = (): TelegramWebApp | null => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

// ─── Environment Detection ──────────────────────────────────
export function isTelegramEnv(): boolean {
  const tg = getTg();
  return !!(tg && tg.initData);
}

// ─── Init Data Accessors ────────────────────────────────────
export function getInitDataRaw(): string | null {
  const tg = getTg();
  if (tg?.initData) return tg.initData;
  return null;
}

export async function getInitDataString(): Promise<string> {
  return getInitDataRaw() ?? '';
}

export function getInitDataUser(): TelegramUser {
  const tg = getTg();
  if (tg?.initDataUnsafe?.user) {
    return tg.initDataUnsafe.user;
  }
  // Safe mock user for local browser dev
  return {
    id: 123456789,
    first_name: 'Demo',
    last_name: 'User (Web Mock)',
    username: 'demouser_mock',
    language_code: 'en',
    is_premium: true,
  };
}

export function getTelegramBotId(): string | null {
  try {
    const tg = getTg();
    if (!tg) return null;
    const data = tg.initDataUnsafe as any;
    if (data?.receiver?.id) return String(data.receiver.id);
    if (data?.via_bot?.id) return String(data.via_bot.id);
  } catch { /* ignore */ }
  return null;
}

// ─── Haptics (Direct Native Calls) ──────────────────────────
export function hapticSelection(): void {
  const tg = getTg();
  if (tg?.HapticFeedback) {
    try { tg.HapticFeedback.selectionChanged(); } catch { /* ignore */ }
  }
}

export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  const tg = getTg();
  if (tg?.HapticFeedback) {
    try { tg.HapticFeedback.impactOccurred(style); } catch { /* ignore */ }
  } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(30);
  }
}

export function hapticNotification(type: 'success' | 'error' | 'warning'): void {
  const tg = getTg();
  if (tg?.HapticFeedback) {
    try { tg.HapticFeedback.notificationOccurred(type); } catch { /* ignore */ }
  } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(type === 'error' ? [50, 30, 50] : 40);
  }
}

// ─── App Window Controls ────────────────────────────────────
export function expandApp(): void {
  const tg = getTg();
  if (tg) {
    try { tg.expand(); tg.ready(); } catch { /* ignore */ }
  }
}

export function setHeaderColor(color: string): void {
  const tg = getTg();
  if (tg) {
    try { tg.setHeaderColor(color); } catch { /* ignore */ }
  }
}

export function setBackgroundColor(color: string): void {
  const tg = getTg();
  if (tg) {
    try { tg.setBackgroundColor(color); } catch { /* ignore */ }
  }
}

export function openExternalLink(url: string): void {
  const tg = getTg();
  if (tg) {
    try { tg.openLink(url); } catch { window.open(url, '_blank'); }
  } else {
    window.open(url, '_blank');
  }
}

// ─── Cloud Storage (Raw WebApp.CloudStorage API) ────────────
export function cloudSet(key: string, value: string): Promise<void> {
  return new Promise((resolve) => {
    const tg = getTg();
    if (tg?.CloudStorage) {
      tg.CloudStorage.setItem(key, value, () => resolve());
    } else {
      try { localStorage.setItem(`tma_${key}`, value); } catch { /* ignore */ }
      resolve();
    }
  });
}

export function cloudGet(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    const tg = getTg();
    if (tg?.CloudStorage) {
      tg.CloudStorage.getItem(key, (_err, result) => resolve(result || null));
    } else {
      try {
        const val = localStorage.getItem(`tma_${key}`);
        resolve(val);
      } catch {
        resolve(null);
      }
    }
  });
}

// ─── Theme Detection ────────────────────────────────────────
export function isTelegramDark(): boolean {
  const tg = getTg();
  if (tg) return tg.colorScheme === 'dark';
  return true; // default dark
}
