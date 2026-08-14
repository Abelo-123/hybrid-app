import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { hapticImpact, hapticNotification, openExternalLink } from '../helpers/telegram';
import * as api from '../api';

export function MorePage() {
    const { user, botUsername, showToast } = useApp();
    const [referralCodeInput, setReferralCodeInput] = useState('');
    const [refStats, setRefStats] = useState<{ totalEarned: number; referredList: any[] } | null>(null);
    const [isApplyingRef, setIsApplyingRef] = useState(false);

    useEffect(() => {
        api.fetchReferralStats()
            .then(res => { if (res.success) setRefStats(res); })
            .catch(() => { });
    }, []);

    const handleCopyRefLink = () => {
        const bot = botUsername || 'HybridSMM_bot';
        const code = user?.referral_code || user?.id || '';
        const link = `https://t.me/${bot}?start=ref_${code}`;
        navigator.clipboard.writeText(link);
        hapticNotification('success');
        showToast('success', 'Referral link copied!');
    };

    const handleApplyRef = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!referralCodeInput.trim()) return;
        setIsApplyingRef(true);
        try {
            const res = await api.applyReferralCode(referralCodeInput.trim());
            if (res.success) {
                hapticNotification('success');
                showToast('success', res.message || 'Referral applied!');
                setReferralCodeInput('');
            } else {
                throw new Error(res.error);
            }
        } catch (err: any) {
            hapticNotification('error');
            showToast('error', err.message || 'Invalid code');
        } finally {
            setIsApplyingRef(false);
        }
    };

    return (
        <div className="page" id="more-page">
            {/* User Profile Card */}
            <div className="card-glass profile-card">
                <div className="profile-card__avatar">
                    {user?.photo_url ? (
                        <img src={user.photo_url} alt="" width={56} height={56} />
                    ) : (
                        <span>{(user?.first_name?.[0] ?? '?').toUpperCase()}</span>
                    )}
                </div>
                <div>
                    <h3 className="profile-card__name">{user?.display_name ?? 'User'}</h3>
                    <p className="profile-card__username">@{user?.username || 'no_username'}</p>
                    <p className="profile-card__id">ID: {user?.id}</p>
                </div>
            </div>

            {/* Referral System */}
            <section className="card-glass" aria-label="Referral Program">
                <p className="card-glass__label">🎁 Referral Program</p>
                <p className="ref-text">Earn commission on every deposit made by users you invite!</p>

                <div className="ref-stats-row">
                    <div>
                        <span className="ref-stats__label">Total Earned</span>
                        <strong className="ref-stats__val">{(refStats?.totalEarned ?? 0).toFixed(2)} ETB</strong>
                    </div>
                    <div>
                        <span className="ref-stats__label">Referred Users</span>
                        <strong className="ref-stats__val">{refStats?.referredList?.length ?? 0}</strong>
                    </div>
                </div>

                <button className="btn-secondary" onClick={handleCopyRefLink}>
                    📋 Copy My Referral Link
                </button>

                {/* Apply Code */}
                <form onSubmit={handleApplyRef} className="ref-form">
                    <input
                        className="form-input"
                        type="text"
                        placeholder="Have a referral code?"
                        value={referralCodeInput}
                        onChange={e => setReferralCodeInput(e.target.value)}
                    />
                    <button type="submit" className="btn-secondary" disabled={isApplyingRef}>
                        Apply
                    </button>
                </form>
            </section>

            {/* Support & Links */}
            <section className="card-glass" aria-label="Support and Information">
                <p className="card-glass__label">Support & Links</p>
                <div className="menu-list">
                    <button className="menu-item" onClick={() => openExternalLink('https://t.me')}>
                        <span>💬 Telegram Support Channel</span>
                        <span>➔</span>
                    </button>
                    <button className="menu-item" onClick={() => {
                        hapticImpact('light');
                        showToast('info', 'Hybrid SMM v1.0.0 — Powered by Raw TWA script + React');
                    }}>
                        <span>ℹ️ App Version</span>
                        <span className="menu-item__val">v1.0.0</span>
                    </button>
                </div>
            </section>
        </div>
    );
}
