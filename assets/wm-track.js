/* WhiteMoon — Helper global de tracking GA4
 * Uso:
 *   wmTrack('whatsapp_click', {source: 'spark', placement: 'hero'});
 *   wmTrack('click_solicitar_pack', {pack: 'spark'});
 *   wmTrack('click_open_orion', {source: 'home'});
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
 *                               y el chatbot de reformas-madrid
 *   - newsletter_signup       → suscripción al newsletter del blog
 *   - roi_calculator_used     → uso de la calculadora ROI
 *
 * No-op si gtag no está disponible (cookie-consent.js bloqueado por
 * adblock, JS deshabilitado, etc.) — nunca rompe la UI.
 */
(function () {
  'use strict';
  window.wmTrack = function (name, params) {
    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', name, params || {});
      } catch (e) {
        // Silencioso: nunca interrumpir el flujo del usuario
      }
    }
  };
})();
