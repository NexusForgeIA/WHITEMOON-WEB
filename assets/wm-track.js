/* WhiteMoon — Helper global de tracking GA4
 * Uso:
 *   wmTrack('whatsapp_click', {wm_source: 'spark', placement: 'hero'});
 *   wmTrack('click_solicitar_pack', {pack: 'spark'});
 *   wmTrack('click_open_orion', {wm_source: 'home'});
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
 *   - click_open_orion        → apertura del widget Orion
 *   - lead_captured           → lead completo (nombre+teléfono) capturado por
 *                               un agente conversacional: Orion en whitemoon.es
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
})();
