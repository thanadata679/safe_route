/**
 * login.js — AccidentGuard: Accident Prone Zone Alert System
 * =============================================================
 * Handles:
 *   • Tab switching (User / Admin)
 *   • Form validation (mobile number, password strength)
 *   • Password visibility toggle
 *   • User registration with localStorage persistence
 *   • Login authentication (user & admin)
 *   • Toast notification system
 *   • Animated stat counters
 *   • Panel switching (Login ↔ Register)
 */

'use strict';

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */
const MOBILE_REGEX = /^[6-9]\d{9}$/;     // Valid Indian mobile (starts 6-9, 10 digits)
const PW_UPPER_REGEX = /[A-Z]/;
const PW_LOWER_REGEX = /[a-z]/;
const PW_DIGIT_REGEX = /\d/;
const PW_SPECIAL_REGEX = /[!@#$%^&*()\-_=+\[\]{};:'",.<>?\/\\|`~]/;
const PW_MIN_LENGTH = 6;

// Demo / seed credentials (replace with real backend auth in production)
const DEMO_USER = { mobile: '9876543210', password: 'User@1', name: 'Demo User' };
const DEMO_ADMIN = { mobile: '9000000000', password: 'Admin@1', key: 'APZ-ADMIN-2024', name: 'Admin' };

/* ═══════════════════════════════════════════════════
   STORAGE HELPERS
═══════════════════════════════════════════════════ */
const STORAGE_KEY = 'apz_registered_users';

function getStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

/* ═══════════════════════════════════════════════════
   DOM HELPER
═══════════════════════════════════════════════════ */
function $(id) {
  return document.getElementById(id);
}

/* ═══════════════════════════════════════════════════
   VALIDATION MESSAGES
═══════════════════════════════════════════════════ */
const ICON_ERROR =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="13" height="13">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`;

const ICON_SUCCESS =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="13" height="13">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`;

function setMsg(id, type, text) {
  const el = $(id);
  if (!el) return;
  el.className = `validation-msg ${type} show`;
  el.innerHTML = `${type === 'error' ? ICON_ERROR : ICON_SUCCESS} ${text}`;
  el.setAttribute('role', 'alert');
}

function clearMsg(id) {
  const el = $(id);
  if (!el) return;
  el.className = 'validation-msg';
  el.textContent = '';
  el.removeAttribute('role');
}

/* ═══════════════════════════════════════════════════
   FIELD VALIDATORS
═══════════════════════════════════════════════════ */
function validateMobile(value, msgId) {
  const v = value.trim();
  if (!v) {
    setMsg(msgId, 'error', 'Mobile number is required');
    return false;
  }
  if (!/^\d{10}$/.test(v)) {
    setMsg(msgId, 'error', 'Must be exactly 10 digits');
    return false;
  }
  if (!MOBILE_REGEX.test(v)) {
    setMsg(msgId, 'error', 'Must start with 6, 7, 8, or 9');
    return false;
  }
  setMsg(msgId, 'success', 'Valid mobile number');
  return true;
}

function validatePassword(value, msgId) {
  if (!value) {
    setMsg(msgId, 'error', 'Password is required');
    return false;
  }
  const missing = [];
  if (value.length < PW_MIN_LENGTH) missing.push(`at least ${PW_MIN_LENGTH} characters`);
  if (!PW_UPPER_REGEX.test(value)) missing.push('one uppercase letter (A-Z)');
  if (!PW_LOWER_REGEX.test(value)) missing.push('one lowercase letter (a-z)');
  if (!PW_DIGIT_REGEX.test(value)) missing.push('one number (0-9)');
  if (!PW_SPECIAL_REGEX.test(value)) missing.push('one special character (!@#…)');

  if (missing.length) {
    setMsg(msgId, 'error', `Needs: ${missing.join(', ')}`);
    return false;
  }
  setMsg(msgId, 'success', 'Strong password ✓');
  return true;
}

/* ═══════════════════════════════════════════════════
   PASSWORD STRENGTH METER
═══════════════════════════════════════════════════ */
function scorePassword(pw) {
  let score = 0;
  if (pw.length >= PW_MIN_LENGTH) score++;
  if (pw.length >= 10) score++;
  if (PW_UPPER_REGEX.test(pw)) score++;
  if (PW_LOWER_REGEX.test(pw)) score++;
  if (PW_DIGIT_REGEX.test(pw)) score++;
  if (PW_SPECIAL_REGEX.test(pw)) score++;
  if (score <= 2) return { cls: 'strength-weak', label: 'Weak' };
  if (score <= 3) return { cls: 'strength-fair', label: 'Fair' };
  if (score <= 4) return { cls: 'strength-good', label: 'Good' };
  return { cls: 'strength-strong', label: 'Strong' };
}

function updateStrength(inputId, meterId) {
  const val = $(inputId) ? $(inputId).value : '';
  const wrap = $(meterId);
  if (!wrap) return;

  if (!val) {
    wrap.className = 'pw-strength-wrap';
    return;
  }
  const { cls, label } = scorePassword(val);
  wrap.className = `pw-strength-wrap show ${cls}`;
  const textEl = wrap.querySelector('.pw-strength-text');
  if (textEl) textEl.textContent = `Strength: ${label}`;
}

/* ═══════════════════════════════════════════════════
   TOAST NOTIFICATIONS
═══════════════════════════════════════════════════ */
const TOAST_ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="#2dc653" stroke-width="2.5" width="20" height="20"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="#e63946" stroke-width="2.5" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffb703" stroke-width="2.5" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="#e85d04" stroke-width="2.5" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

function showToast(message, type = 'info', duration = 4000) {
  const container = $('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${TOAST_ICONS[type] || TOAST_ICONS.info}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ═══════════════════════════════════════════════════
   PASSWORD VISIBILITY TOGGLE
═══════════════════════════════════════════════════ */
const EYE_OPEN =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`;

const EYE_CLOSED =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`;

function setupTogglePw(inputId, btnId) {
  const inp = $(inputId);
  const btn = $(btnId);
  if (!inp || !btn) return;

  btn.addEventListener('click', () => {
    const isVisible = inp.type === 'text';
    inp.type = isVisible ? 'password' : 'text';
    btn.innerHTML = isVisible ? EYE_OPEN : EYE_CLOSED;
    btn.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
  });
}

/* ═══════════════════════════════════════════════════
   TAB SWITCHING
═══════════════════════════════════════════════════ */
let activeTab = 'user';

function switchTab(tab) {
  activeTab = tab;

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // Update form sections
  document.querySelectorAll('.login-form-section').forEach(sec => {
    const isActive = sec.id === `${tab}-login-section`;
    sec.classList.toggle('active', isActive);
  });

  // Reset login validation messages
  [
    'val-user-mobile', 'val-user-password',
    'val-admin-mobile', 'val-admin-password', 'val-admin-key',
  ].forEach(clearMsg);

  // Clear input values on switch
  ['user-mobile', 'user-password', 'admin-mobile', 'admin-password', 'admin-key'].forEach(id => {
    const el = $(id);
    if (el) el.value = '';
  });
}

/* ═══════════════════════════════════════════════════
   PANEL SWITCHING (Login ↔ Register)
═══════════════════════════════════════════════════ */
function showRegisterPanel() {
  const lp = $('login-panel');
  const rp = $('register-panel');
  if (!lp || !rp) return;
  lp.style.display = 'none';
  rp.style.display = 'block';
  rp.classList.add('active');
  // Clear register form
  const form = $('register-form');
  if (form) form.reset();
  ['val-reg-name', 'val-reg-mobile', 'val-reg-email', 'val-reg-password', 'val-reg-confirm'].forEach(clearMsg);
  const str = $('reg-strength');
  if (str) str.className = 'pw-strength-wrap';
}

function showLoginPanel() {
  const lp = $('login-panel');
  const rp = $('register-panel');
  if (!lp || !rp) return;
  rp.style.display = 'none';
  lp.style.display = 'block';
  lp.classList.add('active');
}

/* ═══════════════════════════════════════════════════
   USER LOGIN HANDLER
═══════════════════════════════════════════════════ */
async function handleUserLogin(e) {
  e.preventDefault();
  const mobile = $('user-mobile').value.trim();
  const pw = $('user-password').value;

  const mOk = validateMobile(mobile, 'val-user-mobile');
  const pOk = validatePassword(pw, 'val-user-password');
  if (!mOk || !pOk) return;

  setButtonLoading('user-login-btn', true);

  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password: pw, role: 'user' })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Invalid credentials.');
    }

    const sessionUser = await res.json();
    sessionStorage.setItem('apz_session', JSON.stringify({
      name: sessionUser.name,
      mobile: sessionUser.mobile,
      role: sessionUser.role,
      ts: Date.now()
    }));

    showToast(`Welcome back, ${sessionUser.name}! Redirecting to dashboard…`, 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);

  } catch (err) {
    console.warn("Backend auth login failed, trying demo user & local cache fallback:", err);
    // Fallback to demo credentials & local storage
    const isDemo = mobile === DEMO_USER.mobile && pw === DEMO_USER.password;
    const stored = getStoredUsers().find(u => u.mobile === mobile && u.password === pw);

    if (isDemo || stored) {
      const name = stored ? stored.name : DEMO_USER.name;
      sessionStorage.setItem('apz_session', JSON.stringify({
        name, mobile, role: 'user', ts: Date.now()
      }));
      showToast(`Welcome, ${name}! (Offline mode) Redirecting to dashboard…`, 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    } else {
      showToast(err.message || 'Invalid mobile number or password.', 'error');
      setMsg('val-user-mobile', 'error', 'No account found with these credentials');
    }
  } finally {
    setButtonLoading('user-login-btn', false);
  }
}

