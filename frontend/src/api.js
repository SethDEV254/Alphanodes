import axios from 'axios';
import { API } from './config';

const api = axios.create({ baseURL: API, withCredentials: true });

export const getUser = (address) => api.get(`/api/user?address=${address}`);
export const createUser = (data) => api.post('/api/user', data);
export const getBalance = (address) => api.get(`/api/balance?address=${address}`);
export const getTransactions = (address, type, limit = 20) =>
  api.get(`/api/transactions?address=${address}&limit=${limit}${type ? `&type=${type}` : ''}`);

export const getAiInvestments = (address) => api.get(`/api/ai-investment?address=${address}`);
export const getAiPackages = () => api.get('/api/ai-investment/packages');
export const createAiInvestment = (data) => api.post('/api/ai-investment', data);
export const claimAiInvestment = (data) => api.post('/api/ai-investment/claim', data);
export const compoundAiInvestment = (data) => api.post('/api/ai-investment/compound', data);

export const getStakes = (address) => api.get(`/api/stake?address=${address}`);
export const createStake = (data) => api.post('/api/stake', data);
export const unstake = (id, data) => api.post(`/api/stake/${id}/unstake`, data);
export const earlyUnlock = (id, data) => api.post(`/api/stake/${id}/early-unlock`, data);
export const claimTranche = (id, data) => api.post(`/api/stake/${id}/claim-tranche`, data);
export const claimStakingReferral = (data) => api.post('/api/stake/claim-referral-earnings', data);
export const getStakingReferralStats = (address) => api.get(`/api/stake/referral-stats?address=${address}`);

export const getTraders = () => api.get('/api/copytrade/traders');
export const getCopyTrades = (address) => api.get(`/api/copytrade?address=${address}`);
export const startCopyTrade = (data) => api.post('/api/copytrade', data);
export const stopCopyTrade = (id, data) => api.post(`/api/copytrade/${id}/stop`, data);
export const takeCopyTradeProfit = (data) => api.post('/api/copytrade/take-profit', data);
export const takeCopyTradeCapital = (data) => api.post('/api/copytrade/take-capital', data);

export const getTrades = (address) => api.get(`/api/trade?address=${address}`);
export const openTrade = (data) => api.post('/api/trade', data);
export const closeTrade = (id, data) => api.post(`/api/trade/${id}/close`, data);

export const getLoanEligibility = (address) => api.get(`/api/loan/eligibility?address=${address}`);
export const getActiveLoan = (address) => api.get(`/api/loan/active?address=${address}`);
export const getLoanHistory = (address) => api.get(`/api/loan/history?address=${address}`);
export const requestLoan = (data) => api.post('/api/loan/request', data);
export const repayLoan = (data) => api.post('/api/loan/repay', data);

export const getReferral = (address) => api.get(`/api/referral?address=${address}`);

export const deposit = (data) => api.post('/api/deposit', data);
export const requestWithdrawal = (data) => api.post('/api/withdraw', data);
export const claimWithdrawal = (data) => api.post('/api/withdraw/claim', data);
export const compound = (data) => api.post('/api/withdraw/compound', data);
export const getWithdrawalStatus = (address) => api.get(`/api/withdraw/status?address=${address}`);
export const getWithdrawals = (address) =>
  api.get(`/api/transactions?address=${address}&type=withdrawal`);

export const getCryptoPrices = () => api.get('/api/crypto/prices');

// Admin
export const adminVerify = (password) => api.post('/api/admin/verify', { password });

// Wallet-signature admin login (alongside the legacy password during rollout)
export const adminAuthNonce = (address) => api.post('/api/admin/auth/nonce', { address });
export const adminAuthVerify = (address, signature) =>
  api.post('/api/admin/auth/verify', { address, signature });
export const adminAuthLogout = () => api.post('/api/admin/auth/logout');
export const adminAuthSession = () => api.get('/api/admin/auth/session');
export const adminStats = (password) => api.get(`/api/admin/stats?password=${password}`);
export const adminAccounts = (password, page = 1) =>
  api.get(`/api/admin/accounts?password=${password}&page=${page}&limit=20`);
