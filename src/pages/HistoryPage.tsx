import { memo, useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { hapticImpact, hapticNotification } from '../helpers/telegram';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../constants';
import type { OrderStatus } from '../types';
import * as api from '../api';

const STATUS_FILTERS = ['all', 'pending', 'processing', 'completed', 'cancelled', 'partial'] as const;

export const HistoryPage = memo(function HistoryPage() {
    const { orders, refreshOrders, showToast } = useApp();
    const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>('all');
    const [search, setSearch] = useState('');
    const [refilling, setRefilling] = useState<number | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Pulse history tab indicator on new order
    useEffect(() => {
        const handler = () => localStorage.setItem('pulseHistoryTab', 'true');
        window.addEventListener('pulseHistoryTab', handler);
        return () => window.removeEventListener('pulseHistoryTab', handler);
    }, []);

    const filtered = useMemo(() => {
        let list = orders;
        if (filter !== 'all') list = list.filter(o => o.status === filter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(o =>
                o.service_name?.toLowerCase().includes(q) ||
                String(o.id).includes(q) ||
                String(o.api_order_id).includes(q) ||
                o.link?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [orders, filter, search]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        hapticImpact('light');
        try {
            await refreshOrders();
            showToast('success', 'Orders refreshed');
        } catch {
            showToast('error', 'Failed to refresh');
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshOrders, showToast]);

    const handleRefill = useCallback(async (orderId: number) => {
        setRefilling(orderId);
        try {
            const res = await api.requestRefill(orderId);
            if (res.success) {
                hapticNotification('success');
                showToast('success', res.message || 'Refill requested!');
            } else {
                throw new Error(res.message);
            }
        } catch (err: any) {
            hapticNotification('error');
            showToast('error', err.message || 'Refill failed');
        } finally {
            setRefilling(null);
        }
    }, [showToast]);

    return (
        <div className="page" id="history-page">
            {/* Toolbar */}
            <div className="history-toolbar">
                <input
                    className="search-bar"
                    type="search"
                    placeholder="Search orders..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    aria-label="Search orders"
                />
                <button
                    className="icon-action-btn"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    aria-label="Refresh orders"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isRefreshing ? 'spin' : ''} aria-hidden="true">
                        <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                </button>
            </div>

            {/* Status filter pills */}
            <div className="filter-row" role="tablist" aria-label="Filter by status">
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f}
                        role="tab"
                        aria-selected={filter === f}
                        className={`filter-pill${filter === f ? ' filter-pill--active' : ''}`}
                        onClick={() => { setFilter(f); hapticImpact('light'); }}
                    >
                        {f === 'all' ? 'All' : ORDER_STATUS_LABELS[f] ?? f}
                        {f !== 'all' && (
                            <span className="filter-pill__count">
                                {orders.filter(o => o.status === f).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Orders list */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-state__icon" aria-hidden="true">📋</span>
                    <h3 className="empty-state__title">
                        {search ? 'No results found' : 'No orders yet'}
                    </h3>
                    <p className="empty-state__text">
                        {search ? `Nothing matched "${search}"` : 'Your order history will appear here'}
                    </p>
                </div>
            ) : (
                <div className="order-list">
                    {filtered.map(order => (
                        <div key={order.id} className="order-card">
                            <div className="order-card__header">
                                <div>
                                    <span className="order-card__id">#{order.api_order_id || order.id}</span>
                                    <span
                                        className="order-card__status"
                                        style={{ color: ORDER_STATUS_COLORS[order.status] ?? 'inherit' }}
                                    >
                                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                                    </span>
                                </div>
                                <span className="order-card__charge">{Number(order.charge).toFixed(2)} ETB</span>
                            </div>

                            <p className="order-card__name">{order.service_name}</p>

                            <div className="order-card__meta">
                                <span>Qty: {order.quantity.toLocaleString()}</span>
                                {order.remains > 0 && <span>Remains: {order.remains.toLocaleString()}</span>}
                                {order.start_count > 0 && <span>Start: {order.start_count.toLocaleString()}</span>}
                                <time>{new Date(order.created_at).toLocaleDateString()}</time>
                            </div>

                            {order.link && (
                                <p className="order-card__link" title={order.link}>
                                    🔗 {order.link}
                                </p>
                            )}

                            {/* Progress bar */}
                            {order.status === 'in_progress' && order.quantity > 0 && (
                                <div className="order-progress" role="progressbar"
                                    aria-valuenow={order.quantity - order.remains}
                                    aria-valuemin={0}
                                    aria-valuemax={order.quantity}>
                                    <div
                                        className="order-progress__bar"
                                        style={{ width: `${Math.min(100, ((order.quantity - order.remains) / order.quantity) * 100)}%` }}
                                    />
                                </div>
                            )}

                            {/* Refill */}
                            {order.status === 'completed' && (
                                <button
                                    className="order-card__refill"
                                    onClick={() => handleRefill(order.id)}
                                    disabled={refilling === order.id}
                                >
                                    {refilling === order.id ? 'Requesting...' : '🔄 Request Refill'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