/* ═══════════════════════════════════════════════════
   ADMIN LOGIN HANDLER
═══════════════════════════════════════════════════ */
async function handleAdminLogin(e) {
  e.preventDefault();
  const mobile = $('admin-mobile').value.trim();
  const pw = $('admin-password').value;
  const key = $('admin-key') ? $('admin-key').value.trim() : '';

  const mOk = validateMobile(mobile, 'val-admin-mobile');
  const pOk = validatePassword(pw, 'val-admin-password');

  let kOk = true;
  if (!key) {
    setMsg('val-admin-key', 'error', 'Admin access key is required');
    kOk = false;
  } else if (key !== DEMO_ADMIN.key) {
    setMsg('val-admin-key', 'error', 'Invalid access key — contact your administrator');
    kOk = false;
  } else {
    setMsg('val-admin-key', 'success', 'Key verified ✓');
  }

  if (!mOk || !pOk || !kOk) return;

  setButtonLoading('admin-login-btn', true);

  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password: pw, role: 'admin' })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Invalid admin credentials.');
    }

    const sessionAdmin = await res.json();
    sessionStorage.setItem('apz_session', JSON.stringify({
      name: sessionAdmin.name,
      mobile: sessionAdmin.mobile,
      role: sessionAdmin.role,
      ts: Date.now()
    }));

    showToast('Admin authenticated! Loading admin dashboard…', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);

  } catch (err) {
    console.warn("Backend admin login failed, trying local fallback:", err);
    if (mobile === DEMO_ADMIN.mobile && pw === DEMO_ADMIN.password) {
      sessionStorage.setItem('apz_session', JSON.stringify({
        name: DEMO_ADMIN.name, mobile, role: 'admin', ts: Date.now()
      }));
      showToast('Admin authenticated! (Offline mode) Loading dashboard…', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    } else {
      showToast(err.message || 'Invalid admin credentials.', 'error');
      setMsg('val-admin-mobile', 'error', 'Admin credentials not recognized');
    }
  } finally {
    setButtonLoading('admin-login-btn', false);
  }
}

