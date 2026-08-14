import type {
    Service, Deposit,
    AuthResponse, OrderResponse, OrdersListResponse,
    DepositResponse, AlertsResponse, StatusSyncResponse,
    CustomField, AppSettings,
} from './types';
import { getInitDataRaw, getTelegramBotId } from './helpers/telegram';
import { API_TIMEOUT, CACHE_DURATION } from './constants';

export const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || 'https://abiyback.onrender.com';

const isDev = import.meta.env.DEV;
function debug(...args: any[]) { if (isDev) console.log('[API]', ...args); }
function debugError(...args: any[]) { if (isDev) console.error('[API]', ...args); }

// ─── Core fetch with abort, timeout, auto-inject initData ─────
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    let url = `${NODE_API_URL}${endpoint}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> || {}),
    };

    const initData = getInitDataRaw() || '';
    const botId = getTelegramBotId() || '';
    let body = options?.body;

    if (options?.method === 'POST' || options?.method === 'PUT') {
        if (typeof body === 'string') {
            try {
                const parsed = JSON.parse(body);
                if (!parsed.initData) parsed.initData = initData;
                if (botId && !parsed.bot_id) parsed.bot_id = botId;
                body = JSON.stringify(parsed);
            } catch { /* ignore */ }
        } else if (!body) {
            body = JSON.stringify({ initData, ...(botId ? { bot_id: botId } : {}) });
        }
    } else {
        const sep = url.includes('?') ? '&' : '?';
        url += `${sep}initData=${encodeURIComponent(initData)}`;
        if (botId) url += `&bot_id=${encodeURIComponent(botId)}`;
    }

    debug('Fetching:', url);

    let controller: AbortController | undefined;
    if (typeof AbortController !== 'undefined') controller = new AbortController();
    const timeoutId = setTimeout(() => controller?.abort(), API_TIMEOUT);

    try {
        const res = await fetch(url, { ...options, headers, body, signal: controller?.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errorText = await res.text();
            debugError('Error:', res.status, errorText);
            throw new Error(errorText || `HTTP ${res.status}`);
        }
        const data = await res.json();
        debug('Success:', endpoint);
        return data;
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error('Request timeout — check your connection');
        throw err;
    }
}

// ─── Cache helpers ────────────────────────────────────────────
function cacheGet<T>(key: string, tsKey: string, duration = CACHE_DURATION): T | null {
    try {
        const cached = localStorage.getItem(key);
        const ts = localStorage.getItem(tsKey);
        if (cached && ts && Date.now() - parseInt(ts) < duration) {
            return JSON.parse(cached);
        }
    } catch { /* ignore */ }
    return null;
}

function cacheSet(key: string, tsKey: string, data: any): void {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        localStorage.setItem(tsKey, Date.now().toString());
    } catch { /* ignore */ }
}

// ─── Auth ─────────────────────────────────────────────────────
export async function authenticateTelegram(initData: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/app/auth', {
        method: 'POST',
        body: JSON.stringify({ initData }),
    });
}

// ─── Services ─────────────────────────────────────────────────
const SERVICES_KEY = 'hybrid_services';
const SERVICES_TS  = 'hybrid_services_ts';

export async function getServices(useCache = true): Promise<Service[]> {
    if (useCache) {
        const cached = cacheGet<Service[]>(SERVICES_KEY, SERVICES_TS);
        if (cached) return cached;
    }
    try {
        const data = await apiFetch<any>('/services');
        const valid = Array.isArray(data) ? data : [];
        if (valid.length > 0) cacheSet(SERVICES_KEY, SERVICES_TS, valid);
        return valid;
    } catch {
        return cacheGet<Service[]>(SERVICES_KEY, SERVICES_TS, Infinity) ?? [];
    }
}

export async function getCategories(platform?: string): Promise<string[]> {
    const q = platform ? `?platform=${encodeURIComponent(platform)}` : '';
    const data = await apiFetch<{ categories: string[] }>(`/categories${q}`);
    return data.categories || [];
}

// ─── Orders ───────────────────────────────────────────────────
export interface PlaceOrderPayload {
    service: number;
    link: string;
    quantity: number;
    tg_id?: number;
    comments?: string;
    answer_number?: number;
    custom_fields?: CustomField[];
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<OrderResponse> {
    return apiFetch<OrderResponse>('/orders/place', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function getOrders(): Promise<OrdersListResponse> {
    return apiFetch<OrdersListResponse>('/orders/list', { method: 'POST' });
}

export async function checkOrderStatus(): Promise<StatusSyncResponse> {
    return apiFetch<StatusSyncResponse>('/orders/status', { method: 'POST' });
}

export async function requestRefill(orderId: number): Promise<{ success: boolean; message: string }> {
    return apiFetch('/orders/refill', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId }),
    });
}

// ─── Balance & Deposits ───────────────────────────────────────
export async function getBalance(initData: string): Promise<{ success: boolean; balance: number }> {
    return apiFetch('/balance', { method: 'POST', body: JSON.stringify({ initData }) });
}

export async function processDeposit(amount: number, referenceId: string): Promise<DepositResponse> {
    return apiFetch<DepositResponse>('/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount, tx_ref: referenceId }),
    });
}

export async function getDeposits(initData: string): Promise<Deposit[]> {
    return apiFetch<Deposit[]>('/deposits', { method: 'POST', body: JSON.stringify({ initData }) });
}

// ─── Alerts ───────────────────────────────────────────────────
export async function getAlerts(): Promise<AlertsResponse> {
    return apiFetch<AlertsResponse>('/app/alerts', { method: 'POST' });
}

export async function markAlertsRead(): Promise<{ success: boolean }> {
    return apiFetch('/app/alerts/mark-read', { method: 'POST' });
}

// ─── Settings ─────────────────────────────────────────────────
const SETTINGS_KEY = 'hybrid_settings';
const SETTINGS_TS  = 'hybrid_settings_ts';

export async function getSettings(): Promise<AppSettings> {
    try {
        const data = await apiFetch<AppSettings>('/app/settings');
        cacheSet(SETTINGS_KEY, SETTINGS_TS, data);
        return data;
    } catch {
        return cacheGet<AppSettings>(SETTINGS_KEY, SETTINGS_TS, Infinity) ?? {
            rateMultiplier: 1, discountPercent: 0, holidayName: '',
            maintenanceMode: false, userCanOrder: true,
            marqueeText: 'Welcome to Hybrid SMM!', topServicesIds: '', botUsername: '',
        };
    }
}

// ─── Referral ─────────────────────────────────────────────────
export async function fetchReferralStats(): Promise<{
    success: boolean; totalEarned: number;
    referredList: { tg_id: string; name: string; deposit_count: number; commission_earned: number }[];
}> {
    return apiFetch('/referral/stats', { method: 'POST' });
}

export async function applyReferralCode(referralCode: string): Promise<{
    success: boolean; message?: string; error?: string; newBalance?: number;
}> {
    return apiFetch('/referral/apply', { method: 'POST', body: JSON.stringify({ referralCode }) });
}

// ─── Withdrawal ───────────────────────────────────────────────
export async function fetchWithdrawalHistory(): Promise<{
    success: boolean; history: any[]; referral_balance: number;
}> {
    return apiFetch('/withdraw/history', { method: 'GET' });
}

export async function requestWithdrawal(payload: {
    amount: number; full_name: string; bank_name: string; account_number: string;
}): Promise<{ success: boolean; new_referral_balance?: number; error?: string }> {
    return apiFetch('/withdraw/request', { method: 'POST', body: JSON.stringify(payload) });
}

// ─── Misc ─────────────────────────────────────────────────────
export async function heartbeat(): Promise<{ ok: number }> {
    return apiFetch('/app/heartbeat');
}

export async function logInitData(initData: string): Promise<{ success: boolean }> {
    return apiFetch('/app/log-init-data', { method: 'POST', body: JSON.stringify({ initData }) });
}
