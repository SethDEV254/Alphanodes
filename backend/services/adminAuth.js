const crypto = require('crypto');
const { ethers } = require('ethers');

const NONCE_COOKIE = 'an_admin_nonce';
const SESSION_COOKIE = 'an_admin_session';
const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Cookie helpers (no cookie-parser dependency — this is small enough not to need it) ───

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    if (!key) return;
    out[key] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

function setCookie(res, name, value, maxAgeMs) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

function clearCookie(res, name) {
  res.append('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// ─── Sign-in message ──────────────────────────────────────────────────────────

function buildSignInMessage(address, nonce, issuedAt, origin) {
  return `AlphaNodes wants you to sign in with your BSC wallet:
${address}

Sign this message to verify wallet ownership. This request will not trigger a blockchain transaction or cost any gas.

URI: ${origin}
Version: 1
Chain ID: 56
Nonce: ${nonce}
Issued At: ${new Date(issuedAt).toISOString()}`;
}

/**
 * Starts a sign-in attempt: generates a nonce, stores it (bound to the claimed
 * address) in a short-lived cookie, and returns the message the wallet must sign.
 */
function startSignIn(req, res, address) {
  const nonce = crypto.randomUUID();
  const issuedAt = Date.now();
  setCookie(res, NONCE_COOKIE, `${nonce}:${address.toLowerCase()}:${issuedAt}`, NONCE_TTL_MS);
  const origin = `${req.protocol}://${req.get('host')}`;
  return buildSignInMessage(address, nonce, issuedAt, origin);
}

/**
 * Verifies a signed sign-in message against the nonce cookie set by startSignIn().
 * Trust comes entirely from the recovered signer address matching the claim —
 * the nonce cookie's only job is anti-replay/binding, it isn't itself a secret.
 */
function verifySignIn(req, address, signature) {
  const cookies = parseCookies(req);
  const cookieValue = cookies[NONCE_COOKIE];
  if (!cookieValue) return { ok: false, error: 'Nonce expired or missing. Try connecting again.' };

  const [nonce, cookieAddress, issuedAtStr] = cookieValue.split(':');
  if (!nonce || !cookieAddress || !issuedAtStr) return { ok: false, error: 'Invalid nonce' };
  if (cookieAddress !== address.toLowerCase()) return { ok: false, error: 'Address mismatch' };

  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > NONCE_TTL_MS) {
    return { ok: false, error: 'Nonce expired. Try connecting again.' };
  }

  const origin = `${req.protocol}://${req.get('host')}`;
  const message = buildSignInMessage(address, nonce, issuedAt, origin);

  let recovered;
  try {
    recovered = ethers.verifyMessage(message, signature);
  } catch {
    return { ok: false, error: 'Invalid signature' };
  }

  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return { ok: false, error: 'Signature does not match address' };
  }

  return { ok: true };
}

// ─── Admin allowlist ──────────────────────────────────────────────────────────

function isAdminAddress(address) {
  const list = process.env.ADMIN_WALLET_ADDRESSES || '';
  const allowlist = list.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean);
  return allowlist.includes(address.toLowerCase());
}

// ─── Session tokens (HMAC-SHA256, no JWT library needed for this) ────────────

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET env var is not set');
  return secret;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function createSessionToken(address) {
  const payload = { address: address.toLowerCase(), iat: Date.now(), exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function verifySessionToken(token) {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  if (sign(body) !== signature) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload.exp || Date.now() > payload.exp) return null;
  return payload;
}

function issueSession(res, address) {
  setCookie(res, SESSION_COOKIE, createSessionToken(address), SESSION_TTL_MS);
}

function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[SESSION_COOKIE]);
}

function clearSession(res) {
  clearCookie(res, SESSION_COOKIE);
}

module.exports = {
  startSignIn,
  verifySignIn,
  isAdminAddress,
  issueSession,
  getSessionFromRequest,
  clearSession,
  clearNonce: (res) => clearCookie(res, NONCE_COOKIE),
};