/* ═══════════════════════════════════════════════════
   REGISTER HANDLER
═══════════════════════════════════════════════════ */
async function handleRegister(e) {
  e.preventDefault();

  const name = $('reg-name').value.trim();
  const mobile = $('reg-mobile').value.trim();
  const email = $('reg-email').value.trim();
  const pw = $('reg-password').value;
  const confirm = $('reg-confirm').value;
  const terms = $('reg-terms').checked;

  let valid = true;

  // Validate name
  if (!name || name.length < 2) {
    setMsg('val-reg-name', 'error', 'Enter your full name (min 2 characters)');
    valid = false;
  } else {
    setMsg('val-reg-name', 'success', 'Valid name');
  }

  // Validate mobile
  if (!validateMobile(mobile, 'val-reg-mobile')) valid = false;

  // Validate email
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!email) {
    setMsg('val-reg-email', 'error', 'Email address is required');
    valid = false;
  } else if (!emailOk) {
    setMsg('val-reg-email', 'error', 'Enter a valid email (e.g. you@example.com)');
    valid = false;
  } else {
    setMsg('val-reg-email', 'success', 'Valid email address');
  }

  // Validate password
  if (!validatePassword(pw, 'val-reg-password')) valid = false;

  // Validate confirm
  if (!confirm) {
    setMsg('val-reg-confirm', 'error', 'Please confirm your password');
    valid = false;
  } else if (pw !== confirm) {
    setMsg('val-reg-confirm', 'error', 'Passwords do not match');
    valid = false;
  } else {
    setMsg('val-reg-confirm', 'success', 'Passwords match ✓');
  }

  // Terms
  if (!terms) {
    showToast('Please accept the Terms & Conditions to proceed.', 'warning');
    valid = false;
  }

  if (!valid) return;

  setButtonLoading('reg-btn', true);

  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mobile, email, password: pw, role: 'user' })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Registration failed.');
    }

    showToast(`🎉 Account created! Welcome, ${name}. Please sign in.`, 'success', 5500);

    // Reset form & switch to login
    $('register-form').reset();
    ['val-reg-name', 'val-reg-mobile', 'val-reg-email', 'val-reg-password', 'val-reg-confirm'].forEach(clearMsg);
    const str = $('reg-strength');
    if (str) str.className = 'pw-strength-wrap';

    showLoginPanel();
    switchTab('user');

    // Pre-fill mobile for convenience
    setTimeout(() => {
      const mEl = $('user-mobile');
      if (mEl) mEl.value = mobile;
    }, 400);

  } catch (err) {
    console.warn("Backend registration failed, falling back to LocalStorage:", err);

    // Duplicate check in local storage
    const users = getStoredUsers();
    if (users.find(u => u.mobile === mobile)) {
      setMsg('val-reg-mobile', 'error', 'This mobile number is already registered');
      setButtonLoading('reg-btn', false);
      return;
    }
    if (users.find(u => u.email === email)) {
      setMsg('val-reg-email', 'error', 'This email is already registered');
      setButtonLoading('reg-btn', false);
      return;
    }

    users.push({ name, mobile, email, password: pw, role: 'user', createdAt: new Date().toISOString() });
    saveStoredUsers(users);

    showToast(`🎉 Account created (Offline Mode)! Welcome, ${name}. Please sign in.`, 'success', 5500);

    // Reset form & switch to login
    $('register-form').reset();
    ['val-reg-name', 'val-reg-mobile', 'val-reg-email', 'val-reg-password', 'val-reg-confirm'].forEach(clearMsg);
    const str = $('reg-strength');
    if (str) str.className = 'pw-strength-wrap';

    showLoginPanel();
    switchTab('user');

    // Pre-fill mobile for convenience
    setTimeout(() => {
      const mEl = $('user-mobile');
      if (mEl) mEl.value = mobile;
    }, 400);
  } finally {
    setButtonLoading('reg-btn', false);
  }
}

