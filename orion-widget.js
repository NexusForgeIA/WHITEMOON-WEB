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
  document.addEventListener("orion-open", () => {
    const b = document.getElementById("luna-btn");
    if (b) b.click();
  });

  // Si el widget ya está en el DOM, no inyectamos nada más.
  if (document.getElementById("luna-widget")) return;

  // -----------------------------------------------------------
  // 2) Preconnects (perf) — esm.sh para el SDK + Supabase edge.
  // -----------------------------------------------------------
  ["https://esm.sh", "https://mlaqtniujnvfxcvcourm.supabase.co"].forEach((href) => {
    const l = document.createElement("link");
    l.rel = "preconnect";
    l.href = href;
    document.head.appendChild(l);
  });

  // -----------------------------------------------------------
  // 3) CSS — copia fiel del bloque inline en index.html.
  // -----------------------------------------------------------
  const css = `
    #luna-widget{
      position:fixed; bottom:24px; right:24px; z-index:9998;
      width:280px; box-sizing:border-box;
      background:#111118; border:1px solid rgba(124,77,255,.4);
      border-radius:16px; box-shadow:0 8px 32px rgba(124,77,255,.28),0 4px 16px rgba(0,0,0,.4);
      padding:20px; font-family:'Sora',sans-serif;
      display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center;
    }
    #luna-widget .luna-avatar{ width:84px; height:84px; flex:none; }
    #luna-widget .luna-avatar svg{ width:100%; height:100%; display:block;
      transform-origin:center; animation:luna-breathe 3s ease-in-out infinite; }
    @keyframes luna-breathe{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} }
    #luna-widget .luna-name{ font-weight:600; font-size:18px; color:#f0f0f5; line-height:1.15; }
    #luna-widget .luna-sub{ font-weight:300; font-size:13px; color:#8888a0; line-height:1.2; }
    #luna-widget .luna-btn{
      width:100%; background:#7c4dff; color:#fff; border:none; border-radius:10px;
      padding:12px 24px; font-family:'Sora',sans-serif; font-weight:600; font-size:15px;
      cursor:pointer; transition:background .2s;
    }
    #luna-widget .luna-btn:hover{ background:#9d70ff; }
    #luna-widget .luna-btn:disabled{ opacity:.7; cursor:default; }
    #luna-widget .luna-btn.luna-btn--end{ background:#ff4444; }
    #luna-widget .luna-btn.luna-btn--end:hover{ background:#ff6666; }
    #luna-widget .luna-bars{ display:none; height:24px; gap:4px; align-items:flex-end; justify-content:center; }
    #luna-widget .luna-bars.is-active{ display:flex; }
    #luna-widget .luna-bars span{ width:5px; height:6px; background:#00d4aa; border-radius:3px; }
    #luna-widget .luna-bars.is-speaking span{ animation:luna-eq .9s ease-in-out infinite; }
    #luna-widget .luna-bars.is-speaking span:nth-child(2){ animation-delay:.15s; }
    #luna-widget .luna-bars.is-speaking span:nth-child(3){ animation-delay:.3s; }
    @keyframes luna-eq{ 0%,100%{height:6px} 50%{height:22px} }
    @media (max-width:599px){
      #luna-widget{ width:auto; bottom:80px; right:12px; padding:8px 10px;
        flex-direction:row; gap:8px; border-radius:30px; }
      #luna-widget .luna-avatar{ width:36px; height:36px; }
      #luna-widget .luna-info{ display:none; }
      #luna-widget .luna-btn{ width:auto; padding:8px 14px; font-size:13px; border-radius:20px; }
      #luna-widget .luna-bars{ height:18px; }
      #luna-widget .luna-bars span{ width:4px; }
    }
    @media (prefers-reduced-motion:reduce){
      #luna-widget .luna-avatar svg,
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
  widget.innerHTML = `
    <div class="luna-avatar">
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Orion IA">
        <defs>
          <clipPath id="lunaClip"><circle cx="60" cy="60" r="57"/></clipPath>
        </defs>
        <circle cx="60" cy="60" r="57" fill="#0d0d16" stroke="rgba(124,77,255,.45)" stroke-width="1.5"/>
        <g clip-path="url(#lunaClip)">
          <polygon points="60,10 46,30 74,30" fill="#6d3ff0"/>
          <polygon points="60,10 38,16 46,30" fill="#5e30d6"/>
          <polygon points="38,16 26,40 46,30" fill="#6d3ff0"/>
          <polygon points="26,40 44,52 46,30" fill="#7c4dff"/>
          <polygon points="26,40 28,70 44,52" fill="#5e30d6"/>
          <polygon points="28,70 50,74 44,52" fill="#6d3ff0"/>
          <polygon points="28,70 40,98 50,74" fill="#7c4dff"/>
          <polygon points="60,10 82,16 74,30" fill="#5e30d6"/>
          <polygon points="82,16 94,40 74,30" fill="#6d3ff0"/>
          <polygon points="94,40 76,52 74,30" fill="#7c4dff"/>
          <polygon points="94,40 92,70 76,52" fill="#5e30d6"/>
          <polygon points="92,70 70,74 76,52" fill="#6d3ff0"/>
          <polygon points="92,70 80,98 70,74" fill="#7c4dff"/>
          <polygon points="28,70 40,98 34,78" fill="#00d4aa" opacity=".85"/>
          <polygon points="92,70 80,98 86,78" fill="#00d4aa" opacity=".85"/>
          <polygon points="20,120 60,94 40,120" fill="#5e30d6"/>
          <polygon points="40,120 60,94 80,120" fill="#6d3ff0"/>
          <polygon points="80,120 60,94 100,120" fill="#7c4dff"/>
          <polygon points="53,80 67,80 64,96 56,96" fill="#a888ff"/>
          <polygon points="46,30 74,30 60,56" fill="#cbb8ff"/>
          <polygon points="74,30 76,52 60,56" fill="#b9a3ff"/>
          <polygon points="76,52 70,74 60,56" fill="#a888ff"/>
          <polygon points="70,74 60,86 60,56" fill="#b9a3ff"/>
          <polygon points="60,86 50,74 60,56" fill="#a888ff"/>
          <polygon points="50,74 44,52 60,56" fill="#b9a3ff"/>
          <polygon points="44,52 46,30 60,56" fill="#cbb8ff"/>
          <polygon points="50,50 57,47 54,55" fill="#00d4aa"/>
          <polygon points="70,50 63,47 66,55" fill="#00d4aa"/>
          <polygon points="55,78 65,78 60,83" fill="#7c4dff"/>
        </g>
      </svg>
    </div>
    <div class="luna-info">
      <div class="luna-name">Orion IA</div>
      <div class="luna-sub">Agente de voz WhiteMoon</div>
    </div>
    <div class="luna-bars" id="luna-bars" aria-hidden="true"><span></span><span></span><span></span></div>
    <button type="button" id="luna-btn" class="luna-btn">🎙️ Hablar con Orion</button>
  `;
  document.body.appendChild(widget);

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
      btn.textContent = isMobile() ? "🔴 Finalizar" : "🔴 Finalizar llamada";
      btn.classList.add("luna-btn--end");
      bars.classList.add("is-active");
    } else {
      btn.textContent = isMobile() ? "🎙️ Orion" : "🎙️ Hablar con Orion";
      btn.classList.remove("luna-btn--end");
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
    callActive ? endCall() : startCall();
  });
})();
