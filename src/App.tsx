import { useState, useCallback } from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Toast, LoadingOverlay, NotificationPanel, SearchModal } from './components/Shared';
import { OrderPage } from './pages/OrderPage';
import { HistoryPage } from './pages/HistoryPage';
import { DepositPage } from './pages/DepositPage';
import { MorePage } from './pages/MorePage';

export default function App() {
  const { activeTab, isLoading } = useApp();
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearchClick = useCallback(() => setShowSearch(true), []);
  const handleNotifClick = useCallback(() => setShowNotifications(true), []);

  return (
    <div className="app-shell">
      <Header
        onSearchClick={handleSearchClick}
        onNotificationClick={handleNotifClick}
      />

      <main className="app-content">
        {/* Always-mounted pages strategy: CSS display toggle only */}
        <div className={activeTab === 'order' ? 'page-visible' : 'page-hidden'}>
          <OrderPage />
        </div>
        <div className={activeTab === 'history' ? 'page-visible' : 'page-hidden'}>
          <HistoryPage />
        </div>
        <div className={activeTab === 'deposit' ? 'page-visible' : 'page-hidden'}>
          <DepositPage />
        </div>
        <div className={activeTab === 'more' ? 'page-visible' : 'page-hidden'}>
          <MorePage />
        </div>
      </main>

      <BottomNav />

      {/* Subviews & Overlays */}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showNotifications && <NotificationPanel onBack={() => setShowNotifications(false)} />}
      <Toast />
      <LoadingOverlay visible={isLoading} />
    </div>
  );
}
