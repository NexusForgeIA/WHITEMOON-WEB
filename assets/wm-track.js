/* WhiteMoon — Helper global de tracking GA4
 * Uso:
 *   wmTrack('whatsapp_click', {wm_source: 'spark', placement: 'hero'});
 *   wmTrack('click_solicitar_pack', {pack: 'spark'});
 *   wmTrack('newsletter_signup');
 *
 * gtag() es el shim de cookie-consent.js, que encola en dataLayer.
 * Cuando GA4 carga (consent default ya aplicado), procesa la cola.
 * Si el usuario ha rechazado analytics_storage, los eventos se envían
 * en modo cookieless (modeling). Si ha aceptado, se envían completos.
 *
 * Convención de eventos:
 *   - whatsapp_click          → outbound a wa.me
 *   - click_solicitar_pack    → CTA principal de pack (params: {pack})
 *   - lead_captured           → lead completo (nombre+teléfono) capturado por
 *                               un agente conversacional
 *   - newsletter_signup       → suscripción al newsletter del blog
 *   - roi_calculator_used     → uso de la calculadora ROI
 *
 * No-op si gtag no está disponible (cookie-consent.js bloqueado por
 * adblock, JS deshabilitado, etc.) — nunca rompe la UI.
 *
 * ATRIBUCIÓN — por qué existe RESERVED_TRAFFIC_PARAMS:
 *   GA4 trata source/medium/campaign/term/content (y campaign_id,
 *   source_platform, creative_format, marketing_tactic) como parámetros
 *   de atribución manual: si un evento los lleva, GA4 REESCRIBE la
 *   fuente/medio de la sesión con ese valor. Un `{source:'widget-flotante'}`
 *   en un evento de UI convertía el 75% de las sesiones en
 *   "widget-flotante / (not set)" — visitas infladas y atribución perdida.
 *   Aquí se renombran a `wm_*` antes de enviarlos: el dato de UI se
 *   conserva (como dimensión personalizada `wm_source`, `wm_medium`, …)
 *   y la atribución de GA4 deja de tocarse. Vale también para los
 *   onclick inline que siguen escribiendo `source:` en el HTML.
 */
(function () {
  'use strict';

  var RESERVED_TRAFFIC_PARAMS = [
    'source', 'medium', 'campaign', 'term', 'content',
    'campaign_id', 'source_platform', 'creative_format', 'marketing_tactic'
  ];

  function sanitize(params) {
    if (!params || typeof params !== 'object') return {};
    var out = {};
    for (var k in params) {
      if (!Object.prototype.hasOwnProperty.call(params, k)) continue;
      out[RESERVED_TRAFFIC_PARAMS.indexOf(k) === -1 ? k : 'wm_' + k] = params[k];
    }
    return out;
  }

  window.wmTrack = function (name, params) {
    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', name, sanitize(params));
      } catch (e) {
        // Silencioso: nunca interrumpir el flujo del usuario
      }
    }
  };

  /* ==========================================================
     whatsapp_click — listener delegado, una sola vez para todo el sitio
     ----------------------------------------------------------
     Hay ~520 enlaces a wa.me repartidos por 230 páginas: el footer de
     cada una, el lanzador flotante, los heroes, las landings de zona.
     Marcarlos uno a uno con onclick no escala y se vuelve a romper en
     cuanto nav_rebuild.py regenera un footer, así que el evento se emite
     desde aquí, delegando en document.

     Delegar cubre además los enlaces que no existen en el HTML: los tres
     de WhatsApp del panel de wm-launcher.js se inyectan en runtime.
     ========================================================== */

  // Clases y etiquetas que sitúan el enlace. Se mira el ancestro MÁS
  // CERCANO que dé señal: un .hero-actions dentro de <section class="hero">
  // resuelve igual, y un .cta-inline dentro de .art-body gana sobre el
  // artículo que lo contiene.
  function tokens(el) {
    var c = el.className;
    // En SVG className es un SVGAnimatedString, no una cadena.
    if (typeof c !== 'string') c = (el.getAttribute && el.getAttribute('class')) || '';
    return c.toLowerCase().split(/\s+/);
  }
  function some(list, fn) {
    for (var i = 0; i < list.length; i++) if (list[i] && fn(list[i])) return true;
    return false;
  }

  function placementOf(a) {
    // Estos dos se resuelven por contenedor y no por clase: son señal
    // inequívoca y evitan que gane una clase intermedia. El teléfono del
    // footer, por ejemplo, cuelga de .wm-foot__contact, que sin esto se
    // leería como 'contacto' en vez de 'footer'.
    if (a.closest('#wm-launcher')) return 'launcher';
    if (a.closest('footer')) return 'footer';

    for (var el = a; el && el !== document.body; el = el.parentElement) {
      var tag = el.tagName;
      var t = tokens(el);
      // El orden dentro de un mismo elemento importa: 'nav-cta' es
      // navegación, no CTA final, y <header class="hero"> es hero.
      if (some(t, function (x) { return x.indexOf('foot') !== -1; })) return 'footer';
      if (some(t, function (x) { return x.indexOf('hero') === 0; })) return 'hero';
      if (tag === 'NAV' || some(t, function (x) { return x.indexOf('nav') === 0 || x === 'topbar' || x === 'tb'; })) return 'nav';
      if (some(t, function (x) { return x.indexOf('cta') !== -1 || x.indexOf('cf-') === 0 || x === 'final'; })) return 'cta_final';
      if (some(t, function (x) { return x.indexOf('ct-') === 0 || x.indexOf('contact') !== -1; })) return 'contacto';
      if (some(t, function (x) { return x.indexOf('pack') === 0; })) return 'landing';
      if (tag === 'HEADER') return 'nav';
    }
    return 'otro';
  }

  // El producto que pide el enlace. El texto prellenado del wa.me es la
  // señal más fiable ("…me interesa Core Spark Web"); si no lo lleva, se
  // mira el texto visible. Core se comprueba antes que Spark porque
  // "Core Spark Web" contiene las dos palabras.
  function variantOf(a) {
    var hay = (a.getAttribute('href') || '');
    try { hay = decodeURIComponent(hay); } catch (e) { /* href mal codificado */ }
    hay = (hay + ' ' + (a.textContent || '')).toLowerCase();
    if (hay.indexOf('core') !== -1) return 'core';
    if (hay.indexOf('spark') !== -1) return 'spark';
    return 'generic';
  }

  // Un solo listener en document: coge los clics de cualquier <a> a
  // wa.me, incluidos los insertados después de cargar la página. No
  // llama a preventDefault ni espera a nada, así que la navegación sale
  // igual — y wa.me abre en pestaña o app aparte, con lo que el evento
  // no se queda a medias.
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    var a = t.closest('a[href*="wa.me"], a[href*="api.whatsapp.com/send"]');
    if (!a) return;
    window.wmTrack('whatsapp_click', {
      placement: placementOf(a),
      variant: variantOf(a)
    });
  }, true);
})();
