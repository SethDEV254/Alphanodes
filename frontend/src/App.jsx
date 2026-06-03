import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useState, useEffect, createContext, useContext } from 'react';
import { getUser, createUser, getBalance, getCryptoPrices } from './api.js';
import Layout from './components/Layout.jsx';
import Connect from './pages/Connect.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AIAgents from './pages/AIAgents.jsx';
import Trading from './pages/Trading.jsx';
import CopyTrading from './pages/CopyTrading.jsx';
import Staking from './pages/Staking.jsx';
import Loans from './pages/Loans.jsx';
import Affiliate from './pages/Affiliate.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import { ADMIN_PATH, BNB_PRICE_USD } from './config.js';

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export default function App() {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [bnbPrice, setBnbPrice] = useState(BNB_PRICE_USD);

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

  const refreshBalance = () => fetchBalance();

  return (
    <AppContext.Provider value={{ user, balance, refreshBalance, address, bnbPrice }}>
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
            </Route>
          ) : (
            <Route path="*" element={<Navigate to="/" />} />
          )}
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
