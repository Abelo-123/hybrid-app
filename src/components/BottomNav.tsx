import { useApp } from '../context/AppContext';
import type { TabId } from '../types';
import { hapticImpact } from '../helpers/telegram';

const TABS: { id: TabId; label: string; icon: JSX.Element }[] = [
    {
        id: 'order',
        label: 'Order',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
        ),
    },
    {
        id: 'history',
        label: 'History',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
    {
        id: 'deposit',
        label: 'Deposit',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
            </svg>
        ),
    },
    {
        id: 'more',
        label: 'More',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
            </svg>
        ),
    },
];

export function BottomNav() {
    const { activeTab, setActiveTab, unreadAlerts } = useApp();

    const handleClick = (tab: TabId) => {
        if (tab === activeTab) return;
        setActiveTab(tab);
        hapticImpact('light');
    };

    return (
        <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
            <div className="bottom-nav__inner">
                {TABS.map(tab => {
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            className={`bottom-nav__item${active ? ' bottom-nav__item--active' : ''}`}
                            onClick={() => handleClick(tab.id)}
                            aria-label={tab.label}
                            aria-current={active ? 'page' : undefined}
                        >
                            {active && <span className="bottom-nav__indicator" aria-hidden="true" />}
                            <span className="bottom-nav__icon" aria-hidden="true">
                                {tab.icon}
                                {tab.id === 'more' && unreadAlerts > 0 && (
                                    <span className="bottom-nav__badge">
                                        {unreadAlerts > 9 ? '9+' : unreadAlerts}
                                    </span>
                                )}
                            </span>
                            <span className="bottom-nav__label">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
