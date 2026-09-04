/* WhiteMoon · comportamiento de la navbar unificada.
 *
 * Se carga con `defer`, asi que el DOM ya existe cuando corre. No hay ningun
 * `onclick` inline en el markup del header: todo se engancha aqui, de forma
 * que si este archivo no llega (adblock, red) el header sigue siendo HTML
 * navegable — el desplegable de Servicios abre igual por :hover/:focus-within
 * en CSS y su primer enlace lleva a /servicios/.
 *
 * Tracking: usa window.wmTrack solo si existe (lo define wm-track.js, que
 * ademas renombra `source` a `wm_source` para no reescribir la atribucion
 * de GA4).
 */
(function () {
  'use strict';

  function track(name, params) {
    if (typeof window.wmTrack === 'function') {
      try { window.wmTrack(name, params); } catch (e) { /* nunca romper la UI */ }
    }
  }

  // Slug de la pagina, para saber desde donde se pulsa el CTA.
  function pageSlug() {
    var p = (location.pathname || '/').replace(/index\.html$/, '');
    p = p.replace(/^\/+|\/+$/g, '');
    return p || 'home';
  }

  var nav = document.querySelector('.wm-nav');
  if (!nav) return;

  var drawer = document.getElementById('wmDrawer');
  var burger = nav.querySelector('.wm-nav__burger');
  var dd = nav.querySelector('.wm-nav__dd');

  // ── Desplegable de Servicios ─────────────────────────────────────────
  function closeDd() {
    if (dd) dd.setAttribute('aria-expanded', 'false');
  }
  if (dd) {
    var ddBtn = dd.querySelector('button');
    if (ddBtn) {
      ddBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var open = dd.getAttribute('aria-expanded') !== 'true';
        dd.setAttribute('aria-expanded', open ? 'true' : 'false');
        ddBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.wm-nav__dd')) closeDd();
    });
  }

  // ── Cajon movil ──────────────────────────────────────────────────────
  function toggleDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var close = drawer.querySelector('.wm-drawer__close');
      if (close) close.focus();
    } else if (burger) {
      burger.focus();
    }
  }
  if (burger) burger.addEventListener('click', function () { toggleDrawer(true); });
  if (drawer) {
    var closeBtn = drawer.querySelector('.wm-drawer__close');
    if (closeBtn) closeBtn.addEventListener('click', function () { toggleDrawer(false); });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) toggleDrawer(false);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    closeDd();
    if (drawer && drawer.classList.contains('is-open')) toggleDrawer(false);
  });

  // ── Enlace activo ────────────────────────────────────────────────────
  var here = (location.pathname || '/').replace(/index\.html$/, '');
  if (here.slice(-1) !== '/') here += '/';
  // Rutas que cuelgan conceptualmente de "Servicios".
  var SERVICE_PATHS = [
    '/servicios/', '/orion/', '/orion-agent/', '/white-moon-system/',
    '/automatizacion-ventas/', '/atencion-cliente-ia/', '/coste-no-automatizar/',
    '/costes-eficiencia-empresarial-ia/', '/auditoria-geo-ia/', '/automatizaciones/',
    '/spark/', '/core/', '/core-orion/', '/core-rag/', '/mini-core/',
    '/whitemoon-360/', '/pack-ads/'
  ];
  function markCurrent(a) {
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) !== '/') return false;
    if (href !== here) return false;
    a.classList.add('is-current');
    a.setAttribute('aria-current', 'page');
    return true;
  }
  Array.prototype.forEach.call(
    document.querySelectorAll('.wm-nav__center>a,.wm-drawer__link'), markCurrent
  );
  if (dd && SERVICE_PATHS.indexOf(here) !== -1) dd.classList.add('is-current');

  // ── Tracking del CTA unico y del enlace secundario ───────────────────
  var slug = pageSlug();
  Array.prototype.forEach.call(
    document.querySelectorAll('.wm-nav__cta,.wm-drawer__cta'),
    function (el) {
      el.addEventListener('click', function () {
        track('click_nav_cta', {
          source: slug,
          placement: el.classList.contains('wm-drawer__cta') ? 'drawer' : 'navbar',
          destination: 'auditoria-geo-seo'
        });
      });
    }
  );
  Array.prototype.forEach.call(
    document.querySelectorAll('.wm-nav__meet,.wm-drawer__meet'),
    function (el) {
      el.addEventListener('click', function () {
        track('click_nav_meeting', {
          source: slug,
          placement: el.classList.contains('wm-drawer__meet') ? 'drawer' : 'navbar'
        });
      });
    }
  );
})();
