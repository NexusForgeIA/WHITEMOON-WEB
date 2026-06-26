/* =============================================================
 *  orion-widget.js — WhiteMoon Orion IA (agente de voz Retell)
 * -------------------------------------------------------------
 *  Widget flotante autocontenido para landings.
 *  - Inyecta CSS + HTML + cliente Retell.
 *  - Escucha el evento `orion-open` en `document` para abrir
 *    la llamada desde cualquier CTA externo:
 *      document.dispatchEvent(new CustomEvent('orion-open'));
 *  - Idempotente: si #luna-widget ya existe (p. ej. inline en
 *    index.html), solo registra el listener y sale.
 *
 *  Para usar en una landing:
 *      <script src="/orion-widget.js?v=YYYYMMDDNN" defer></script>
 * ============================================================= */
(() => {
  if (window.__orionWidgetLoaded) return;
  window.__orionWidgetLoaded = true;

  const RETELL_AGENT_ID = "agent_4517db737b3b64d809a6a372d3";
  const EDGE_URL = "https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/retell-web-call";

  // -----------------------------------------------------------
  // 1) Listener `orion-open` — siempre activo, incluso si el
  //    widget vino renderizado inline (caso index.html futuro).
  // -----------------------------------------------------------
  document.addEventListener("orion-open", (e) => {
    // GA4: trackear apertura del widget. Si no hay source en detail,
    // intentamos derivar de la ruta actual; si no, 'unknown'.
    var src = (e && e.detail && e.detail.source) ||
              (location.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'home');
    if (typeof window.wmTrack === 'function') {
      window.wmTrack('click_open_orion', { source: src });
    }
    const b = document.getElementById("luna-btn");
    if (b) b.click();
  });

  // Si el widget ya está en el DOM, no inyectamos nada más.
  if (document.getElementById("luna-widget")) return;

  // -----------------------------------------------------------
  // 3) CSS — copia fiel del bloque inline en index.html.
  // -----------------------------------------------------------
  const css = `
    #luna-widget{
      position:fixed; bottom:28px; right:28px; z-index:9999;
      font-family:'Sora',sans-serif;
    }
    #luna-widget .luna-btn{
      position:relative; width:60px; height:60px; border-radius:50%;
      background:#7c4dff; color:#fff; border:none; padding:0; cursor:pointer;
      display:grid; place-items:center;
      box-shadow:0 8px 28px rgba(124,77,255,.45),0 4px 14px rgba(0,0,0,.4);
      transition:background .2s, transform .2s, box-shadow .2s;
    }
    #luna-widget .luna-btn:hover{ background:#9d70ff; transform:translateY(-2px); box-shadow:0 12px 34px rgba(124,77,255,.55),0 4px 14px rgba(0,0,0,.4); }
    #luna-widget .luna-btn:disabled{ opacity:.7; cursor:default; }
    #luna-widget .luna-btn.luna-btn--end{ background:#ff4444; }
    #luna-widget .luna-btn.luna-btn--end:hover{ background:#ff6666; }
    #luna-widget .luna-ic{ width:26px; height:26px; color:#fff; }
    #luna-widget .luna-btn.luna-btn--end .luna-ic{ display:none; }
    /* dot verde pulsante */
    #luna-widget .luna-dot{
      position:absolute; top:3px; right:3px; width:13px; height:13px;
      border-radius:50%; background:#00d4aa; border:2px solid #111118;
      animation:luna-pulse 2s ease-in-out infinite;
    }
    #luna-widget .luna-btn.luna-btn--end .luna-dot{ display:none; }
    @keyframes luna-pulse{ 0%{box-shadow:0 0 0 0 rgba(0,212,170,.6)} 70%{box-shadow:0 0 0 9px rgba(0,212,170,0)} 100%{box-shadow:0 0 0 0 rgba(0,212,170,0)} }
    /* barras durante la llamada */
    #luna-widget .luna-bars{ display:none; position:absolute; inset:0; align-items:center; justify-content:center; gap:3px; }
    #luna-widget .luna-btn.luna-btn--end .luna-bars,
    #luna-widget .luna-bars.is-active{ display:flex; }
    #luna-widget .luna-bars span{ width:4px; height:8px; background:#fff; border-radius:2px; }
    #luna-widget .luna-btn.luna-btn--end .luna-bars span,
    #luna-widget .luna-bars.is-speaking span{ animation:luna-eq .9s ease-in-out infinite; }
    #luna-widget .luna-bars span:nth-child(2){ animation-delay:.15s; }
    #luna-widget .luna-bars span:nth-child(3){ animation-delay:.3s; }
    @keyframes luna-eq{ 0%,100%{height:8px} 50%{height:22px} }
    @media (max-width:599px){
      #luna-widget{ bottom:20px; right:16px; }
    }
    @media (prefers-reduced-motion:reduce){
      #luna-widget .luna-dot,
      #luna-widget .luna-btn.luna-btn--end .luna-bars span,
      #luna-widget .luna-bars.is-speaking span{ animation:none; }
    }
  `;
  const styleEl = document.createElement("style");
  styleEl.id = "orion-widget-styles";
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // -----------------------------------------------------------
  // 4) HTML del widget — copia fiel.
  // -----------------------------------------------------------
  const widget = document.createElement("div");
  widget.id = "luna-widget";
  widget.setAttribute("role", "complementary");
  widget.setAttribute("aria-label", "Asistente de voz Orion IA");
  widget.innerHTML = `<button type="button" id="luna-btn" class="luna-btn" aria-label="Hablar con Orion, agente de voz IA"><span class="luna-dot" aria-hidden="true"></span><svg class="luna-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg><span class="luna-bars" id="luna-bars" aria-hidden="true"><span></span><span></span><span></span></span></button>`;
  document.body.appendChild(widget);

  // GA4: el widget flotante se ha inyectado y es visible por primera
  // vez en esta carga (este punto solo se alcanza una vez gracias al
  // guard __orionWidgetLoaded + el early-return si #luna-widget existe).
  if (typeof window.wmTrack === 'function') {
    window.wmTrack('chatbot_bubble_visible', {
      source: 'widget-flotante'
    });
  }

  // -----------------------------------------------------------
  // 5) Cliente Retell — importación dinámica del SDK.
  //    El SDK externaliza livekit-client y eventemitter3 en su
  //    build UMD, por lo que el <script> de unpkg no funciona
  //    suelto. esm.sh resuelve y empaqueta las dependencias.
  // -----------------------------------------------------------
  const btn = document.getElementById("luna-btn");
  const bars = document.getElementById("luna-bars");

  let client = null, callActive = false, busy = false;
  const isMobile = () => window.matchMedia("(max-width:599px)").matches;

  function render() {
    if (callActive) {
      btn.classList.add("luna-btn--end");
      btn.setAttribute("aria-label", "Finalizar llamada con Orion");
      bars.classList.add("is-active");
    } else {
      btn.classList.remove("luna-btn--end");
      btn.setAttribute("aria-label", "Hablar con Orion, agente de voz IA");
      bars.classList.remove("is-active", "is-speaking");
    }
  }
  window.addEventListener("resize", render);
  render();

  const FRIENDLY_ERR =
    "No se pudo iniciar la llamada. Por favor, inténtalo desde un ordenador o escríbenos al chat.";

  let sdkPromise = null;
  function loadSdk() {
    if (!sdkPromise) {
      sdkPromise = import("https://esm.sh/retell-client-js-sdk@2.0.7").catch((e) => {
        console.error("[orion] no se pudo cargar el SDK de Retell", e);
        sdkPromise = null;
        return null;
      });
    }
    return sdkPromise;
  }

  async function ensureClient() {
    if (client) return client;
    const mod = await loadSdk();
    if (!mod || !mod.RetellWebClient) {
      console.error("[orion] SDK de Retell no disponible");
      return null;
    }
    try { client = new mod.RetellWebClient(); }
    catch (e) { console.error("[orion] no se pudo crear RetellWebClient", e); return null; }
    client.on("call_started", () => { callActive = true; busy = false; render(); });
    client.on("call_ended", () => { callActive = false; busy = false; render(); });
    client.on("agent_start_talking", () => bars.classList.add("is-speaking"));
    client.on("agent_stop_talking", () => bars.classList.remove("is-speaking"));
    client.on("error", (err) => {
      console.error("[orion] error en la llamada", err);
      const wasActive = callActive;
      try { client.stopCall(); } catch (_) {}
      callActive = false; busy = false; render();
      if (!wasActive) alert(FRIENDLY_ERR);
    });
    return client;
  }

  // El permiso de micrófono / contexto seguro es la causa más
  // común de fallo en móvil.
  async function ensureMic() {
    if (!window.isSecureContext) throw new Error("contexto no seguro (se requiere HTTPS)");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("micrófono no soportado en este navegador");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop()); // liberar; el SDK lo volverá a pedir
  }

  async function startCall() {
    busy = true; btn.disabled = true;
    try {
      const c = await ensureClient();
      if (!c) { alert(FRIENDLY_ERR); return; }
      await ensureMic();
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: RETELL_AGENT_ID }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.access_token) throw new Error(data.error || "sin access_token");
      await c.startCall({ accessToken: data.access_token });
    } catch (err) {
      console.error("[orion] no se pudo iniciar la llamada", err);
      alert(FRIENDLY_ERR);
      callActive = false; render();
    } finally {
      busy = false; btn.disabled = false;
    }
  }

  function endCall() {
    if (client) { try { client.stopCall(); } catch (e) { console.warn(e); } }
    callActive = false; render();
  }

  btn.addEventListener("click", () => {
    if (busy) return;
    if (callActive) {
      endCall();
      return;
    }
    // GA4: apertura de Orion desde el clic directo al botón flotante
    // (los CTAs externos ya trackean vía el listener `orion-open`).
    if (typeof window.wmTrack === 'function') {
      window.wmTrack('click_open_orion', {
        source: 'widget-flotante',
        placement: 'bottom-right'
      });
    }
    startCall();
  });
})();
