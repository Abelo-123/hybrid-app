export const TOAST_DURATION = 3000;
export const CACHE_DURATION = 10_000; // 10 seconds
export const API_TIMEOUT = 15_000;    // 15 seconds

export const SOCIAL_PLATFORMS = [
    { id: 'top',       label: 'Top',       emoji: '⭐' },
    { id: 'telegram',  label: 'Telegram',  emoji: '✈️' },
    { id: 'instagram', label: 'Instagram', emoji: '📸' },
    { id: 'tiktok',    label: 'TikTok',    emoji: '🎵' },
    { id: 'youtube',   label: 'YouTube',   emoji: '▶️' },
    { id: 'facebook',  label: 'Facebook',  emoji: '👥' },
    { id: 'twitter',   label: 'Twitter',   emoji: '🐦' },
    { id: 'other',     label: 'Other',     emoji: '🌐' },
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
    pending:     'Pending',
    processing:  'Processing',
    in_progress: 'In Progress',
    completed:   'Completed',
    cancelled:   'Cancelled',
    partial:     'Partial',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
    pending:     'var(--color-warning)',
    processing:  'var(--color-info)',
    in_progress: 'var(--color-info)',
    completed:   'var(--color-success)',
    cancelled:   'var(--color-danger)',
    partial:     'var(--color-warning)',
};

export const DEFAULT_SETTINGS = {
    rateMultiplier: 1,
    discountPercent: 0,
    holidayName: '',
    maintenanceMode: false,
    userCanOrder: true,
    marqueeText: 'Welcome to Hybrid SMM!',
    topServicesIds: '',
    botUsername: '',
};
