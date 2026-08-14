import { mockTelegramEnv, emitEvent } from '@telegram-apps/sdk-react';

const mockTheme = {
    accent_text_color: '#00f5d4',
    bg_color: '#080d19',
    button_color: '#00f5d4',
    button_text_color: '#080d19',
    destructive_text_color: '#ff4757',
    header_bg_color: '#080d19',
    hint_color: '#8e9aaf',
    link_color: '#00f5d4',
    secondary_bg_color: '#0a0f1d',
    text_color: '#ffffff',
} as const;

const mockUser = {
    id: 123456789,
    first_name: 'Demo',
    last_name: 'User',
    username: 'demouser',
    language_code: 'en',
};

const mockInitData = new URLSearchParams([
    ['auth_date', (Date.now() / 1000 | 0).toString()],
    ['hash', 'mock-hash'],
    ['signature', 'mock-signature'],
    ['user', JSON.stringify(mockUser)],
]).toString();

mockTelegramEnv({
    onEvent(e) {
        if (e[0] === 'web_app_request_theme') {
            return emitEvent('theme_changed', { theme_params: mockTheme });
        }
    },
    launchParams: new URLSearchParams([
        ['tgWebAppThemeParams', JSON.stringify(mockTheme)],
        ['tgWebAppData', mockInitData],
        ['tgWebAppVersion', '8.4'],
        ['tgWebAppPlatform', 'tdesktop'],
    ]),
});
