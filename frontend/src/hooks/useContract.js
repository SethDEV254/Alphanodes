import { useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACT_ADDRESS } from '../config.js';
import ABI from '../contracts/AlphaNodes.json';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Safely convert any number to a fixed-point string for parseEther
// Avoids scientific notation (e.g. 1.66e-3) which parseEther can't handle
const toWei = (n) => parseEther(Number(n).toFixed(18));

export function useAlphaNodes() {
  const { writeContractAsync } = useWriteContract();

  const call = (functionName, args, overrides) =>
    writeContractAsync({ address: CONTRACT_ADDRESS, abi: ABI, functionName, args, ...overrides });

  return {
    register: (referrer) => call('register', [referrer || ZERO_ADDRESS]),
    deposit: (amountEth) => call('deposit', [], { value: toWei(amountEth) }),
    requestWithdrawal: (amountEth) => call('requestWithdrawal', [toWei(amountEth)]),
    claimWithdrawal: (id) => call('claimWithdrawal', [BigInt(id)]),
    investBalance: (packageId, amountEth) =>
      call('investBalance', [BigInt(packageId), toWei(amountEth)]),
    claimAIEarnings: (id) => call('claimAIEarnings', [BigInt(id)]),
    stake: (amountEth, durationDays) =>
      call('stake', [toWei(amountEth), BigInt(durationDays)]),
    unstake: (id) => call('unstake', [BigInt(id)]),
    earlyUnlock: (id) => call('earlyUnlock', [BigInt(id)]),
    fundContract: (amountEth) => call('fundContract', [], { value: toWei(amountEth) }),
  };
}

export function useContractOwner() {
  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'owner',
  });
  return owner;
}

export function useUserBalance(address) {
  const { data: raw, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getUser',
    args: [address],
    query: { enabled: !!address },
  });

  const balance = raw ? {
    tradingBalance: parseFloat(formatEther(raw.tradingBalance || 0n)),
    aiEarnings: parseFloat(formatEther(raw.aiEarnings || 0n)),
    referralEarnings: parseFloat(formatEther(raw.referralEarnings || 0n)),
    totalDeposited: parseFloat(formatEther(raw.totalDeposited || 0n)),
    totalWithdrawn: parseFloat(formatEther(raw.totalWithdrawn || 0n)),
    exists: raw.exists,
  } : null;

  return { balance, refetch };
}

export function useUserInvestments(address) {
  const { data: ids, refetch: refetchIds } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getUserAIInvestments',
    args: [address],
    query: { enabled: !!address },
  });

  const { data: rawList, refetch: refetchData } = useReadContracts({
    contracts: (ids || []).map((id) => ({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'aiInvestments',
      args: [id],
    })),
    query: { enabled: !!ids?.length },
  });

  const investments = (ids || []).map((id, i) => {
    const r = rawList?.[i]?.result;
    if (!r) return null;
    return {
      contractId: Number(id),
      packageId: Number(r.packageId),
      amount: parseFloat(formatEther(r.amount || 0n)),
      startTime: Number(r.startTime) * 1000,
      endTime: Number(r.endTime) * 1000,
      claimedEarnings: parseFloat(formatEther(r.claimedEarnings || 0n)),
      active: r.active,
    };
  }).filter(Boolean);

  const refetch = () => { refetchIds(); refetchData(); };

  return { investments, refetch };
}

export function useUserStakes(address) {
  const { data: ids, refetch: refetchIds } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getUserStakes',
    args: [address],
    query: { enabled: !!address },
  });

  const { data: rawList, refetch: refetchData } = useReadContracts({
    contracts: (ids || []).map((id) => ({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'stakes',
      args: [id],
    })),
    query: { enabled: !!ids?.length },
  });

  const stakes = (ids || []).map((id, i) => {
    const r = rawList?.[i]?.result;
    if (!r) return null;
    return {
      contractId: Number(id),
      amount: parseFloat(formatEther(r.amount || 0n)),
      dailyRateBps: Number(r.dailyRateBps),
      startTime: Number(r.startTime) * 1000,
      endTime: Number(r.endTime) * 1000,
      claimedEarnings: parseFloat(formatEther(r.claimedEarnings || 0n)),
      active: r.active,
      earlyUnlocked: r.earlyUnlocked,
    };
  }).filter(Boolean);

  const refetch = () => { refetchIds(); refetchData(); };

  return { stakes, refetch };
}

export function useUserWithdrawals(address) {
  const { data: ids, refetch: refetchIds } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getUserWithdrawals',
    args: [address],
    query: { enabled: !!address },
  });

  const { data: rawList, refetch: refetchData } = useReadContracts({
    contracts: (ids || []).map((id) => ({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'withdrawals',
      args: [id],
    })),
    query: { enabled: !!ids?.length },
  });

  const withdrawals = (ids || []).map((id, i) => {
    const r = rawList?.[i]?.result;
    if (!r) return null;
    return {
      contractId: Number(id),
      amount: parseFloat(formatEther(r.amount || 0n)),
      timestamp: Number(r.timestamp) * 1000,
      approved: r.approved,
      rejected: r.rejected,
      claimed: r.claimed,
    };
  }).filter(Boolean);

  const refetch = () => { refetchIds(); refetchData(); };

  return { withdrawals, refetch };
}
