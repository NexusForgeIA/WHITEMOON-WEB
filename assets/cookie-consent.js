/* WhiteMoon — consentimiento de cookies (RGPD/LOPD-GDD)
   Consent Mode V2 de Google (modo Advanced):
   · gtag.js se carga SIEMPRE, también para usuarios sin decisión o
     que rechazan analítica.
   · Estado de consentimiento por defecto: 'denied' (analytics_storage
     y ad_storage). Con denied, Google NO usa cookies; sólo envía
     pings sin identificadores para conversion modeling.
   · Si el usuario acepta -> gtag('consent','update', granted).
   · Decisión persistida en localStorage (clave wm_cookie_consent). */
(function () {
  'use strict';

  var GA_ID = 'G-D3BQ7674RX';
  var STORAGE_KEY = 'wm_cookie_consent'; // valores: 'all' | 'essential'

  function getConsent() {
    try { return window.localStorage.getItem(STORAGE_KEY); }
    catch (e) { return null; }
  }
  function setConsent(value) {
    try { window.localStorage.setItem(STORAGE_KEY, value); }
    catch (e) { /* navegación privada: la decisión sólo dura la sesión */ }
  }
  function clearConsent() {
    try { window.localStorage.removeItem(STORAGE_KEY); }
    catch (e) {}
  }

  // ---------- Consent Mode V2: bootstrap antes de cargar gtag.js ----------
  // dataLayer + shim de gtag(). Las llamadas se encolan hasta que
  // gtag.js esté disponible; gtag.js procesa la cola en orden.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // Estado default basado en la decisión previa guardada:
  //   'all'       -> analytics granted (visitante recurrente que aceptó)
  //   'essential' -> denied (visitante recurrente que rechazó analítica)
  //   null/otro   -> denied (primera visita; el banner se mostrará)
  // ad_storage se mantiene denied hasta accept (hoy no hay Google Ads;
  // queda forward-compatible para añadir remarketing en el futuro).
  var stored = getConsent();
  var defaultAnalytics = (stored === 'all') ? 'granted' : 'denied';
  var defaultAd        = (stored === 'all') ? 'granted' : 'denied';

  gtag('consent', 'default', {
    'analytics_storage': defaultAnalytics,
    'ad_storage':        defaultAd,
    'wait_for_update':   500
  });

  // Carga única de Google Analytics 4 (siempre, modo Advanced).
  // Con consent denied envía pings sin cookies; con granted, hits
  // completos. La transición denied->granted no requiere recarga.
  function loadGA() {
    if (window.__wmGALoaded) return;
    window.__wmGALoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, { 'send_page_view': true, 'transport_type': 'beacon' });
  }
  loadGA();

  // ---------- UI del banner ----------

  function injectStyles() {
    if (document.getElementById('wm-cookie-styles')) return;
    var css = ''
      + '#wm-cookie-banner{position:fixed;left:0;right:0;bottom:0;z-index:99999;'
      + 'background:#08080d;border-top:1px solid rgba(124,77,255,.35);'
      + 'box-shadow:0 -8px 32px rgba(0,0,0,.45);'
      + "font-family:'Sora',system-ui,-apple-system,sans-serif;animation:wmCookieUp .35s ease}"
      + '@keyframes wmCookieUp{from{transform:translateY(100%)}to{transform:translateY(0)}}'
      + '.wm-cookie-inner{max-width:1100px;margin:0 auto;padding:18px 22px;display:flex;'
      + 'align-items:center;gap:20px;flex-wrap:wrap;justify-content:space-between}'
      + '.wm-cookie-text{margin:0;color:#c8c8d8;font-size:.86rem;line-height:1.6;flex:1 1 420px}'
      + '.wm-cookie-text a{color:#7c4dff;text-decoration:underline}'
      + '.wm-cookie-actions{display:flex;gap:10px;flex-wrap:wrap}'
      + '.wm-cookie-btn{font-family:inherit;font-size:.85rem;font-weight:600;padding:11px 20px;'
      + 'border-radius:10px;cursor:pointer;border:1px solid transparent;'
      + 'transition:opacity .2s,background .2s,border-color .2s,color .2s}'
      + '.wm-cookie-essential{background:transparent;color:#c8c8d8;border-color:rgba(255,255,255,.22)}'
      + '.wm-cookie-essential:hover{border-color:rgba(255,255,255,.45);color:#fff}'
      + '.wm-cookie-accept{background:#7c4dff;color:#fff}'
      + '.wm-cookie-accept:hover{opacity:.88}'
      + '@media(max-width:600px){.wm-cookie-inner{flex-direction:column;align-items:stretch;'
      + 'gap:14px;padding:16px}.wm-cookie-actions{justify-content:stretch}.wm-cookie-btn{flex:1}}';
    var st = document.createElement('style');
    st.id = 'wm-cookie-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function removeBanner() {
    var b = document.getElementById('wm-cookie-banner');
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  function showBanner() {
    if (document.getElementById('wm-cookie-banner')) return;
    injectStyles();
    var banner = document.createElement('div');
    banner.id = 'wm-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Aviso de cookies');
    banner.innerHTML =
      '<div class="wm-cookie-inner">'
      + '<p class="wm-cookie-text">Usamos cookies técnicas necesarias y, con tu permiso, cookies de analítica '
      + '(Google Analytics 4) para entender cómo se usa la web. Puedes aceptarlas todas o continuar solo con las '
      + 'esenciales. Más información en nuestra <a href="/politica-cookies/">Política de Cookies</a>.</p>'
      + '<div class="wm-cookie-actions">'
      + '<button type="button" class="wm-cookie-btn wm-cookie-essential" id="wm-cookie-essential">Solo esenciales</button>'
      + '<button type="button" class="wm-cookie-btn wm-cookie-accept" id="wm-cookie-accept">Aceptar todas</button>'
      + '</div></div>';
    document.body.appendChild(banner);
    document.getElementById('wm-cookie-accept').addEventListener('click', acceptAll);
    document.getElementById('wm-cookie-essential').addEventListener('click', essentialOnly);
  }

  // ---------- Decisiones del usuario ----------

  function acceptAll() {
    setConsent('all');
    gtag('consent', 'update', {
      'analytics_storage': 'granted',
      'ad_storage':        'granted'
    });
    removeBanner();
  }
  function essentialOnly() {
    setConsent('essential');
    // analytics_storage y ad_storage permanecen 'denied':
    // GA sigue activo en modo cookieless (sólo modeling).
    removeBanner();
  }

  function init() {
    var consent = getConsent();
    if (consent === 'all' || consent === 'essential') {
      // Decisión previa ya aplicada vía el 'default' configurado
      // antes de cargar gtag.js. No mostrar banner.
    } else {
      showBanner();
    }
  }

  // ---------- API pública (botón "Cambiar mis preferencias") ----------

  window.wmCookieConsent = {
    accept: acceptAll,
    essential: essentialOnly,
    reset: function () {
      clearConsent();
      gtag('consent', 'update', {
        'analytics_storage': 'denied',
        'ad_storage':        'denied'
      });
      removeBanner();
      showBanner();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
