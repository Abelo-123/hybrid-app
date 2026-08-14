import {
    createContext, useContext, useState, useCallback,
    useEffect, useRef, useMemo, type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    UserProfile, Service, Order, Deposit, Alert,
    TabId, ToastMessage, SocialPlatform,
} from '../types';
import { TOAST_DURATION, DEFAULT_SETTINGS } from '../constants';
import {
    isTelegramEnv, hapticSelection,
    cloudSet, cloudGet,
    getInitDataUser, getInitDataString, getInitDataRaw,
} from '../helpers/telegram';
import * as api from '../api';
import Swal from 'sweetalert2';

// ─── State & Actions types ────────────────────────────────────
interface AppState {
    user: UserProfile | null;
    isTelegramApp: boolean;
    services: Service[];
    recommendedIds: number[];
    selectedPlatform: SocialPlatform | null;
    selectedCategory: string | null;
    selectedService: Service | null;
    orders: Order[];
    deposits: Deposit[];
    alerts: Alert[];
    rateMultiplier: number;
    discountPercent: number;
    holidayName: string;
    maintenanceMode: boolean;
    userCanOrder: boolean;
    marqueeText: string;
    botUsername: string;
    activeTab: TabId;
    toasts: ToastMessage[];
    isLoading: boolean;
    unreadAlerts: number;
}

interface AppActions {
    setUser: (user: UserProfile | null) => void;
    setActiveTab: (tab: TabId) => void;
    setSelectedPlatform: (p: SocialPlatform | null) => void;
    setSelectedCategory: (c: string | null) => void;
    setSelectedService: (s: Service | null) => void;
    setOrders: (orders: Order[] | ((old: Order[]) => Order[])) => void;
    setDeposits: (deposits: Deposit[]) => void;
    setAlerts: (alerts: Alert[]) => void;
    setBalance: (balance: number) => void;
    setIsLoading: (loading: boolean) => void;
    setUnreadAlerts: (count: number) => void;
    showToast: (type: ToastMessage['type'], message: string) => void;
    removeToast: (id: string) => void;
    refreshServices: () => Promise<void>;
    refreshOrders: () => Promise<void>;
    refreshDeposits: () => Promise<void>;
    refreshAlerts: () => Promise<void>;
}

type AppContextType = AppState & AppActions;

const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}

