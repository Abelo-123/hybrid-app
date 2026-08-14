import { memo, useState, useCallback, useMemo, useDeferredValue } from 'react';
import { useApp } from '../context/AppContext';
import { hapticNotification, hapticImpact, openExternalLink } from '../helpers/telegram';
import type { Service, SocialPlatform, CustomField } from '../types';
import { SOCIAL_PLATFORMS } from '../constants';
import * as api from '../api';

const PLATFORM_ICONS: Record<string, string> = {
    top: '⭐', telegram: '✈️', instagram: '📸', tiktok: '🎵',
    youtube: '▶️', facebook: '👥', twitter: '🐦', other: '🌐',
};

// ─── OrderPage ────────────────────────────────────────────────
export const OrderPage = memo(function OrderPage() {
    const {
        services, recommendedIds, selectedPlatform, selectedCategory,
        selectedService, setSelectedPlatform, setSelectedCategory,
        setSelectedService, user, userCanOrder, rateMultiplier,
        discountPercent, holidayName, marqueeText,
        showToast, setBalance, setOrders,
    } = useApp();

    const [link, setLink] = useState('');
    const [quantity, setQuantity] = useState('1000');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customComment, setCustomComment] = useState('');

    // Deferred price calc (CC's pattern) — input never feels janky
    const deferredQty = useDeferredValue(quantity);
    const isStale = deferredQty !== quantity;

    // Derive categories from selected platform
    const categories = useMemo(() => {
        if (!selectedPlatform) return [];
        const filtered = services.filter(s =>
            selectedPlatform === 'top'
                ? recommendedIds.includes(s.id)
                : s.platform_id === selectedPlatform
        );
        return [...new Set(filtered.map(s => s.category))].sort();
    }, [services, selectedPlatform, recommendedIds]);

    // Derive services for selected category
    const categoryServices = useMemo(() => {
        if (!selectedCategory) return [];
        return services.filter(s => s.category === selectedCategory);
    }, [services, selectedCategory]);

    const totalPrice = useMemo(() => {
        const svc = selectedService;
        const qty = parseInt(deferredQty) || 0;
        if (!svc || qty === 0) return 0;
        let price = (svc.rate / 1000) * qty;
        if (discountPercent > 0) price = price * (1 - discountPercent / 100);
        return price;
    }, [selectedService, deferredQty, discountPercent]);

    const handlePlatformClick = useCallback((p: SocialPlatform) => {
        setSelectedPlatform(p === selectedPlatform ? null : p);
        setSelectedCategory(null);
        setSelectedService(null);
        hapticImpact('light');
    }, [selectedPlatform, setSelectedPlatform, setSelectedCategory, setSelectedService]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedService || !user) return;

        const qty = parseInt(quantity);
        if (!qty || qty < selectedService.min) {
            hapticNotification('error');
            showToast('error', `Minimum quantity is ${selectedService.min.toLocaleString()}`);
            return;
        }
        if (qty > selectedService.max) {
            hapticNotification('error');
            showToast('error', `Maximum quantity is ${selectedService.max.toLocaleString()}`);
            return;
        }
        if (!link.trim()) {
            hapticNotification('error');
            showToast('error', 'Please enter a target link');
            return;
        }
        if ((user.balance ?? 0) < totalPrice) {
            hapticNotification('error');
            showToast('error', 'Insufficient balance — please deposit funds');
            return;
        }

        setIsSubmitting(true);
        try {
            const customFields: CustomField[] = [];
            if (customComment.trim() && selectedService.type.includes('Comment')) {
                customFields.push({ type: 'comment', value: customComment });
            }

            const res = await api.placeOrder({
                service: selectedService.id,
                link: link.trim(),
                quantity: qty,
                tg_id: user.id,
                ...(customFields.length > 0 ? { custom_fields: customFields } : {}),
            });

            if (res.success) {
                hapticNotification('success');
                showToast('success', `Order #${res.order_id} placed! Balance: ${res.new_balance.toFixed(2)} ETB`);
                setBalance(res.new_balance);
                setLink('');
                setQuantity('1000');
                setCustomComment('');
                window.dispatchEvent(new Event('pulseHistoryTab'));
            } else {
                throw new Error(res.error || 'Order failed');
            }
        } catch (err: any) {
            hapticNotification('error');
            showToast('error', err.message || 'Failed to place order');
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedService, user, quantity, link, totalPrice, customComment, showToast, setBalance]);

    const effectiveRate = selectedService
        ? (selectedService.rate * rateMultiplier).toFixed(2)
        : null;

    return (
        <div className="page" id="order-page">
            {marqueeText && (
                <div className="marquee-wrap" aria-hidden="true">
                    <span className="marquee-badge">LIVE</span>
                    <div className="marquee-viewport">
                        <span className="marquee-text">{marqueeText}&nbsp;&nbsp;•&nbsp;&nbsp;{marqueeText}</span>
                    </div>
                </div>
            )}

            {holidayName && discountPercent > 0 && (
                <div className="promo-banner">
                    🎉 <strong>{holidayName}</strong> — {discountPercent}% OFF all orders!
                </div>
            )}

            {/* Platform grid */}
            <section className="card-glass" aria-label="Select platform">
                <p className="card-glass__label">Select Platform</p>
                <div className="platform-grid">
                    {SOCIAL_PLATFORMS.map(p => (
                        <button
                            key={p.id}
                            className={`platform-btn${selectedPlatform === p.id ? ' platform-btn--active' : ''}`}
                            onClick={() => handlePlatformClick(p.id as SocialPlatform)}
                            aria-pressed={selectedPlatform === p.id}
                        >
                            <span className="platform-btn__icon" aria-hidden="true">{p.emoji}</span>
                            <span className="platform-btn__label">{p.label}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Category picker */}
            {selectedPlatform && (
                <section className="card-glass" aria-label="Select category">
                    <p className="card-glass__label">Category</p>
                    <div className="chip-scroll">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`chip${selectedCategory === cat ? ' chip--active' : ''}`}
                                onClick={() => {
                                    setSelectedCategory(cat === selectedCategory ? null : cat);
                                    setSelectedService(null);
                                    hapticImpact('light');
                                }}
                                aria-pressed={selectedCategory === cat}
                            >
                                {cat}
                            </button>
                        ))}
                        {categories.length === 0 && (
                            <p className="empty-hint">No categories found</p>
                        )}
                    </div>
                </section>
            )}

            {/* Service picker */}
            {selectedCategory && categoryServices.length > 0 && (
                <section className="card-glass" aria-label="Select service">
                    <p className="card-glass__label">Service</p>
                    <div className="service-list">
                        {categoryServices.map(svc => (
                            <button
                                key={svc.id}
                                className={`service-item${selectedService?.id === svc.id ? ' service-item--active' : ''}`}
                                onClick={() => {
                                    setSelectedService(svc.id === selectedService?.id ? null : svc);
                                    hapticImpact('light');
                                }}
                                aria-pressed={selectedService?.id === svc.id}
                            >
                                <span className="service-item__name">{svc.name}</span>
                                <span className="service-item__rate">
                                    {(svc.rate * rateMultiplier).toFixed(2)} ETB/1k
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Order form */}
            {selectedService && (
                <section className="card-glass" aria-label="Order form">
                    <p className="card-glass__label">Order Details</p>

                    {/* Service summary */}
                    <div className="order-service-summary">
                        <span className="order-service-summary__name">{selectedService.name}</span>
                        <div className="order-service-summary__meta">
                            <span>Min: {selectedService.min.toLocaleString()}</span>
                            <span>Max: {selectedService.max.toLocaleString()}</span>
                            <span>{selectedService.averageTime || 'Varies'}</span>
                            {selectedService.refill && <span className="badge badge--cyan">Refill</span>}
                            {selectedService.cancel && <span className="badge badge--gray">Cancel</span>}
                        </div>
                        {selectedService.custom_description && (
                            <p className="order-service-summary__desc">{selectedService.custom_description}</p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="order-form">
                        {/* Link */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="order-link">Target Link</label>
                            <input
                                id="order-link"
                                className="form-input"
                                type="url"
                                placeholder="https://t.me/yourchannel"
                                value={link}
                                onChange={e => setLink(e.target.value)}
                                required
                            />
                        </div>

                        {/* Quantity */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="order-qty">
                                Quantity ({selectedService.min.toLocaleString()} – {selectedService.max.toLocaleString()})
                            </label>
                            <input
                                id="order-qty"
                                className="form-input"
                                type="number"
                                min={selectedService.min}
                                max={selectedService.max}
                                placeholder={selectedService.min.toString()}
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                required
                            />
                        </div>

                        {/* Custom comment for comment services */}
                        {selectedService.type.includes('Comment') && (
                            <div className="form-group">
                                <label className="form-label" htmlFor="order-comment">Custom Comments</label>
                                <textarea
                                    id="order-comment"
                                    className="form-input form-input--textarea"
                                    placeholder="One comment per line"
                                    value={customComment}
                                    onChange={e => setCustomComment(e.target.value)}
                                    rows={4}
                                />
                            </div>
                        )}

                        {/* Price preview */}
                        <div className="order-price-row">
                            <span className="order-price-row__label">Total Cost</span>
                            <span
                                className="order-price-row__amount"
                                style={{ opacity: isStale ? 0.5 : 1, transition: 'opacity 0.1s' }}
                            >
                                {totalPrice.toFixed(2)} ETB
                                {discountPercent > 0 && (
                                    <span className="order-price-row__discount"> (-{discountPercent}%)</span>
                                )}
                            </span>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            id="place-order-btn"
                            disabled={isSubmitting || !userCanOrder}
                        >
                            {isSubmitting ? (
                                <span className="spinner" aria-hidden="true" />
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                    Place Order
                                </>
                            )}
                        </button>
                    </form>
                </section>
            )}

            {!selectedPlatform && (
                <div className="page-hint">
                    <span>👆</span>
                    <p>Select a platform above to get started</p>
                </div>
            )}
        </div>
    );
});