/* ═══════════════════════════════════════════════════
   BUTTON LOADING STATE
═══════════════════════════════════════════════════ */
function setButtonLoading(btnId, isLoading) {
  const btn = $(btnId);
  if (!btn) return;
  btn.classList.toggle('loading', isLoading);
  btn.disabled = isLoading;
}

/* ═══════════════════════════════════════════════════
   ANIMATED COUNTERS (Left Panel Stats)
═══════════════════════════════════════════════════ */
function animateCounter(el, target, suffix) {
  const duration = 1500;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString() + suffix;
  }
  requestAnimationFrame(step);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        animateCounter(el, target, suffix);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

/* ═══════════════════════════════════════════════════
   LIVE VALIDATION (on blur / input)
═══════════════════════════════════════════════════ */
function attachLiveValidation() {
  // Numeric-only input enforcement for mobile fields
  ['user-mobile', 'admin-mobile', 'reg-mobile'].forEach(id => {
    $(id)?.addEventListener('keypress', e => {
      if (!/^\d$/.test(e.key)) e.preventDefault();
    });
    $(id)?.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 10);
      $(id).value = text;
    });
  });

  // User login
  $('user-mobile')?.addEventListener('blur', () => validateMobile($('user-mobile').value, 'val-user-mobile'));
  $('user-password')?.addEventListener('blur', () => validatePassword($('user-password').value, 'val-user-password'));

  // Admin login
  $('admin-mobile')?.addEventListener('blur', () => validateMobile($('admin-mobile').value, 'val-admin-mobile'));
  $('admin-password')?.addEventListener('blur', () => validatePassword($('admin-password').value, 'val-admin-password'));

  // Register — name
  $('reg-name')?.addEventListener('blur', () => {
    const n = $('reg-name').value.trim();
    if (!n || n.length < 2) setMsg('val-reg-name', 'error', 'Min 2 characters');
    else setMsg('val-reg-name', 'success', 'Valid name');
  });

  // Register — mobile
  $('reg-mobile')?.addEventListener('blur', () => validateMobile($('reg-mobile').value, 'val-reg-mobile'));

  // Register — email
  $('reg-email')?.addEventListener('blur', () => {
    const v = $('reg-email').value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (!v) setMsg('val-reg-email', 'error', 'Email is required');
    else if (!ok) setMsg('val-reg-email', 'error', 'Invalid email format');
    else setMsg('val-reg-email', 'success', 'Valid email address');
  });

  // Register — password (real-time strength)
  $('reg-password')?.addEventListener('input', () => updateStrength('reg-password', 'reg-strength'));
  $('reg-password')?.addEventListener('blur', () => validatePassword($('reg-password').value, 'val-reg-password'));

  // Register — confirm
  $('reg-confirm')?.addEventListener('blur', () => {
    const pw = $('reg-password').value;
    const cf = $('reg-confirm').value;
    if (!cf) setMsg('val-reg-confirm', 'error', 'Confirm your password');
    else if (pw !== cf) setMsg('val-reg-confirm', 'error', 'Passwords do not match');
    else setMsg('val-reg-confirm', 'success', 'Passwords match ✓');
  });
}

