/* =============================================================
 *  orion-voz-live.js — Botón "Habla con Orion en vivo"
 * -------------------------------------------------------------
 *  Inicia una web call de voz de Retell desde cualquier botón
 *  con el atributo [data-orion-voz-live]. Reutiliza la misma
 *  Edge Function (retell-web-call) y el mismo agente que el
 *  widget flotante (orion-widget.js), pero con su propio estado
 *  visual ("Conectando…" / "Finalizar llamada") en el botón.
 *
 *  Uso:
 *    <button type="button" class="orion-voz-live-btn" data-orion-voz-live>
 *      🎙️ Habla con Orion en vivo →
 *    </button>
 *    <script src="/assets/orion-voz-live.js?v=YYYYMMDDNN" defer></script>
 * ============================================================= */
(() => {
  if (window.__orionVozLiveLoaded) return;
  window.__orionVozLiveLoaded = true;

  const RETELL_AGENT_ID = "agent_4517db737b3b64d809a6a372d3";
  const EDGE_URL = "https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/retell-web-call";
  const LABEL = "🎙️ Habla con Orion en vivo →";
  const FRIENDLY_ERR =
    "No se pudo iniciar la llamada de voz. Inténtalo desde un ordenador con micrófono o escríbenos al chat.";

  const buttons = Array.prototype.slice.call(
    document.querySelectorAll("[data-orion-voz-live]")
  );
  if (!buttons.length) return;

  // CSS del botón (verde · diferenciado del CTA de chat púrpura).
  const css = `
    .orion-voz-live-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
      background:var(--g,#00d4aa);color:#04211b;border:0;border-radius:12px;padding:14px 26px;
      font-family:inherit;font-weight:700;font-size:.96rem;line-height:1.1;cursor:pointer;
      box-shadow:0 12px 30px rgba(0,212,170,.30);transition:transform .12s ease,box-shadow .2s ease,opacity .2s,background .2s}
    .orion-voz-live-btn:hover{transform:translateY(-1px);box-shadow:0 16px 38px rgba(0,212,170,.42)}
    .orion-voz-live-btn:disabled{opacity:.75;cursor:default;transform:none}
    .orion-voz-live-btn.is-connecting{opacity:.85}
    .orion-voz-live-btn.is-live{background:#ff4444;color:#fff;box-shadow:0 12px 30px rgba(255,68,68,.32)}
  `;
  const styleEl = document.createElement("style");
  styleEl.id = "orion-voz-live-styles";
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  let client = null, callActive = false, busy = false, sdkPromise = null;

  function setLabel(t) { buttons.forEach((b) => { b.textContent = t; }); }
  function setDisabled(d) { buttons.forEach((b) => { b.disabled = d; }); }
  function setState(connecting, live) {
    buttons.forEach((b) => {
      b.classList.toggle("is-connecting", connecting);
      b.classList.toggle("is-live", live);
    });
  }

  function render() {
    if (callActive) { setLabel("🔴 Finalizar llamada"); setState(false, true); }
    else { setLabel(LABEL); setState(false, false); }
    setDisabled(false);
  }

  function loadSdk() {
    if (!sdkPromise) {
      sdkPromise = import("https://esm.sh/retell-client-js-sdk@2.0.7").catch((e) => {
        console.error("[orion-voz] no se pudo cargar el SDK de Retell", e);
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
      console.error("[orion-voz] SDK de Retell no disponible");
      return null;
    }
    try { client = new mod.RetellWebClient(); }
    catch (e) { console.error("[orion-voz] no se pudo crear RetellWebClient", e); return null; }
    client.on("call_started", () => { callActive = true; busy = false; render(); });
    client.on("call_ended", () => { callActive = false; busy = false; render(); });
    client.on("error", (err) => {
      console.error("[orion-voz] error en la llamada", err);
      const wasActive = callActive;
      try { client.stopCall(); } catch (_) {}
      callActive = false; busy = false; render();
      if (!wasActive) alert(FRIENDLY_ERR);
    });
    return client;
  }

  async function ensureMic() {
    if (!window.isSecureContext) throw new Error("contexto no seguro (se requiere HTTPS)");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("micrófono no soportado en este navegador");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop()); // liberar; el SDK lo volverá a pedir
  }

  async function startCall() {
    busy = true;
    setDisabled(true);
    setLabel("Conectando…");
    setState(true, false);
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
      // El evento "call_started" pondrá el estado en "Finalizar llamada".
    } catch (err) {
      console.error("[orion-voz] no se pudo iniciar la llamada", err);
      alert(FRIENDLY_ERR);
      callActive = false;
      render();
    } finally {
      busy = false;
      setDisabled(false);
    }
  }

  function endCall() {
    if (client) { try { client.stopCall(); } catch (e) { console.warn(e); } }
    callActive = false;
    render();
  }

  buttons.forEach((b) => {
    b.addEventListener("click", () => {
      if (busy) return;
      if (callActive) { endCall(); return; }
      if (typeof window.wmTrack === "function") window.wmTrack("click_orion_voz_live");
      startCall();
    });
  });

  render();
})();
