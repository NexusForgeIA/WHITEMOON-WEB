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
      window.wmTrack('click_open_orion', { wm_source: src });
    }
    const b = document.getElementById("luna-btn");
    if (b) b.click();
  });

  // -----------------------------------------------------------
  // 2) WhatsApp — SEGUNDA burbuja flotante.
  //     Es un enlace wa.me normal y corriente: abre la conversación
  //     con el 643 199 580 en pestaña nueva. Nada de API, ningún SDK
  //     y ninguna petición extra: va aquí dentro justamente para no
  //     añadir un fichero más a las 250 páginas, y este script ya
  //     viene diferido (scroll/interacción o 3 s), así que no toca
  //     el LCP.
  //
  //     Se coloca ENCIMA de la burbuja de Orion. La posición sale de
  //     las mismas variables (--orion-*) que usa el widget de voz, así
  //     que el hueco entre las dos burbujas está garantizado por
  //     construcción: cambiar un offset las mueve a la vez.
  //
  //     Va ANTES del early-return para que también aparezca en las
  //     páginas donde Orion venga renderizado inline; por eso las
  //     variables --orion-* se declaran aquí y no en el CSS del widget.
  // -----------------------------------------------------------
  (function injectWhatsApp() {
    if (document.getElementById("wm-wa-fab")) return;

    const TELEFONO = "34643199580";
    const MENSAJE = "Hola, quiero información sobre...";

    const waCss = `
      /* Geometría compartida de los dos flotantes de la esquina. */
      :root{
        --orion-right:28px;   /* separación al borde derecho */
        --orion-bottom:28px;  /* separación al borde inferior */
        --orion-btn:60px;     /* diámetro de las burbujas */
        --orion-gap:22px;     /* hueco libre entre ambas */
      }
      @media (max-width:599px){
        :root{ --orion-right:16px; --orion-bottom:20px; }
      }
      #wm-wa-fab{
        position:fixed; z-index:9997;
        right:var(--orion-right,28px);
        /* justo encima de la burbuja de Orion, con el hueco de rigor */
        bottom:calc(var(--orion-bottom,28px) + var(--orion-btn,60px) + var(--orion-gap,22px));
        width:var(--orion-btn,60px); height:var(--orion-btn,60px);
        border-radius:50%; display:grid; place-items:center;
        background:#0B0F17; border:1px solid rgba(37,211,102,.5);
        box-shadow:0 8px 28px rgba(0,0,0,.5);
        transition:transform .2s, border-color .2s, box-shadow .2s;
        -webkit-tap-highlight-color:transparent;
      }
      #wm-wa-fab:hover{ transform:translateY(-2px); border-color:#25D366; box-shadow:0 12px 32px rgba(0,0,0,.55),0 0 22px rgba(37,211,102,.3); }
      #wm-wa-fab:focus-visible{ outline:3px solid #25D366; outline-offset:3px; }
      #wm-wa-fab svg{ width:30px; height:30px; fill:#25D366; display:block; }
      @media (prefers-reduced-motion:reduce){
        #wm-wa-fab, #wm-wa-fab:hover{ transition:none; transform:none; }
      }
    `;
    const waStyle = document.createElement("style");
    waStyle.id = "wm-wa-fab-styles";
    waStyle.textContent = waCss;
    document.head.appendChild(waStyle);

    const wa = document.createElement("a");
    wa.id = "wm-wa-fab";
    wa.href = "https://wa.me/" + TELEFONO + "?text=" + encodeURIComponent(MENSAJE);
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    wa.setAttribute("aria-label", "Escríbenos por WhatsApp al 643 199 580");
    // Glifo oficial de WhatsApp.
    wa.innerHTML =
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>';

    wa.addEventListener("click", () => {
      // El parámetro va como `wm_source`: `source` es reservado en GA4 y
      // reescribiría la fuente de la sesión (ver assets/wm-track.js).
      if (typeof window.wmTrack === "function") {
        window.wmTrack("click_whatsapp_widget", {
          wm_source: location.pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "-") || "home",
        });
      }
    });

    const place = () => (document.body || document.documentElement).appendChild(wa);
    if (document.body) place();
    else document.addEventListener("DOMContentLoaded", place, { once: true });
  })();

  // Si el widget de voz ya está en el DOM, no inyectamos el resto.
  if (document.getElementById("luna-widget")) return;

  // -----------------------------------------------------------
  // 3) CSS — copia fiel del bloque inline en index.html.
  // -----------------------------------------------------------
  const css = `
    #luna-widget{
      position:fixed; bottom:var(--orion-bottom,28px); right:var(--orion-right,28px); z-index:9999;
      font-family:'Sora',sans-serif;
    }
    #luna-widget .luna-btn{
      position:relative; width:var(--orion-btn,60px); height:var(--orion-btn,60px); border-radius:50%;
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
    /* En móvil los offsets los cubren --orion-bottom/--orion-right. */
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
  widget.innerHTML = `<button type="button" id="luna-btn" class="luna-btn" aria-label="Hablar con Orion, agente de voz IA"><span class="luna-dot" aria-hidden="true"></span><img class="luna-ic" src="/assets/images/icono.webp" alt="WhiteMoon" width="32" height="32" aria-hidden="true" loading="lazy" decoding="async" style="border-radius:50%;object-fit:contain"><span class="luna-bars" id="luna-bars" aria-hidden="true"><span></span><span></span><span></span></span></button>`;
  document.body.appendChild(widget);

  // GA4: el widget flotante se ha inyectado y es visible por primera
  // vez en esta carga (este punto solo se alcanza una vez gracias al
  // guard __orionWidgetLoaded + el early-return si #luna-widget existe).
  // El parámetro va como `wm_source` a propósito: `source` es reservado
  // en GA4 y reescribía la fuente de la sesión (ver assets/wm-track.js).
  if (typeof window.wmTrack === 'function') {
    window.wmTrack('chatbot_bubble_visible', {
      wm_source: 'widget-flotante'
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
      btn.setAttribute("aria-label", "Finalizar conversación con Orion");
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
        wm_source: 'widget-flotante',
        placement: 'bottom-right'
      });
    }
    startCall();
  });
})();
