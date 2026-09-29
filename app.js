'use strict';

/**
 * App — Módulo principal: navegação, toasts, inicialização.
 */
const App = (() => {
  // ── State ──────────────────────────────────────────────────
  let activeScreen = 'comprovante';

  // ── Meses ──────────────────────────────────────────────────
  const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril',
    'Maio', 'Junho', 'Julho', 'Agosto',
    'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // ── Init ───────────────────────────────────────────────────
  function init() {
    _buildNavigation();
    _initTabFromHash();
    window.addEventListener('hashchange', _initTabFromHash);
    Comprovante.init();
    Balanco.init();
  }

  // ── Navigation ─────────────────────────────────────────────
  function _buildNavigation() {
    // Mobile bottom nav
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) {
      bottomNav.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', () => switchScreen(btn.dataset.tab));
      });
    }

    // Desktop top nav
    const desktopNav = document.getElementById('desktop-nav');
    if (desktopNav) {
      desktopNav.querySelectorAll('.desktop-nav-tab').forEach(btn => {
        btn.addEventListener('click', () => switchScreen(btn.dataset.tab));
      });
    }
  }

  function _initTabFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'balanco') {
      switchScreen('balanco');
    } else {
      switchScreen('comprovante');
    }
  }

  function switchScreen(screenId) {
    activeScreen = screenId;
    window.location.hash = screenId;

    // Update screens
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.toggle('active', s.id === 'screen-' + screenId);
    });

    // Update mobile nav
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === screenId);
    });

    // Update desktop nav
    document.querySelectorAll('.desktop-nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === screenId);
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Toast Notifications ────────────────────────────────────
  function showToast(message, type = 'default', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✅',
      error:   '❌',
      warning: '⚠️',
      default: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.default}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut .3s ease forwards';
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
  }

  // ── Helpers ────────────────────────────────────────────────
  function getMeses() { return MESES; }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }

  function formatDate(date = new Date()) {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  function getCurrentYear() {
    return new Date().getFullYear();
  }

  function getCurrentMonth() {
    return new Date().getMonth() + 1; // 1-indexed
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ── Expose ─────────────────────────────────────────────────
  return {
    init,
    switchScreen,
    showToast,
    getMeses,
    formatCurrency,
    formatDate,
    getCurrentYear,
    getCurrentMonth,
    generateId,
  };
})();

// Bootstrap app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
