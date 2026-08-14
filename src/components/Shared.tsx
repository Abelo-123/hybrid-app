import React, { Component, ReactNode, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

// ─── Error Boundary ───────────────────────────────────────────
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center', color: '#ff4757', background: '#080d19', minHeight: '100vh' }}>
          <h2>Application Error</h2>
          <p style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
            {this.state.error?.message || 'Something went wrong.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, background: '#00f5d4', color: '#080d19', border: 'none', fontWeight: 'bold' }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Toast Container ─────────────────────────────────────────
export function Toast() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast toast--${t.type}`}
          role="alert"
          onClick={() => removeToast(t.id)}
        >
          <span className="toast__icon" aria-hidden="true">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span className="toast__message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Loading Overlay ─────────────────────────────────────────
interface LoadingOverlayProps {
  visible: boolean;
}

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div className="loading-overlay" role="status" aria-label="Loading">
      <div className="loading-overlay__spinner" aria-hidden="true" />
      <span className="loading-overlay__text">Loading...</span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--text" />
      <div className="skeleton skeleton--text skeleton--short" />
    </div>
  );
}

// ─── Marquee Ticker ───────────────────────────────────────────
interface MarqueeTickerProps {
  text: string;
}

export function MarqueeTicker({ text }: MarqueeTickerProps) {
  if (!text) return null;
  return (
    <div className="marquee-wrap" aria-hidden="true">
      <span className="marquee-badge">LIVE</span>
      <div className="marquee-viewport">
        <span className="marquee-text">{text}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{text}</span>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────
interface EmptyStateProps {
  icon?: string;
  title: string;
  text?: string;
}

export function EmptyState({ icon = '📭', title, text }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">{icon}</span>
      <h3 className="empty-state__title">{title}</h3>
      {text && <p className="empty-state__text">{text}</p>}
    </div>
  );
}

// ─── Notification Panel ───────────────────────────────────────
interface NotificationPanelProps {
  onBack: () => void;
}

export function NotificationPanel({ onBack }: NotificationPanelProps) {
  const { alerts, refreshAlerts, unreadAlerts } = useApp();
  const markedRef = useRef(false);

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  useEffect(() => {
    if (unreadAlerts > 0 && !markedRef.current) {
      markedRef.current = true;
      import('../api').then(m => m.markAlertsRead().catch(() => {}));
    }
  }, [unreadAlerts]);

  return (
    <div className="fullpage-overlay" role="dialog" aria-label="Notifications">
      <div className="fullpage-header">
        <button className="fullpage-back" onClick={onBack} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="fullpage-title">Notifications</h2>
      </div>
      <div className="fullpage-content">
        {alerts.length === 0 ? (
          <EmptyState icon="🔔" title="No notifications" text="You're all caught up!" />
        ) : alerts.map(a => (
          <div key={a.id} className={`notification-item${!a.is_read ? ' notification-item--unread' : ''}`}>
            {!a.is_read && <span className="notification-item__dot" aria-label="Unread" />}
            <div className="notification-item__body">
              <p className="notification-item__message">{a.message}</p>
              <time className="notification-item__time">
                {new Date(a.created_at).toLocaleDateString()}
              </time>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Search Modal ─────────────────────────────────────────────
interface SearchModalProps {
  onClose: () => void;
}

export function SearchModal({ onClose }: SearchModalProps) {
  const { services, setSelectedService, setSelectedCategory, setSelectedPlatform, setActiveTab } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof services>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(services.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    ).slice(0, 20));
  }, [query, services]);

  const handleSelect = (svc: typeof services[0]) => {
    setSelectedPlatform(svc.platform_id ?? null);
    setSelectedCategory(svc.category);
    setSelectedService(svc);
    setActiveTab('order');
    onClose();
  };

  return (
    <div className="fullpage-overlay" role="dialog" aria-label="Search services">
      <div className="fullpage-header">
        <button className="fullpage-back" onClick={onClose} aria-label="Close search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="search-input-wrap">
          <input
            ref={inputRef}
            className="search-input"
            type="search"
            placeholder="Search services..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search services"
          />
        </div>
      </div>
      <div className="fullpage-content">
        {!query && (
          <p className="search-hint">Type to search across {services.length} services</p>
        )}
        {results.map(svc => (
          <button
            key={svc.id}
            className="search-result-card"
            onClick={() => handleSelect(svc)}
          >
            <div className="search-result-card__header">
              <span className="search-result-card__id">#{svc.id}</span>
              <span className="search-result-card__cat">{svc.category}</span>
            </div>
            <p className="search-result-card__name">{svc.name}</p>
            <div className="search-result-card__meta">
              <span>{svc.min.toLocaleString()} – {svc.max.toLocaleString()} units</span>
              <strong className="search-result-card__price">{svc.rate.toFixed(2)} ETB/1k</strong>
            </div>
          </button>
        ))}
        {query && results.length === 0 && (
          <EmptyState icon="🔍" title="No results" text={`Nothing found for "${query}"`} />
        )}
      </div>
    </div>
  );
}
