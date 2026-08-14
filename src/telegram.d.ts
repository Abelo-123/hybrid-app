/**
 * Official Telegram WebApp API TypeScript Definitions
 * Based on Telegram Bot API specification for WebApps
 */

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title: string;
    username?: string;
    photo_url?: string;
  };
  chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
  signature?: string;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

export interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): TelegramHapticFeedback;
  notificationOccurred(type: 'error' | 'success' | 'warning'): TelegramHapticFeedback;
  selectionChanged(): TelegramHapticFeedback;
}

export interface TelegramBackButton {
  isVisible: boolean;
  show(): TelegramBackButton;
  hide(): TelegramBackButton;
  onClick(callback: () => void): TelegramBackButton;
  offClick(callback: () => void): TelegramBackButton;
}

export interface TelegramMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText(text: string): TelegramMainButton;
  onClick(callback: () => void): TelegramMainButton;
  offClick(callback: () => void): TelegramMainButton;
  show(): TelegramMainButton;
  hide(): TelegramMainButton;
  enable(): TelegramMainButton;
  disable(): TelegramMainButton;
  showProgress(leaveActive?: boolean): TelegramMainButton;
  hideProgress(): TelegramMainButton;
  setParams(params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }): TelegramMainButton;
}

export interface TelegramCloudStorage {
  setItem(key: string, value: string, callback?: (error: Error | null, result?: boolean) => void): TelegramCloudStorage;
  getItem(key: string, callback: (error: Error | null, result?: string) => void): TelegramCloudStorage;
  getItems(keys: string[], callback: (error: Error | null, result?: Record<string, string>) => void): TelegramCloudStorage;
  removeItem(key: string, callback?: (error: Error | null, result?: boolean) => void): TelegramCloudStorage;
  removeItems(keys: string[], callback?: (error: Error | null, result?: boolean) => void): TelegramCloudStorage;
  getKeys(callback: (error: Error | null, result?: string[]) => void): TelegramCloudStorage;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramWebAppInitData;
  version: string;
  platform: 'android' | 'android_x' | 'ios' | 'macos' | 'tdesktop' | 'web' | 'weba' | 'unigram' | 'unknown';
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  isClosingConfirmationEnabled: boolean;
  headerColor: string;
  backgroundColor: string;

  BackButton: TelegramBackButton;
  MainButton: TelegramMainButton;
  HapticFeedback: TelegramHapticFeedback;
  CloudStorage: TelegramCloudStorage;

  ready(): void;
  expand(): void;
  close(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  onEvent(eventType: string, eventHandler: (...args: any[]) => void): void;
  offEvent(eventType: string, eventHandler: (...args: any[]) => void): void;
  sendData(data: string): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
  openInvoice(url: string, callback?: (status: string) => void): void;
  showPopup(params: { title?: string; message: string; buttons?: { id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'; text?: string }[] }, callback?: (buttonId: string) => void): void;
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
  requestWriteAccess(callback?: (granted: boolean) => void): void;
  requestContact(callback?: (granted: boolean) => void): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}