// ─── Provider ─────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
    const isTelegramApp = isTelegramEnv();
    const initDataLoggedRef = useRef(false);

    const [user, setUser] = useState<UserProfile | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [recommendedIds, setRecommendedIds] = useState<number[]>([]);
    const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [activeTab, setActiveTab] = useState<TabId>('order');
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [unreadAlerts, setUnreadAlerts] = useState(0);
    const [settings, _setSettings] = useState(DEFAULT_SETTINGS);

    const queryClient = useQueryClient();

    // ── React Query for orders (Primora pattern) ──────────────
    const { data: qOrders = [], refetch: refreshOrders } = useQuery<Order[]>({
        queryKey: ['orders'],
        queryFn: async () => {
            try { await api.checkOrderStatus(); } catch { /* non-fatal */ }
            const data = await api.getOrders();
            return data.orders || [];
        },
        staleTime: 30_000,
    });

    const setOrders = useCallback((newOrders: Order[] | ((old: Order[]) => Order[])) => {
        queryClient.setQueryData(['orders'], newOrders);
    }, [queryClient]);

    const orders = qOrders;

    // ── Service transform helper ──────────────────────────────
    const transformServices = (raw: any[]): Service[] =>
        raw.map((s: any) => ({
            id: s.service || s.id,
            category: s.category,
            name: s.name,
            type: s.type,
            rate: parseFloat(s.rate),
            original_rate: parseFloat(s.original_rate ?? s.rate),
            min: s.min,
            max: s.max,
            averageTime: s.average_time || s.averageTime || '',
            refill: s.refill,
            cancel: s.cancel,
            custom_description: s.custom_description,
        }));

    // ── Refresh helpers ───────────────────────────────────────
    const refreshServices = useCallback(async () => {
        try {
            const data = await api.getServices(false);
            setServices(transformServices(data));
        } catch (err) { console.error('services:', err); }
    }, []);

    const refreshDeposits = useCallback(async () => {
        try {
            const initData = await getInitDataString();
            const data = await api.getDeposits(initData);
            setDeposits(data);
        } catch { /* ignore */ }
    }, []);

    const refreshAlerts = useCallback(async () => {
        try {
            const initData = await getInitDataString();
            if (!initData) return;
            const data = await api.getAlerts();
            if (data) {
                setAlerts(data.alerts || []);
                setUnreadAlerts(data.unread_count ?? 0);
            }
        } catch { /* ignore */ }
    }, []);

    // ── Boot data load ────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);

            // Services
            try {
                const svc = await api.getServices(true);
                setServices(transformServices(svc));
            } catch { /* use cache fallback */ }

            // Settings
            try {
                const s = await api.getSettings();
                _setSettings({
                    rateMultiplier: s.rateMultiplier || 1,
                    discountPercent: s.discountPercent || 0,
                    holidayName: s.holidayName || '',
                    maintenanceMode: s.maintenanceMode || false,
                    userCanOrder: s.userCanOrder !== false,
                    marqueeText: s.marqueeText || 'Welcome to Hybrid SMM!',
                    topServicesIds: s.topServicesIds || '',
                    botUsername: s.botUsername || '',
                });
                if (s.topServicesIds) {
                    const ids = s.topServicesIds
                        .split(',')
                        .map((x: string) => parseInt(x.trim(), 10))
                        .filter((n: number) => !isNaN(n));
                    setRecommendedIds(ids);
                }
            } catch { /* use defaults */ }

            // User data
            try {
                const initData = await getInitDataString();
                if (initData) {
                    refreshDeposits();
                    refreshOrders();
                    api.getBalance(initData)
                        .then(r => { if (r.success) setBalance(r.balance); })
                        .catch(() => { });
                }
            } catch { /* ignore */ }

            setIsLoading(false);
        };
        load();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── User auth ─────────────────────────────────────────────
    useEffect(() => {
        const loadUser = async () => {
            try {
                const tgUser = getInitDataUser();
                if (!tgUser) return;
                const initData = await getInitDataString();

                if (initData && !initDataLoggedRef.current) {
                    api.logInitData(initData).catch(() => { });
                    initDataLoggedRef.current = true;
                }

                refreshAlerts();

                api.authenticateTelegram(initData).then(res => {
                    if (res.success && res.user) {
                        setUser({
                            ...res.user,
                            display_name: [res.user.first_name, res.user.last_name].filter(Boolean).join(' '),
                        });
                    }
                }).catch(() => {
                    setUser({
                        id: tgUser.id,
                        first_name: tgUser.first_name,
                        last_name: tgUser.last_name,
                        display_name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' '),
                        username: tgUser.username,
                        photo_url: tgUser.photo_url ?? '',
                        balance: 0,
                    });
                });
            } catch { /* ignore */ }
        };
        loadUser();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── SSE real-time stream (Primora) ────────────────────────
    const esRef = useRef<EventSource | null>(null);

    useEffect(() => {
        const initData = getInitDataRaw();
        if (!initData) return;

        let cancelled = false;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let reconnectDelay = 3000;
        const MAX_DELAY = 30000;

        function connect() {
            if (cancelled) return;
            esRef.current?.close();
            esRef.current = null;

            const url = `${api.NODE_API_URL}/orders/stream?initData=${encodeURIComponent(initData!)}`;
            const es = new EventSource(url);
            esRef.current = es;

            es.onopen = () => { reconnectDelay = 3000; };

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'RECONNECT') {
                        es.close();
                        esRef.current = null;
                        if (!cancelled) reconnectTimer = setTimeout(connect, 1000);
                        return;
                    }

                    if (data.type === 'ORDER_PLACED' && data.order) {
                        setOrders(prev => {
                            const exists = prev.some(o =>
                                String(o.id) === String(data.order.id) ||
                                String(o.api_order_id) === String(data.order.api_order_id)
                            );
                            if (exists) return prev.map(o =>
                                (String(o.id) === String(data.order.id) ||
                                    String(o.api_order_id) === String(data.order.api_order_id))
                                    ? data.order : o
                            );
                            return [data.order, ...prev];
                        });
                        if (data.new_balance !== undefined) setBalance(data.new_balance);
                    }

                    if (data.type === 'ORDER_UPDATED' && data.order) {
                        setOrders(prev => prev.map(o =>
                            (String(o.id) === String(data.order.id) ||
                                String(o.api_order_id) === String(data.order.api_order_id))
                                ? { ...o, status: data.order.status, start_count: data.order.start_count, remains: data.order.remains }
                                : o
                        ));

                        if (data.refunded) {
                            getInitDataString().then(s => {
                                if (s) api.getBalance(s).then(b => { if (b.success) setBalance(b.balance); }).catch(() => { });
                            });
                            Swal.fire({
                                title: 'Order Refunded',
                                text: 'A refund has been credited to your balance!',
                                icon: 'info',
                                confirmButtonColor: '#00f5d4',
                                background: '#0a0f1d',
                                color: '#ffffff',
                            });
                        }
                    }
                } catch { /* parse error */ }
            };

            es.onerror = () => {
                es.close();
                esRef.current = null;
                if (!cancelled) {
                    reconnectTimer = setTimeout(connect, reconnectDelay);
                    reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
                }
            };
        }

        connect();

        return () => {
            cancelled = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            esRef.current?.close();
            esRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Actions ───────────────────────────────────────────────
    const setBalance = useCallback((balance: number) => {
        setUser(prev => prev ? { ...prev, balance } : prev);
    }, []);

    const showToast = useCallback((type: ToastMessage['type'], message: string) => {
        const id = Date.now().toString() + Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TOAST_DURATION);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // ── Tab with haptic + cloud persist ──────────────────────
    const handleSetActiveTab = useCallback((tab: TabId) => {
        setActiveTab(tab);
        if (isTelegramApp) {
            hapticSelection();
            void cloudSet('last_tab', tab);
        }
    }, [isTelegramApp]);

    const handleSetSelectedPlatform = useCallback((p: SocialPlatform | null) => {
        setSelectedPlatform(p);
        if (p && isTelegramApp) hapticSelection();
    }, [isTelegramApp]);

    const handleSetSelectedService = useCallback((s: Service | null) => {
        setSelectedService(s);
        if (s && isTelegramApp) hapticSelection();
    }, [isTelegramApp]);

    // ── Restore last tab from cloud ───────────────────────────
    useEffect(() => {
        if (!isTelegramApp) return;
        (async () => {
            const val = await cloudGet('last_tab');
            if (val && ['order', 'history', 'deposit', 'more'].includes(val)) {
                setActiveTab(val as TabId);
            }
        })();
    }, [isTelegramApp]);

    // ── Memoized context value ────────────────────────────────
    const value = useMemo<AppContextType>(() => ({
        user, isTelegramApp, services, recommendedIds,
        selectedPlatform, selectedCategory, selectedService,
        orders, deposits, alerts,
        rateMultiplier: settings.rateMultiplier,
        discountPercent: settings.discountPercent,
        holidayName: settings.holidayName,
        maintenanceMode: settings.maintenanceMode,
        userCanOrder: settings.userCanOrder,
        marqueeText: settings.marqueeText,
        botUsername: settings.botUsername,
        activeTab, toasts, isLoading, unreadAlerts,
        setUser, setActiveTab: handleSetActiveTab,
        setSelectedPlatform: handleSetSelectedPlatform,
        setSelectedCategory,
        setSelectedService: handleSetSelectedService,
        setOrders, setDeposits, setAlerts, setBalance,
        setIsLoading, setUnreadAlerts,
        showToast, removeToast,
        refreshServices,
        refreshOrders: async () => { await refreshOrders(); },
        refreshDeposits, refreshAlerts,
    }), [
        user, isTelegramApp, services, recommendedIds,
        selectedPlatform, selectedCategory, selectedService,
        orders, deposits, alerts, settings,
        activeTab, toasts, isLoading, unreadAlerts,
        handleSetActiveTab, handleSetSelectedPlatform, handleSetSelectedService,
        setOrders, setBalance, showToast, removeToast,
        refreshServices, refreshOrders, refreshDeposits, refreshAlerts,
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