/* ═══════════════════════════════════════════════════
   INIT — DOMContentLoaded
═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Switch-to-user link inside admin tab
  $('switch-to-user-link')?.addEventListener('click', e => { e.preventDefault(); switchTab('user'); });

  // Form submissions
  $('user-login-form')?.addEventListener('submit', handleUserLogin);
  $('admin-login-form')?.addEventListener('submit', handleAdminLogin);
  $('register-form')?.addEventListener('submit', handleRegister);

  // Panel navigation
  $('show-register-link')?.addEventListener('click', e => { e.preventDefault(); showRegisterPanel(); });
  $('show-login-link')?.addEventListener('click', e => { e.preventDefault(); showLoginPanel(); });

  // Password visibility toggles
  setupTogglePw('user-password', 'toggle-user-pw');
  setupTogglePw('admin-password', 'toggle-admin-pw');
  setupTogglePw('reg-password', 'toggle-reg-pw');
  setupTogglePw('reg-confirm', 'toggle-reg-confirm');

  // Live validation
  attachLiveValidation();

  // Stat counters
  initCounters();

  // Default tab
  switchTab('user');

  // Auto-migrate local storage users to backend database
  setTimeout(async () => {
    try {
      const users = JSON.parse(localStorage.getItem('apz_registered_users') || '[]');
      if (users.length === 0) return;
      console.info(`Migrating ${users.length} user account(s) to backend Supabase database...`);
      for (let u of users) {
        try {
          await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: u.name,
              mobile: u.mobile,
              email: u.email,
              password: u.password,
              role: u.role || 'user'
            })
          });
        } catch (_) {}
      }
      localStorage.removeItem('apz_registered_users');
    } catch (_) {}
  }, 1500);
});
