const API = 'http://localhost:3001/api';
let adminPassword = '';
let currentPage = 'overview';
let accountsPage = 1;
let allAccounts = [];
let withdrawalStatus = 'pending';

// ── Gold dot matrix canvas ────────────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('dot-canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLS = 28;
  const ROWS = 18;
  const BASE_COLOR = [245, 158, 11];

  const phases = Array.from({ length: COLS * ROWS }, () => Math.random() * Math.PI * 2);

  function draw(ts) {
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const gridTop = H * 0.42;
    const gridH = H * 0.58;

    for (let r = 0; r < ROWS; r++) {
      const t = r / (ROWS - 1);
      const y = gridTop + t * gridH;

      const spread = 0.3 + t * 0.7;
      const rowW = W * spread;
      const rowLeft = (W - rowW) / 2;
      const dotSize = 1.2 + t * 2.8;

      for (let c = 0; c < COLS; c++) {
        const x = rowLeft + (c / (COLS - 1)) * rowW;
        const phase = phases[r * COLS + c];
        const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(ts / 1800 + phase));

        const rowFade = Math.pow(t, 0.6);
        const edgeFade = 1 - Math.pow(Math.abs((c / (COLS - 1)) * 2 - 1), 2.5);
        const alpha = pulse * rowFade * edgeFade * 0.85;

        const [r0, g0, b0] = BASE_COLOR;
        ctx.beginPath();
        ctx.arc(x, y, dotSize * 0.5, 0, Math.PI * 2);

        if (t > 0.5 && alpha > 0.4) {
          ctx.shadowColor = `rgba(${r0},${g0},${b0},${alpha * 0.7})`;
          ctx.shadowBlur = dotSize * 3;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = `rgba(${r0},${g0},${b0},${alpha})`;
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function login() {
  const pw = document.getElementById('adminPassword').value.trim();
  if (!pw) return;

  try {
    const res = await fetch(`${API}/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();

    if (data.success) {
      adminPassword = pw;
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      loadOverview();
    } else {
      document.getElementById('loginError').textContent = 'Invalid password';
    }
  } catch {
    document.getElementById('loginError').textContent = 'Cannot connect to server';
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('loginScreen').classList.contains('hidden')) {
    login();
  }
});

function logout() {
  adminPassword = '';
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('adminPassword').value = '';
}

// ── Navigation ────────────────────────────────────────────────────────────────
const ALL_PAGES = ['overview', 'accounts', 'investments', 'stakes', 'withdrawals', 'credit', 'contract', 'platform'];

function navigate(el) {
  el.blur();
  if (window.innerWidth <= 768) closeSidebar();
  document.getElementById('sidebar').scrollTop = 0;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');

  const page = el.dataset.page;
  currentPage = page;

  ALL_PAGES.forEach(p => {
    const div = document.getElementById(`page-${p}`);
    if (div) { div.classList.add('hidden'); div.classList.remove('active'); }
  });

  const target = document.getElementById(`page-${page}`);
  if (target) { target.classList.remove('hidden'); target.classList.add('active'); }

  const titles = {
    overview: 'Overview',
    accounts: 'Accounts',
    investments: 'AI Investments',
    stakes: 'Stakes',
    withdrawals: 'Withdrawals',
    credit: 'Credit / Debit',
    contract: 'Contract',
    platform: 'Platform Control',
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  loadCurrentPage();
}

function loadCurrentPage() {
  const loaders = {
    overview: loadOverview,
    accounts: loadAccounts,
    investments: loadInvestments,
    stakes: loadStakes,
    withdrawals: () => loadWithdrawals(withdrawalStatus),
    contract: loadContractInfo,
    platform: loadPlatformStatus,
  };
  loaders[currentPage]?.();
}

// ── Overview ──────────────────────────────────────────────────────────────────
async function loadOverview() {
  try {
    const res = await fetch(`${API}/admin/stats?password=${adminPassword}`);
    const data = await res.json();
    if (!data.success) return;

    const d = data.data;
    document.getElementById('stat-users').textContent = d.totalUsers.toLocaleString();
    document.getElementById('stat-deposited').textContent = bnb(d.totalDeposited);
    document.getElementById('stat-ai').textContent = bnb(d.totalAiEarnings);
    document.getElementById('stat-withdrawn').textContent = bnb(d.totalWithdrawn);
    document.getElementById('stat-pending').textContent = d.pendingWithdrawals.toLocaleString();
    document.getElementById('stat-staking').textContent = bnb(d.totalStakingEarnings);

    const banner = document.getElementById('platform-banner');
    if (d.platformPaused) {
      banner.textContent = '⚠ Platform is currently PAUSED — deposits and new investments are blocked';
      banner.classList.remove('hidden');
      banner.classList.add('paused');
    } else {
      banner.classList.add('hidden');
      banner.classList.remove('paused');
    }
  } catch {
    console.error('Failed to load stats');
  }
}

// ── Accounts ──────────────────────────────────────────────────────────────────
async function loadAccounts() {
  try {
    const res = await fetch(`${API}/admin/accounts?password=${adminPassword}&page=${accountsPage}&limit=20`);
    const data = await res.json();
    if (!data.success) return;

    allAccounts = data.data;
    renderAccounts(allAccounts);

    document.getElementById('pageInfo').textContent = `Page ${accountsPage} / ${Math.ceil(data.total / 20) || 1}`;
  } catch {
    console.error('Failed to load accounts');
  }
}

function renderAccounts(accounts) {
  const tbody = document.getElementById('accountsTable');
  if (!accounts.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px">No accounts found</td></tr>';
    return;
  }

  tbody.innerHTML = accounts.map(a => {
    const b = a.balance || {};
    const suspended = a.isSuspended;
    const wBlocked = a.withdrawalsBlocked;
    return `
      <tr>
        <td><span class="addr">${short(a.address)}</span></td>
        <td>${a.username || '—'}</td>
        <td>${bnb(b.totalDeposited)}</td>
        <td>${bnb(b.tradingBalance)}</td>
        <td>${bnb(b.aiEarnings)}</td>
        <td>${bnb(b.totalWithdrawn)}</td>
        <td>
          <span class="badge ${suspended ? 'badge-suspended' : 'badge-ok'}">${suspended ? 'Suspended' : 'Active'}</span>
          ${wBlocked ? '<span class="badge badge-suspended" style="margin-left:4px;font-size:9px">W.Blocked</span>' : ''}
        </td>
        <td class="actions-cell">
          <button class="${suspended ? 'btn-unsuspend' : 'btn-suspend'}"
            onclick="toggleSuspend('${a.address}', ${!suspended})">
            ${suspended ? 'Unsuspend' : 'Suspend'}
          </button>
          <button class="${wBlocked ? 'btn-unsuspend' : 'btn-suspend'}"
            onclick="toggleWithdrawals('${a.address}', ${!wBlocked})">
            ${wBlocked ? 'Allow W.' : 'Block W.'}
          </button>
          <button class="btn-approve" onclick="openAddFunds('${a.address}')">
            + Funds
          </button>
          <button class="btn-reject" onclick="deleteAccount('${a.address}')">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAccounts() {
  const q = document.getElementById('accountSearch').value.toLowerCase();
  const filtered = allAccounts.filter(a =>
    a.address.includes(q) || (a.username || '').toLowerCase().includes(q)
  );
  renderAccounts(filtered);
}

async function toggleSuspend(address, suspend) {
  try {
    await fetch(`${API}/admin/accounts/${address}?password=${adminPassword}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isSuspended: suspend }),
    });
    loadAccounts();
  } catch {
    console.error('Failed to update account');
  }
}

async function toggleWithdrawals(address, block) {
  try {
    await fetch(`${API}/admin/accounts/${address}?password=${adminPassword}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ withdrawalsBlocked: block }),
    });
    loadAccounts();
  } catch {
    console.error('Failed to update account');
  }
}

function openAddFunds(address) {
  const modal = document.getElementById('addFundsModal');
  document.getElementById('addFundsAddress').value = address;
  document.getElementById('addFundsAmount').value = '';
  document.getElementById('addFundsField').value = 'tradingBalance';
  document.getElementById('addFundsMsg').textContent = '';
  modal.classList.remove('hidden');
}

function closeAddFunds() {
  document.getElementById('addFundsModal').classList.add('hidden');
}

async function submitAddFunds() {
  const address = document.getElementById('addFundsAddress').value.trim();
  const field = document.getElementById('addFundsField').value;
  const amount = parseFloat(document.getElementById('addFundsAmount').value);
  const msg = document.getElementById('addFundsMsg');

  if (!address || isNaN(amount) || amount === 0) {
    msg.textContent = 'Enter a valid amount';
    msg.style.color = 'var(--red)';
    return;
  }

  try {
    const res = await fetch(`${API}/admin/credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, field, amount, password: adminPassword }),
    });
    const data = await res.json();
    if (data.success) {
      msg.textContent = `✓ ${amount > 0 ? 'Added' : 'Deducted'} ${Math.abs(amount)} BNB`;
      msg.style.color = 'var(--green)';
      loadAccounts();
      setTimeout(closeAddFunds, 1200);
    } else {
      msg.textContent = data.error || 'Failed';
      msg.style.color = 'var(--red)';
    }
  } catch {
    msg.textContent = 'Request failed';
    msg.style.color = 'var(--red)';
  }
}

async function deleteAccount(address) {
  if (!confirm(`Delete account ${address}?\nThis removes the user and all their data permanently.`)) return;
  try {
    const res = await fetch(`${API}/admin/accounts/${address}?password=${adminPassword}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) {
      loadAccounts();
    } else {
      alert(data.error || 'Delete failed');
    }
  } catch {
    alert('Request failed');
  }
}

function changePage(dir) {
  accountsPage = Math.max(1, accountsPage + dir);
  loadAccounts();
}

// ── AI Investments ────────────────────────────────────────────────────────────
async function loadInvestments() {
  try {
    const address = document.getElementById('investSearch')?.value?.trim();
    const status = document.getElementById('investStatusFilter')?.value;

    let url = `${API}/admin/investments?password=${adminPassword}`;
    if (address) url += `&address=${address}`;
    if (status) url += `&status=${status}`;

    const res = await fetch(url);
    const data = await res.json();
    const tbody = document.getElementById('investmentsTable');

    if (!data.success || !data.data.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px">No investments found</td></tr>';
      return;
    }

    tbody.innerHTML = data.data.map(inv => `
      <tr>
        <td><span class="addr">${short(inv.address)}</span></td>
        <td>${inv.packageName}</td>
        <td>${bnb(inv.amount)}</td>
        <td>${(inv.dailyRateBps / 100).toFixed(1)}%/day</td>
        <td>${new Date(inv.endDate).toLocaleDateString()}</td>
        <td>${bnb(inv.claimedEarnings)}</td>
        <td><span class="badge badge-${inv.status === 'active' ? 'active' : inv.status === 'cancelled' ? 'suspended' : 'claimed'}">${inv.status}</span></td>
        <td>
          ${inv.status === 'active' ? `
            <button class="btn-approve" onclick="manageInvestment('${inv._id}', 'complete')">Complete</button>
            <button class="btn-reject" onclick="manageInvestment('${inv._id}', 'cancel')">Cancel</button>
          ` : '—'}
        </td>
      </tr>
    `).join('');
  } catch {
    console.error('Failed to load investments');
  }
}

async function manageInvestment(id, action) {
  const label = action === 'cancel' ? 'Cancel investment and refund principal?' : 'Force-complete investment and pay accrued earnings?';
  if (!confirm(label)) return;

  try {
    const res = await fetch(`${API}/admin/investments/${id}?password=${adminPassword}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (data.success) {
      loadInvestments();
    } else {
      alert(data.error || 'Action failed');
    }
  } catch {
    alert('Request failed');
  }
}

// ── Stakes ────────────────────────────────────────────────────────────────────
async function loadStakes() {
  const address = document.getElementById('stakeSearch')?.value?.trim();
  if (!address) return;

  try {
    const res = await fetch(`${API}/stake?address=${address}`);
    const data = await res.json();
    const tbody = document.getElementById('stakesTable');

    if (!data.success || !data.data.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px">No stakes found</td></tr>';
      return;
    }

    tbody.innerHTML = data.data.map(s => `
      <tr>
        <td><span class="addr">${short(s.address)}</span></td>
        <td>${bnb(s.amount)}</td>
        <td>${s.durationDays} days</td>
        <td>${(s.dailyRateBps / 100).toFixed(1)}%/day</td>
        <td>${new Date(s.endDate).toLocaleDateString()}</td>
        <td><span class="badge badge-${s.status === 'active' ? 'active' : 'claimed'}">${s.status}</span></td>
      </tr>
    `).join('');
  } catch {
    console.error('Failed to load stakes');
  }
}

// ── Withdrawals ───────────────────────────────────────────────────────────────
async function loadWithdrawals(status = 'pending') {
  withdrawalStatus = status;
  try {
    const res = await fetch(`${API}/admin/withdrawals?password=${adminPassword}&status=${status}`);
    const data = await res.json();
    const tbody = document.getElementById('withdrawalsTable');

    if (!data.success || !data.data.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px">No withdrawals found</td></tr>';
      return;
    }

    tbody.innerHTML = data.data.map(w => `
      <tr>
        <td><span class="addr">${short(w.address)}</span></td>
        <td>${bnb(w.amount)}</td>
        <td><span class="badge badge-${w.status}">${w.status}</span></td>
        <td>${new Date(w.createdAt).toLocaleDateString()}</td>
        <td>
          ${w.status === 'pending' ? `
            <button class="btn-approve" onclick="updateWithdrawal('${w._id}', 'approved')">Approve</button>
            <button class="btn-reject"  onclick="updateWithdrawal('${w._id}', 'rejected')">Reject</button>
          ` : '—'}
        </td>
      </tr>
    `).join('');
  } catch {
    console.error('Failed to load withdrawals');
  }
}

function filterWithdrawals(status, btn) {
  document.querySelectorAll('.wtab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadWithdrawals(status);
}

function setInvestTab(btn) {
  document.querySelectorAll('.itab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('investStatusFilter').value = btn.dataset.val;
  loadInvestments();
}

async function updateWithdrawal(id, status) {
  try {
    await fetch(`${API}/admin/withdrawals/${id}?password=${adminPassword}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadWithdrawals(withdrawalStatus);
  } catch {
    console.error('Failed to update withdrawal');
  }
}

// ── Credit / Debit ────────────────────────────────────────────────────────────
async function creditUser() {
  const address = document.getElementById('creditAddress').value.trim();
  const field = document.getElementById('creditField').value;
  const amount = parseFloat(document.getElementById('creditAmount').value);
  const note = document.getElementById('creditNote').value.trim();
  const msg = document.getElementById('creditMsg');

  if (!address || !field || isNaN(amount) || amount === 0) {
    msg.textContent = 'Please fill all required fields (amount cannot be zero)';
    msg.style.color = 'var(--red)';
    return;
  }

  try {
    const res = await fetch(`${API}/admin/credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, field, amount, note, password: adminPassword }),
    });
    const data = await res.json();

    if (data.success) {
      const action = amount > 0 ? `Credited +${amount}` : `Deducted ${amount}`;
      msg.textContent = `✓ ${action} BNB from ${field}`;
      msg.style.color = 'var(--green)';
      document.getElementById('creditAddress').value = '';
      document.getElementById('creditAmount').value = '';
      document.getElementById('creditNote').value = '';
    } else {
      msg.textContent = data.error;
      msg.style.color = 'var(--red)';
    }
  } catch {
    msg.textContent = 'Request failed';
    msg.style.color = 'var(--red)';
  }
}

// ── Contract ──────────────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = '0x5354237Ff7AF8387aB72D5C0De1AabEf33ff63C5';

async function loadContractInfo() {
  document.getElementById('contract-balance').textContent = 'Loading...';
  try {
    const res = await fetch(
      `https://api.bscscan.com/api?module=account&action=balance&address=${CONTRACT_ADDRESS}&tag=latest`
    );
    const data = await res.json();
    if (data.status === '1') {
      const bnbVal = (parseFloat(data.result) / 1e18).toFixed(6);
      document.getElementById('contract-balance').textContent = `${bnbVal} BNB`;
    } else {
      document.getElementById('contract-balance').textContent = 'Unavailable';
    }
  } catch {
    document.getElementById('contract-balance').textContent = 'Error';
  }
}

function copyContractAddress() {
  navigator.clipboard.writeText(CONTRACT_ADDRESS).then(() => {
    const btn = event.target;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });
}

async function submitFundContract() {
  const amount = parseFloat(document.getElementById('fundAmount').value);
  const msg = document.getElementById('fundMsg');
  if (!amount || amount <= 0) {
    msg.textContent = 'Enter a valid amount';
    msg.style.color = 'var(--red)';
    return;
  }
  if (!confirm(`Send ${amount} BNB from owner wallet to contract?`)) return;

  msg.textContent = 'Sending...';
  msg.style.color = 'var(--text-muted)';

  try {
    const res = await fetch(`${API}/admin/fund-contract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, password: adminPassword }),
    });
    const data = await res.json();
    if (data.success) {
      msg.textContent = `✓ Funded ${amount} BNB — tx: ${data.txHash?.slice(0, 18)}...`;
      msg.style.color = 'var(--green)';
      document.getElementById('fundAmount').value = '';
      setTimeout(loadContractInfo, 3000);
    } else {
      msg.textContent = data.error || 'Transaction failed';
      msg.style.color = 'var(--red)';
    }
  } catch {
    msg.textContent = 'Request failed';
    msg.style.color = 'var(--red)';
  }
}

async function setContractPaused(paused) {
  const label = paused
    ? 'Pause the contract on-chain? All deposits and withdrawals will be blocked.'
    : 'Unpause the contract on-chain?';
  if (!confirm(label)) return;

  const msg = document.getElementById('pauseMsg');
  msg.textContent = 'Sending transaction...';
  msg.style.color = 'var(--text-muted)';

  try {
    const res = await fetch(`${API}/admin/set-paused`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused, password: adminPassword }),
    });
    const data = await res.json();
    if (data.success) {
      msg.textContent = `✓ Contract ${paused ? 'paused' : 'unpaused'} — tx: ${data.data.txHash?.slice(0, 18)}...`;
      msg.style.color = paused ? 'var(--red)' : 'var(--green)';
      setTimeout(loadContractInfo, 3000);
    } else {
      msg.textContent = data.error || 'Failed';
      msg.style.color = 'var(--red)';
    }
  } catch {
    msg.textContent = 'Request failed';
    msg.style.color = 'var(--red)';
  }
}

async function submitEmergencyWithdraw() {
  if (!confirm('EMERGENCY WITHDRAW: Transfer ALL contract BNB to treasury? This cannot be undone.')) return;
  if (!confirm('Are you absolutely sure?')) return;

  const msg = document.getElementById('emergencyMsg');
  msg.textContent = 'Sending transaction...';
  msg.style.color = 'var(--text-muted)';

  try {
    const res = await fetch(`${API}/admin/emergency-withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword }),
    });
    const data = await res.json();
    if (data.success) {
      msg.textContent = `✓ Withdrawn to treasury — tx: ${data.data.txHash?.slice(0, 18)}...`;
      msg.style.color = 'var(--green)';
      setTimeout(loadContractInfo, 3000);
    } else {
      msg.textContent = data.error || 'Failed';
      msg.style.color = 'var(--red)';
    }
  } catch {
    msg.textContent = 'Request failed';
    msg.style.color = 'var(--red)';
  }
}

// ── Platform Control ──────────────────────────────────────────────────────────
function applyPlatformState(paused) {
  const card = document.getElementById('platformHeroCard');
  const icon = document.getElementById('platformHeroIcon');
  const text = document.getElementById('platformStatusText');
  const badge = document.getElementById('platformStatusBadge');

  if (paused) {
    card.classList.add('paused');
    icon.textContent = '⏸';
    text.textContent = 'Platform is in maintenance mode';
    badge.textContent = 'Paused';
  } else {
    card.classList.remove('paused');
    icon.textContent = '▶';
    text.textContent = 'Platform is running normally';
    badge.textContent = 'Active';
  }

  document.getElementById('btnPause').style.opacity  = paused ? '0.4' : '1';
  document.getElementById('btnResume').style.opacity = paused ? '1' : '0.4';
}

async function loadPlatformStatus() {
  try {
    const res = await fetch(`${API}/admin/platform?password=${adminPassword}`);
    const data = await res.json();
    if (!data.success) return;

    applyPlatformState(data.data.paused);
    document.getElementById('maintenanceMsg').value = data.data.message || '';
  } catch {
    console.error('Failed to load platform status');
  }
}

async function setPlatformPaused(paused) {
  const label = paused
    ? 'Pause platform? This will block all deposits and new investments.'
    : 'Resume platform? Users will be able to deposit and invest again.';
  if (!confirm(label)) return;

  try {
    const res = await fetch(`${API}/admin/platform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused, password: adminPassword }),
    });
    const data = await res.json();
    if (data.success) {
      const msg = document.getElementById('platformMsg');
      msg.textContent = paused ? '⏸ Platform paused successfully' : '▶ Platform resumed successfully';
      msg.style.color = paused ? 'var(--red)' : 'var(--green)';
      applyPlatformState(paused);
    }
  } catch {
    console.error('Failed to update platform status');
  }
}

async function saveMaintenanceMsg() {
  const message = document.getElementById('maintenanceMsg').value.trim();
  try {
    const res = await fetch(`${API}/admin/platform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, password: adminPassword }),
    });
    const data = await res.json();
    const msg = document.getElementById('platformMsg');
    if (data.success) {
      msg.textContent = '✓ Message saved';
      msg.style.color = 'var(--green)';
    } else {
      msg.textContent = data.error || 'Failed';
      msg.style.color = 'var(--red)';
    }
  } catch {
    console.error('Failed to save message');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function bnb(val) {
  if (!val || val === 0) return '0 BNB';
  return parseFloat(val).toFixed(4) + ' BNB';
}

function short(addr) {
  if (!addr) return '—';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

// ── Mobile sidebar ────────────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburger');
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    closeSidebar();
  } else {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    hamburger.classList.add('open');
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburger');
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
  hamburger.classList.remove('open');
}

// ── Init ──────────────────────────────────────────────────────────────────────
initParticles();
