import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useState, useEffect, createContext, useContext } from 'react';
import { getUser, createUser, getBalance, getCryptoPrices } from './api.js';
import { useUserBalance } from './hooks/useContract.js';
import Layout from './components/Layout.jsx';
import Connect from './pages/Connect.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AIAgents from './pages/AIAgents.jsx';
import Trading from './pages/Trading.jsx';
import CopyTrading from './pages/CopyTrading.jsx';
import Staking from './pages/Staking.jsx';
import Loans from './pages/Loans.jsx';
import Affiliate from './pages/Affiliate.jsx';
import AIChat from './pages/AIChat.jsx';
import Support from './pages/Support.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import { ADMIN_PATH, BNB_PRICE_USD } from './config.js';

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export default function App() {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [liveBalance, setLiveBalance] = useState(null);
  const [bnbPrice, setBnbPrice] = useState(BNB_PRICE_USD);
  const [txVersion, setTxVersion] = useState(0);
  const { balance: onChainBal, refetch: refetchChain } = useUserBalance(address);

  useEffect(() => {
    getCryptoPrices()
      .then(r => {
        const p = r.data?.data?.bnb || r.data?.data?.BNB;
        if (p) setBnbPrice(p);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      setUser(null);
      setBalance(null);
      return;
    }
    initUser(address);
  }, [isConnected, address]);

  const initUser = async (addr) => {
    try {
      const pendingUsername = localStorage.getItem('alphanodes_pending_username') || '';
      const pendingAvatar = localStorage.getItem('alphanodes_avatar') || '';

      let res = await getUser(addr);

      if (!res.data.success) {
        const ref = new URLSearchParams(window.location.search).get('ref') || '';
        await createUser({
          address: addr,
          referredBy: ref,
          ...(pendingUsername && { username: pendingUsername }),
          ...(pendingAvatar && { avatar: pendingAvatar }),
        });
        res = await getUser(addr);
      } else if (pendingUsername) {
        await createUser({ address: addr, username: pendingUsername });
        res = await getUser(addr);
      }

      if (pendingUsername) localStorage.removeItem('alphanodes_pending_username');
      setUser(res.data.data);
    } catch (e) {
      console.error('initUser error:', e);
    }
    fetchBalance(addr);
  };

  const fetchBalance = async (addr) => {
    const a = addr || address;
    if (!a) return;
    try {
      const res = await getBalance(a);
      setBalance(res.data.data);
    } catch (e) {}
  };

  // Poll backend balance every 3s — catches admin credits and event-synced deposits fast
  useEffect(() => {
    if (!address) return;
    const t = setInterval(() => fetchBalance(address), 3_000);
    return () => clearInterval(t);
  }, [address]);

  // Refresh immediately when user returns to the tab
  useEffect(() => {
    if (!address) return;
    const onFocus = () => fetchBalance(address);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [address]);

  const refreshBalance = () => fetchBalance(address);

  // Call after any on-chain tx: refetches chain + backend + bumps txVersion
  const refreshAll = async () => {
    setTxVersion(v => v + 1);
    await Promise.all([refetchChain(), fetchBalance(address)]);
  };

  // Authoritative trading balance — latest of: post-tx live read, DB, on-chain wagmi hook
  const tradingBalance = liveBalance?.tradingBalance ?? balance?.tradingBalance ?? onChainBal?.tradingBalance ?? null;

  return (
    <AppContext.Provider value={{ user, balance, onChainBal, liveBalance, setLiveBalance, tradingBalance, refreshBalance, refreshAll, address, bnbPrice, txVersion }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={isConnected ? <Navigate to="/dashboard" /> : <Connect />} />
          <Route path={ADMIN_PATH} element={<AdminPanel />} />
          {isConnected ? (
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/ai-agents" element={<AIAgents />} />
              <Route path="/trading" element={<Trading />} />
              <Route path="/copy-trading" element={<CopyTrading />} />
              <Route path="/staking" element={<Staking />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/affiliate" element={<Affiliate />} />
              <Route path="/ai-chat" element={<AIChat />} />
              <Route path="/support" element={<Support />} />
            </Route>
          ) : (
            <Route path="*" element={<Navigate to="/" />} />
          )}
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
