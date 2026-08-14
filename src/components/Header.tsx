import { useApp } from '../context/AppContext';
import { hapticImpact } from '../helpers/telegram';

interface HeaderProps {
    onSearchClick: () => void;
    onNotificationClick: () => void;
}

export function Header({ onSearchClick, onNotificationClick }: HeaderProps) {
    const { user, unreadAlerts, setActiveTab } = useApp();

    const initials = user
        ? (user.first_name[0] + (user.last_name?.[0] ?? '')).toUpperCase()
        : '?';

    const balanceStr = user ? user.balance.toFixed(2) : '---';

    return (
        <header className="global-header">
            <div className="global-header__left">
                <div className="global-header__avatar-wrapper">
                    {user?.photo_url ? (
                        <img
                            className="global-header__avatar-img"
                            src={user.photo_url}
                            alt={user.display_name}
                            width={44} height={44}
                        />
                    ) : (
                        <div className="global-header__avatar">{initials}</div>
                    )}
                    <span className="global-header__avatar-ring" aria-hidden="true" />
                </div>
                <div className="global-header__info">
                    <div className="global-header__name-row">
                        <span className="global-header__name">
                            {user?.display_name ?? 'Loading...'}
                        </span>
                        <span className="global-header__verified" aria-label="Verified">✓</span>
                    </div>
                    <div className="global-header__balance">
                        Balance:{' '}
                        <button
                            className="global-header__add-funds"
                            onClick={() => { setActiveTab('deposit'); hapticImpact('light'); }}
                            aria-label="Add funds"
                        >
                            {balanceStr} ETB
                        </button>
                    </div>
                </div>
            </div>

            <div className="global-header__actions">
                <button
                    className="global-header__action-btn global-header__action-btn--search"
                    onClick={() => { onSearchClick(); hapticImpact('light'); }}
                    aria-label="Search services"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </button>
                <button
                    className="global-header__action-btn"
                    onClick={() => { onNotificationClick(); hapticImpact('light'); }}
                    aria-label={`Notifications${unreadAlerts > 0 ? `, ${unreadAlerts} unread` : ''}`}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {unreadAlerts > 0 && (
                        <span className="global-header__badge" aria-hidden="true">
                            {unreadAlerts > 9 ? '9+' : unreadAlerts}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
}
