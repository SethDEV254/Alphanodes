import axios from 'axios';
import { API } from './config';

const api = axios.create({ baseURL: API });

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
export const getWithdrawals = (address) =>
  api.get(`/api/transactions?address=${address}&type=withdrawal`);

export const getCryptoPrices = () => api.get('/api/crypto/prices');

// Admin
export const adminVerify = (password) => api.post('/api/admin/verify', { password });
export const adminStats = (password) => api.get(`/api/admin/stats?password=${password}`);
export const adminAccounts = (password, page = 1) =>
  api.get(`/api/admin/accounts?password=${password}&page=${page}&limit=20`);
export const adminUpdateAccount = (address, data, password) =>
  api.patch(`/api/admin/accounts/${address}`, { ...data, password });
export const adminWithdrawals = (password, status = 'pending') =>
  api.get(`/api/admin/withdrawals?password=${password}&status=${status}`);
export const adminUpdateWithdrawal = (id, data, password) =>
  api.patch(`/api/admin/withdrawals/${id}`, { ...data, password });
