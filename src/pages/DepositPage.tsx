import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { processDeposit } from '../api';
import { hapticNotification, hapticImpact } from '../helpers/telegram';

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

export function DepositPage() {
    const { user, setBalance, showToast, refreshDeposits, deposits } = useApp();
    const [amount, setAmount] = useState<string>('500');
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePreset = (val: number) => {
        setAmount(val.toString());
        hapticImpact('light');
    };

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseFloat(amount);
        if (isNaN(num) || num < 10) {
            hapticNotification('error');
            showToast('error', 'Minimum deposit is 10 ETB');
            return;
        }

        setIsProcessing(true);
        try {
            const txRef = `TX_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const res = await processDeposit(num, txRef);
            if (res.new_balance !== undefined) {
                hapticNotification('success');
                setBalance(res.new_balance);
                showToast('success', `Deposited ${num} ETB successfully!`);
                refreshDeposits();
            } else {
                throw new Error('Deposit failed');
            }
        } catch (err: any) {
            hapticNotification('error');
            showToast('error', err.message || 'Deposit failed');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="page" id="deposit-page">
            {/* Balance Hero */}
            <div className="balance-hero">
                <span className="balance-hero__label">Current Balance</span>
                <div className="balance-hero__amount">
                    {user?.balance.toFixed(2) ?? '0.00'}{' '}
                    <span className="balance-hero__curr">ETB</span>
                </div>
            </div>

            {/* Deposit Form */}
            <section className="card-glass" aria-label="Add funds">
                <p className="card-glass__label">Add Funds (Telebirr / Chapa)</p>
                <form onSubmit={handleDeposit} className="deposit-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="deposit-amount">Amount in ETB</label>
                        <input
                            id="deposit-amount"
                            className="form-input form-input--lg"
                            type="number"
                            min="10"
                            step="10"
                            placeholder="500"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                        />
                    </div>

                    {/* Presets */}
                    <div className="preset-grid">
                        {PRESET_AMOUNTS.map(val => (
                            <button
                                key={val}
                                type="button"
                                className={`preset-btn${amount === val.toString() ? ' preset-btn--active' : ''}`}
                                onClick={() => handlePreset(val)}
                            >
                                +{val}
                            </button>
                        ))}
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Processing...' : `Deposit ${parseFloat(amount) || 0} ETB`}
                    </button>
                </form>
            </section>

            {/* Recent Deposits */}
            <section className="card-glass" aria-label="Deposit history">
                <p className="card-glass__label">Recent Deposits</p>
                {deposits.length === 0 ? (
                    <p className="empty-hint">No deposit history</p>
                ) : (
                    <div className="deposit-list">
                        {deposits.map(d => (
                            <div key={d.id} className="deposit-item">
                                <div>
                                    <span className="deposit-item__ref">Ref: {d.reference_id}</span>
                                    <time className="deposit-item__time">{new Date(d.created_at).toLocaleDateString()}</time>
                                </div>
                                <div className="deposit-item__right">
                                    <span className="deposit-item__amount">+{d.amount.toFixed(2)} ETB</span>
                                    <span className={`badge badge--${d.status === 'completed' || d.status === 'success' ? 'success' : 'warning'}`}>
                                        {d.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
