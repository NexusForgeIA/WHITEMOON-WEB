/* WhiteMoon · comportamiento de la navbar unificada.
 *
 * Se carga con `defer`, asi que el DOM ya existe cuando corre. No hay ningun
 * `onclick` inline en el markup del header: todo se engancha aqui, de forma
 * que si este archivo no llega (adblock, red) el header sigue siendo HTML
 * navegable — el desplegable de Productos abre igual por :hover/:focus-within
 * en CSS. Con este archivo cargado, el <nav> lleva .wm-nav--js y el
 * desplegable pasa a abrirse por clic (.is-open): el hover deja de mandar.
 *
 * LEGACY: /precios/ conserva el navbar anterior (CTA a la auditoria + enlace
 * secundario .wm-nav__meet) hasta que se borre en su fase. El tracking decide
 * por el destino del enlace, asi que sirve para los dos markups.
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
  nav.classList.add('wm-nav--js');

  var drawer = document.getElementById('wmDrawer');
  var burger = nav.querySelector('.wm-nav__burger');
  var dd = nav.querySelector('.wm-nav__dd');

  // ── Desplegable de Productos ─────────────────────────────────────────
  // Abierto = .is-open en el div; aria-expanded solo en el <button>.
  var ddBtn = dd ? dd.querySelector('button') : null;
  function setDd(open) {
    if (!dd) return;
    dd.classList.toggle('is-open', open);
    if (ddBtn) ddBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function closeDd() { setDd(false); }
  if (dd) {
    if (ddBtn) {
      ddBtn.addEventListener('click', function (e) {
        e.preventDefault();
        setDd(!dd.classList.contains('is-open'));
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
    if (dd && dd.classList.contains('is-open')) {
      closeDd();
      if (ddBtn) ddBtn.focus();
    }
    if (drawer && drawer.classList.contains('is-open')) toggleDrawer(false);
  });

  // ── Enlace activo ────────────────────────────────────────────────────
  var here = (location.pathname || '/').replace(/index\.html$/, '');
  if (here.slice(-1) !== '/') here += '/';
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
  // El desplegable se marca si la pagina actual es uno de sus destinos.
  if (dd) {
    var inMenu = false;
    Array.prototype.forEach.call(dd.querySelectorAll('.wm-nav__menu a'), function (a) {
      if (markCurrent(a)) inMenu = true;
    });
    if (inMenu) dd.classList.add('is-current');
  }

  // ── Tracking del CTA y del enlace secundario ─────────────────────────
  var slug = pageSlug();
  function isCal(el) {
    return /cal\.com\//.test(el.getAttribute('href') || '');
  }
  Array.prototype.forEach.call(
    document.querySelectorAll('.wm-nav__cta,.wm-drawer__cta,.wm-nav__meet,.wm-drawer__meet'),
    function (el) {
      el.addEventListener('click', function () {
        var inDrawer = el.classList.contains('wm-drawer__cta') || el.classList.contains('wm-drawer__meet');
        if (isCal(el)) {
          track('click_nav_meeting', { source: slug, placement: inDrawer ? 'drawer' : 'navbar' });
        } else {
          track('click_nav_cta', {
            source: slug,
            placement: inDrawer ? 'drawer' : 'navbar',
            destination: 'auditoria-geo-seo'
          });
        }
      });
    }
  );
})();