export const adminUpdateAccount = (address, data, password) =>
  api.patch(`/api/admin/accounts/${address}`, { ...data, password });
export const adminWithdrawals = (password, status = 'pending') =>
  api.get(`/api/admin/withdrawals?password=${password}&status=${status}`);
export const adminUpdateWithdrawal = (id, data, password) =>
  api.patch(`/api/admin/withdrawals/${id}`, { ...data, password });
export const adminCredit = (data, password) =>
  api.post('/api/admin/credit', { ...data, password });

export const adminGetTraders = (password) =>
  api.get(`/api/admin/traders?password=${password}`);
export const adminCreateTrader = (data, password) =>
  api.post('/api/admin/traders', { ...data, password });
export const adminUpdateTrader = (id, data, password) =>
  api.patch(`/api/admin/traders/${id}`, { ...data, password });
export const adminDeleteTrader = (id, password) =>
  api.delete(`/api/admin/traders/${id}?password=${password}`);

export const adminContractInfo = (password) =>
  api.get(`/api/admin/contract-info?password=${password}`);
export const adminFundContract = (data, password) =>
  api.post('/api/admin/fund-contract', { ...data, password });
export const adminSetPaused = (paused, password) =>
  api.post('/api/admin/set-paused', { paused, password });
export const adminEmergencyWithdraw = (password) =>
  api.post('/api/admin/emergency-withdraw', { password });
export const adminSetTreasury = (address, password) =>
  api.post('/api/admin/set-treasury', { address, password });

export const adminGetInvestments = (password, address = '', status = '') =>
  api.get(`/api/admin/investments?password=${password}${address ? `&address=${address}` : ''}${status ? `&status=${status}` : ''}`);
export const adminManageInvestment = (id, action, password) =>
  api.patch(`/api/admin/investments/${id}`, { action, password });
export const adminGetStakes = (address) =>
  api.get(`/api/stake?address=${address}`);
export const adminGetPlatform = (password) =>
  api.get(`/api/admin/platform?password=${password}`);
export const adminSetPlatform = (data, password) =>
  api.post('/api/admin/platform', { ...data, password });

export const adminGetAiRates = (password) =>
  api.get(`/api/admin/ai-rates?password=${password}`);
export const adminSetAiRates = (rates, password) =>
  api.post('/api/admin/ai-rates', { rates, password });

export const adminPreviewPayouts = (password) =>
  api.get(`/api/admin/payouts/preview?password=${password}`);
export const adminExecutePayouts = (password) =>
  api.post('/api/admin/payouts/execute', { password });
export const adminPayoutHistory = (password) =>
  api.get(`/api/admin/payouts/history?password=${password}`);

// Support tickets
export const getTickets = (address) => api.get(`/api/tickets?address=${address}`);
export const createTicket = (data) => api.post('/api/tickets', data);
export const replyTicket = (id, data) => api.post(`/api/tickets/${id}/reply`, data);

export const adminGetTickets = (password, status = '') =>
  api.get(`/api/admin/tickets?password=${password}${status ? `&status=${status}` : ''}`);
export const adminReplyTicket = (id, message, password) =>
  api.post(`/api/admin/tickets/${id}/reply`, { message, password });
export const adminUpdateTicket = (id, status, password) =>
  api.patch(`/api/admin/tickets/${id}`, { status, password });

// AI chat
export const aiChatSend = (address, message) =>
  api.post('/api/ai-analysis/chat', { address, message });

// Distribution wallets
export const adminGetDistribution = (password) =>
  api.get(`/api/admin/distribution?password=${password}`);
export const adminAddDistributionWallet = (data, password) =>
  api.post('/api/admin/distribution', { ...data, password });
export const adminDeleteDistributionWallet = (id, password) =>
  api.delete(`/api/admin/distribution/${id}?password=${password}`);
export const adminExecuteDistribution = (amount, password) =>
  api.post('/api/admin/distribution/execute', { amount, password });
export const adminDistributionHistory = (password) =>
  api.get(`/api/admin/distribution/history?password=${password}`);
