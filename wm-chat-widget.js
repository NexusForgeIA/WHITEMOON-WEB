/* =============================================================
 *  wm-chat-widget.js — Chat IA de texto (RAG de whitemoon.es)
 * -------------------------------------------------------------
 *  SEGUNDA burbuja flotante del sitio. Convive con Orion (voz,
 *  Retell) sin tocarlo: Orion sigue siendo #luna-widget +
 *  #orion-cta-fab, y este widget se apila ENCIMA del pill.
 *
 *  Geometría — por qué no hay números mágicos:
 *  orion-widget.js publica su geometría en variables CSS
 *  (--orion-right/-bottom/-btn/-gap). Esta burbuja se coloca a
 *  partir de ellas más la altura REAL del pill, medida en runtime
 *  con ResizeObserver. Si el pill cambia de tamaño (dos líneas en
 *  una pantalla estrecha, otro texto), la burbuja se aparta sola:
 *  no pueden solaparse por construcción.
 *
 *  Captura de lead: form explícito, no adivinar datos del texto
 *  del modelo. El bot invita a pulsar "Que te llamen"; el widget
 *  manda nombre + teléfono + transcripción a wm-rag-lead, que
 *  inserta en leads_web (origen 'rag-web') y avisa. El navegador
 *  no ve ninguna clave.
 *
 *  Carga: la inyecta orion-widget.js, que ya va diferida al primer
 *  scroll/interacción o a los 3 s. No toca el LCP.
 * ============================================================= */
(() => {
  if (window.__wmChatWidgetLoaded) return;
  window.__wmChatWidgetLoaded = true;

  const CHAT_URL = "https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/wm-rag-chat";
  const LEAD_URL = "https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/wm-rag-lead";

  const SALUDO =
    "Hola. Soy el asistente de WhiteMoon: respondo con la información de esta web. " +
    "Pregúntame por packs, precios, plazos o cómo funciona un agente IA.";

  const SUGERENCIAS = ["¿Qué packs tenéis?", "¿Cuánto cuesta un agente IA?", "¿Hay permanencia?"];

  // ─────────────────────────────────────────────────────────────
  // Estilos
  // ─────────────────────────────────────────────────────────────
  const css = `
  #wm-chat-fab{
    position:fixed; z-index:9997;
    right:var(--orion-right,28px);
    /* burbuja Orion + hueco + pill Orion (+su hueco, medido en JS) */
    bottom:calc(var(--orion-bottom,28px) + var(--orion-btn,60px) + var(--orion-gap,22px) + var(--wm-chat-pill,60px));
    width:var(--orion-btn,60px); height:var(--orion-btn,60px);
    border:0; border-radius:50%; padding:0; cursor:pointer;
    display:grid; place-items:center;
    background:#0B0F17; color:#f0f0f5;
    border:1px solid rgba(157,112,255,.55);
    box-shadow:0 8px 28px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.04) inset;
    transition:transform .2s, border-color .2s, box-shadow .2s;
  }
  #wm-chat-fab:hover{ transform:translateY(-2px); border-color:#9d70ff; box-shadow:0 12px 32px rgba(0,0,0,.55),0 0 22px rgba(124,77,255,.35); }
  #wm-chat-fab:focus-visible{ outline:3px solid #9d70ff; outline-offset:3px; }
  #wm-chat-fab svg{ width:25px; height:25px; }
  #wm-chat-fab .wmc-badge{
    position:absolute; top:2px; right:2px; width:12px; height:12px;
    border-radius:50%; background:#00d4aa; border:2px solid #0B0F17;
  }
  #wm-chat-fab[aria-expanded="true"] .wmc-badge{ display:none; }

  #wm-chat-panel{
    position:fixed; z-index:10000;
    right:var(--orion-right,28px);
    bottom:calc(var(--orion-bottom,28px) + var(--orion-btn,60px) + var(--orion-gap,22px) + var(--wm-chat-pill,60px) + var(--orion-btn,60px) + 14px);
    width:min(384px, calc(100vw - 32px));
    max-height:min(560px, calc(100vh - var(--orion-bottom,28px) - var(--orion-btn,60px)*2 - var(--wm-chat-pill,60px) - 60px));
    display:none; flex-direction:column; overflow:hidden;
    background:#0B0F17; color:#f0f0f5;
    border:1px solid rgba(255,255,255,.09); border-radius:16px;
    box-shadow:0 24px 64px rgba(0,0,0,.6);
    font-family:'Inter',system-ui,-apple-system,sans-serif;
  }
  #wm-chat-panel.is-open{ display:flex; }

  .wmc-head{
    display:flex; align-items:center; gap:11px; padding:15px 15px 13px;
    border-bottom:1px solid rgba(255,255,255,.08); background:#0d121c;
  }
  .wmc-head-ic{ width:34px; height:34px; border-radius:9px; display:grid; place-items:center; background:rgba(124,77,255,.16); border:1px solid rgba(157,112,255,.4); flex:0 0 auto; }
  .wmc-head-ic svg{ width:17px; height:17px; color:#9d70ff; }
  .wmc-head-tx{ flex:1; min-width:0; }
  .wmc-head-tx strong{ display:block; font-family:'Sora',system-ui,sans-serif; font-size:.93rem; font-weight:600; letter-spacing:-.01em; }
  .wmc-head-tx span{ display:block; font-size:.74rem; color:#8888a0; margin-top:2px; }
  .wmc-x{ background:none; border:0; color:#8888a0; cursor:pointer; padding:6px; border-radius:7px; line-height:0; }
  .wmc-x:hover{ color:#f0f0f5; background:rgba(255,255,255,.07); }
  .wmc-x:focus-visible{ outline:2px solid #9d70ff; outline-offset:1px; }
  .wmc-x svg{ width:16px; height:16px; }

  .wmc-log{ flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column; gap:11px; scroll-behavior:smooth; }
  .wmc-msg{ max-width:88%; padding:10px 13px; border-radius:13px; font-size:.875rem; line-height:1.55; white-space:pre-wrap; overflow-wrap:anywhere; }
  .wmc-msg.bot{ align-self:flex-start; background:#161d2b; border:1px solid rgba(255,255,255,.06); border-bottom-left-radius:4px; }
  .wmc-msg.user{ align-self:flex-end; background:#7c4dff; color:#fff; border-bottom-right-radius:4px; }
  .wmc-msg.err{ align-self:flex-start; background:rgba(255,90,90,.12); border:1px solid rgba(255,90,90,.32); color:#ffb3b3; }
  /* --p (#7c4dff) no llega a AA sobre fondo oscuro; para texto va --p2. */
  .wmc-fuentes{ align-self:flex-start; font-size:.73rem; color:#8888a0; padding-left:3px; }
  .wmc-fuentes a{ color:#9d70ff; text-decoration:none; border-bottom:1px solid rgba(157,112,255,.35); }
  .wmc-fuentes a:hover{ border-bottom-color:#9d70ff; }

  .wmc-typing{ align-self:flex-start; display:flex; gap:4px; padding:12px 14px; background:#161d2b; border-radius:13px; border-bottom-left-radius:4px; }
  .wmc-typing i{ width:6px; height:6px; border-radius:50%; background:#8888a0; animation:wmc-blink 1.3s infinite; }
  .wmc-typing i:nth-child(2){ animation-delay:.18s; }
  .wmc-typing i:nth-child(3){ animation-delay:.36s; }
  @keyframes wmc-blink{ 0%,60%,100%{opacity:.28} 30%{opacity:1} }

  .wmc-chips{ display:flex; flex-wrap:wrap; gap:6px; padding:0 15px 11px; }
  .wmc-chip{ font-family:inherit; font-size:.775rem; color:#c9c9db; background:#141a26; border:1px solid rgba(255,255,255,.1); border-radius:999px; padding:6px 11px; cursor:pointer; }
  .wmc-chip:hover{ border-color:#9d70ff; color:#fff; }
  .wmc-chip:focus-visible{ outline:2px solid #9d70ff; outline-offset:1px; }

  .wmc-foot{ border-top:1px solid rgba(255,255,255,.08); padding:11px 12px; background:#0d121c; }
  .wmc-form{ display:flex; gap:8px; align-items:flex-end; }
  .wmc-in{
    flex:1; resize:none; max-height:90px; min-height:40px;
    font-family:inherit; font-size:.86rem; line-height:1.45; color:#f0f0f5;
    background:#141a26; border:1px solid rgba(255,255,255,.12); border-radius:10px; padding:10px 12px;
  }
  .wmc-in::placeholder{ color:#6e6e86; }
  .wmc-in:focus{ outline:none; border-color:#9d70ff; box-shadow:0 0 0 3px rgba(124,77,255,.2); }
  .wmc-send{ flex:0 0 auto; width:40px; height:40px; border:0; border-radius:10px; background:#7c4dff; color:#fff; cursor:pointer; display:grid; place-items:center; }
  .wmc-send:hover:not(:disabled){ background:#9d70ff; }
  .wmc-send:disabled{ opacity:.45; cursor:default; }
  .wmc-send:focus-visible{ outline:2px solid #fff; outline-offset:2px; }
  .wmc-send svg{ width:17px; height:17px; }
  .wmc-cta{
    display:block; width:100%; margin-top:8px; padding:9px;
    font-family:'Sora',system-ui,sans-serif; font-size:.79rem; font-weight:600;
    color:#9d70ff; background:transparent; border:1px solid rgba(157,112,255,.4);
    border-radius:9px; cursor:pointer;
  }
  .wmc-cta:hover{ background:rgba(124,77,255,.12); color:#fff; }
  .wmc-cta:focus-visible{ outline:2px solid #9d70ff; outline-offset:1px; }

  .wmc-lead{ display:none; flex-direction:column; gap:8px; }
  .wmc-lead.is-open{ display:flex; }
  .wmc-lead p{ margin:0 0 2px; font-size:.78rem; color:#8888a0; }
  .wmc-lead input{
    font-family:inherit; font-size:.86rem; color:#f0f0f5;
    background:#141a26; border:1px solid rgba(255,255,255,.12); border-radius:10px; padding:10px 12px;
  }
  .wmc-lead input:focus{ outline:none; border-color:#9d70ff; box-shadow:0 0 0 3px rgba(124,77,255,.2); }
  .wmc-lead-row{ display:flex; gap:8px; }
  .wmc-lead-row button{ flex:1; font-family:'Sora',system-ui,sans-serif; font-size:.8rem; font-weight:600; border-radius:9px; padding:10px; cursor:pointer; border:0; }
  .wmc-ok{ background:#7c4dff; color:#fff; }
  .wmc-ok:hover:not(:disabled){ background:#9d70ff; }
  .wmc-ok:disabled{ opacity:.5; cursor:default; }
  .wmc-cancel{ background:transparent; color:#8888a0; border:1px solid rgba(255,255,255,.12) !important; }
  .wmc-cancel:hover{ color:#f0f0f5; }
  .wmc-lead-row button:focus-visible{ outline:2px solid #9d70ff; outline-offset:1px; }

  .wmc-legal{ font-size:.68rem; color:#6e6e86; text-align:center; margin:7px 0 0; }
  .wmc-legal a{ color:#8888a0; }

  /* Móvil: hoja casi completa. Así el panel no depende de la altura
     de la columna de flotantes y nunca queda debajo del teclado. */
  @media (max-width:599px){
    #wm-chat-panel{
      right:8px; left:8px; top:8px; bottom:8px;
      width:auto; max-height:none; border-radius:14px;
    }
  }
  @media (prefers-reduced-motion:reduce){
    #wm-chat-fab, #wm-chat-fab:hover{ transition:none; transform:none; }
    .wmc-typing i{ animation:none; opacity:.6; }
    .wmc-log{ scroll-behavior:auto; }
  }`;

  const st = document.createElement("style");
  st.id = "wm-chat-widget-styles";
  st.textContent = css;
  document.head.appendChild(st);

  // ─────────────────────────────────────────────────────────────
  // DOM
  // ─────────────────────────────────────────────────────────────
  const IC_CHAT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

  const fab = document.createElement("button");
  fab.type = "button";
  fab.id = "wm-chat-fab";
  fab.setAttribute("aria-label", "Abrir el chat con el asistente IA de WhiteMoon");
  fab.setAttribute("aria-expanded", "false");
  fab.setAttribute("aria-controls", "wm-chat-panel");
  fab.innerHTML = '<span class="wmc-badge" aria-hidden="true"></span>' + IC_CHAT;

  const panel = document.createElement("div");
  panel.id = "wm-chat-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-label", "Chat con el asistente IA de WhiteMoon");
  panel.innerHTML =
    '<div class="wmc-head">' +
      '<span class="wmc-head-ic" aria-hidden="true">' + IC_CHAT + '</span>' +
      '<span class="wmc-head-tx"><strong>Asistente WhiteMoon</strong><span>Responde con la información de esta web</span></span>' +
      '<button type="button" class="wmc-x" id="wmc-close" aria-label="Cerrar el chat">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="wmc-log" id="wmc-log" role="log" aria-live="polite" aria-atomic="false"></div>' +
    '<div class="wmc-chips" id="wmc-chips"></div>' +
    '<div class="wmc-foot">' +
      '<form class="wmc-form" id="wmc-form">' +
        '<label class="wmc-sr" for="wmc-in" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Escribe tu pregunta</label>' +
        '<textarea class="wmc-in" id="wmc-in" rows="1" placeholder="Escribe tu pregunta..." maxlength="1000" autocomplete="off"></textarea>' +
        '<button type="submit" class="wmc-send" id="wmc-send" aria-label="Enviar pregunta">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>' +
        '</button>' +
      '</form>' +
      '<button type="button" class="wmc-cta" id="wmc-cta">Que te llamen del Departamento Comercial</button>' +
      '<form class="wmc-lead" id="wmc-lead">' +
        '<p>Dejas tus datos y el Departamento Comercial se pone en contacto contigo.</p>' +
        '<label for="wmc-nombre" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Nombre</label>' +
        '<input id="wmc-nombre" name="nombre" type="text" placeholder="Tu nombre" maxlength="120" autocomplete="name" required>' +
        '<label for="wmc-tel" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Teléfono</label>' +
        '<input id="wmc-tel" name="telefono" type="tel" placeholder="Tu teléfono" maxlength="40" autocomplete="tel" inputmode="tel" required>' +
        '<div class="wmc-lead-row">' +
          '<button type="submit" class="wmc-ok" id="wmc-lead-ok">Enviar</button>' +
          '<button type="button" class="wmc-cancel" id="wmc-lead-cancel">Cancelar</button>' +
        '</div>' +
        '<p class="wmc-legal">Al enviar aceptas la <a href="/politica-privacidad/">política de privacidad</a>.</p>' +
      '</form>' +
    '</div>';

  const place = () => {
    const host = document.body || document.documentElement;
    host.appendChild(fab);
    host.appendChild(panel);
    init();
  };
  if (document.body) place();
  else document.addEventListener("DOMContentLoaded", place, { once: true });

  // ─────────────────────────────────────────────────────────────
  // Lógica
  // ─────────────────────────────────────────────────────────────
  function init() {
    const log = panel.querySelector("#wmc-log");
    const chips = panel.querySelector("#wmc-chips");
    const form = panel.querySelector("#wmc-form");
    const input = panel.querySelector("#wmc-in");
    const send = panel.querySelector("#wmc-send");
    const btnClose = panel.querySelector("#wmc-close");
    const btnCta = panel.querySelector("#wmc-cta");
    const leadForm = panel.querySelector("#wmc-lead");
    const leadNombre = panel.querySelector("#wmc-nombre");
    const leadTel = panel.querySelector("#wmc-tel");
    const leadOk = panel.querySelector("#wmc-lead-ok");
    const leadCancel = panel.querySelector("#wmc-lead-cancel");

    const historial = [];
    let abierto = false, enviando = false, saludado = false;

    // ── Geometría: la altura real del pill de Orion ──────────────
    // Es lo que separa esta burbuja del flotante de abajo. Medirla en
    // vez de fijarla evita que un cambio en orion-widget.js las junte.
    function sincronizarPila() {
      const pill = document.getElementById("orion-cta-fab");
      // Oculto durante una llamada de Orion: mantenemos su hueco para
      // que la burbuja no salte de sitio a mitad de conversación.
      const alto = pill ? Math.round(pill.getBoundingClientRect().height) || 42 : 0;
      document.documentElement.style.setProperty("--wm-chat-pill", alto ? alto + 18 + "px" : "0px");
    }
    sincronizarPila();
    window.addEventListener("resize", sincronizarPila, { passive: true });
    const pill = document.getElementById("orion-cta-fab");
    if (pill && window.ResizeObserver) new ResizeObserver(sincronizarPila).observe(pill);

    // ── Pintado ──────────────────────────────────────────────────
    const scroll = () => { log.scrollTop = log.scrollHeight; };

    // El system prompt pide texto plano, pero el modelo cuela markdown
    // de vez en cuando y aquí se pinta con textContent (a propósito: nada
    // de innerHTML con texto de un LLM). Sin esto se leen los asteriscos.
    function aPlano(t) {
      return String(t)
        .replace(/\*\*(.+?)\*\*/gs, "$1")
        .replace(/__(.+?)__/gs, "$1")
        .replace(/(^|[\s(])\*(\S(?:.*?\S)?)\*(?=[\s.,;:!?)]|$)/gs, "$1$2")
        .replace(/`{1,3}([^`]+)`{1,3}/gs, "$1")
        .replace(/^\s*#{1,6}\s+/gm, "")
        .trim();
    }

    function burbuja(texto, clase) {
      const d = document.createElement("div");
      d.className = "wmc-msg " + clase;
      d.textContent = clase === "bot" ? aPlano(texto) : texto;
      log.appendChild(d);
      scroll();
      return d;
    }

    function pintarFuentes(rutas) {
      if (!rutas || !rutas.length) return;
      const d = document.createElement("div");
      d.className = "wmc-fuentes";
      d.appendChild(document.createTextNode("Fuente: "));
      rutas.slice(0, 2).forEach((r, i) => {
        if (i) d.appendChild(document.createTextNode(" · "));
        const a = document.createElement("a");
        a.href = r; a.textContent = r;
        d.appendChild(a);
      });
      log.appendChild(d);
      scroll();
    }

    function escribiendo(on) {
      const prev = log.querySelector(".wmc-typing");
      if (prev) prev.remove();
      if (!on) return;
      const d = document.createElement("div");
      d.className = "wmc-typing";
      d.setAttribute("aria-label", "El asistente está escribiendo");
      d.innerHTML = "<i></i><i></i><i></i>";
      log.appendChild(d);
      scroll();
    }

    function pintarChips() {
      chips.innerHTML = "";
      SUGERENCIAS.forEach((t) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "wmc-chip";
        b.textContent = t;
        b.addEventListener("click", () => { chips.innerHTML = ""; preguntar(t); });
        chips.appendChild(b);
      });
    }

    // ── Apertura / cierre ────────────────────────────────────────
    function abrir() {
      abierto = true;
      panel.classList.add("is-open");
      fab.setAttribute("aria-expanded", "true");
      fab.setAttribute("aria-label", "Cerrar el chat con el asistente IA de WhiteMoon");
      if (!saludado) {
        saludado = true;
        burbuja(SALUDO, "bot");
        pintarChips();
        if (typeof window.wmTrack === "function") {
          window.wmTrack("chat_rag_abierto", { wm_source: "widget-chat" });
        }
      }
      setTimeout(() => input.focus(), 40);
    }

    function cerrar(devolverFoco) {
      abierto = false;
      panel.classList.remove("is-open");
      fab.setAttribute("aria-expanded", "false");
      fab.setAttribute("aria-label", "Abrir el chat con el asistente IA de WhiteMoon");
      if (devolverFoco !== false) fab.focus();
    }

    fab.addEventListener("click", () => (abierto ? cerrar() : abrir()));
    btnClose.addEventListener("click", () => cerrar());

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !abierto) return;
      // Esc con el form de datos abierto lo cierra a él primero.
      if (leadForm.classList.contains("is-open")) { cerrarLead(); return; }
      cerrar();
    });

    // Tab circular dentro del panel: sin esto el foco se escapa al
    // fondo de la página y el widget deja de ser usable con teclado.
    panel.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focos = [...panel.querySelectorAll("button, textarea, input, a[href]")]
        .filter((el) => el.offsetParent !== null && !el.disabled);
      if (!focos.length) return;
      const primero = focos[0], ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    });

    // ── Conversación ─────────────────────────────────────────────
    async function preguntar(texto) {
      if (enviando || !texto.trim()) return;
      enviando = true;
      send.disabled = true;
      chips.innerHTML = "";
      burbuja(texto, "user");
      historial.push({ role: "user", content: texto });
      escribiendo(true);

      try {
        const res = await fetch(CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pregunta: texto, historial: historial.slice(0, -1).slice(-10) }),
        });
        const data = await res.json().catch(() => ({}));
        escribiendo(false);

        if (!res.ok || !data.respuesta) {
          burbuja(
            "No he podido responder ahora mismo. Puedes dejar tus datos y te contacta el Departamento Comercial.",
            "err",
          );
          if (data && data.error) console.warn("[wm-chat] respuesta con error:", data.error);
          return;
        }

        burbuja(data.respuesta, "bot");
        pintarFuentes(data.fuentes);
        historial.push({ role: "assistant", content: data.respuesta });
      } catch (err) {
        escribiendo(false);
        console.warn("[wm-chat] fallo de red:", err);
        burbuja(
          "Me he quedado sin conexión. Puedes dejar tus datos y te contacta el Departamento Comercial.",
          "err",
        );
      } finally {
        enviando = false;
        send.disabled = false;
        input.focus();
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const t = input.value.trim();
      if (!t) return;
      input.value = "";
      input.style.height = "auto";
      preguntar(t);
    });

    // Enter envía, Shift+Enter salta de línea.
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 90) + "px";
    });

    // ── Captura de lead ──────────────────────────────────────────
    function abrirLead() {
      leadForm.classList.add("is-open");
      form.style.display = "none";
      btnCta.style.display = "none";
      setTimeout(() => leadNombre.focus(), 40);
    }
    function cerrarLead() {
      leadForm.classList.remove("is-open");
      form.style.display = "";
      btnCta.style.display = "";
      input.focus();
    }
    btnCta.addEventListener("click", abrirLead);
    leadCancel.addEventListener("click", cerrarLead);

    leadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nombre = leadNombre.value.trim();
      const telefono = leadTel.value.trim();
      if (!nombre || !telefono) return;

      leadOk.disabled = true;
      leadOk.textContent = "Enviando...";

      // Lo que ha preguntado el visitante es la mejor pista para
      // Comercial: va como `mensaje`.
      const consultas = historial.filter((m) => m.role === "user").map((m) => m.content).slice(-4);
      const payload = {
        nombre,
        telefono,
        sector: "whitemoon",
        interes: consultas.length ? consultas[consultas.length - 1].slice(0, 200) : "Consulta desde el chat IA de la web",
        mensaje: consultas.length ? "Preguntó: " + consultas.join(" | ") : "Pidió contacto sin preguntar nada",
        pagina: location.pathname,
      };

      try {
        const r = await fetch(LEAD_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) console.warn("[wm-chat] lead HTTP " + r.status);
      } catch (err) {
        // Regla CLAUDE.md: fallo de envío -> console.warn, NUNCA se
        // interrumpe el flujo del usuario.
        console.warn("[wm-chat] lead error:", err);
      }

      cerrarLead();
      leadOk.disabled = false;
      leadOk.textContent = "Enviar";
      leadNombre.value = "";
      leadTel.value = "";
      burbuja(
        "Gracias, " + nombre + ". Paso tus datos al Departamento Comercial y se ponen en contacto contigo.",
        "bot",
      );
      if (typeof window.wmTrack === "function") {
        window.wmTrack("lead_form_submit", { wm_source: "chat-rag" });
      }
    });

    // Permite abrir el chat desde cualquier CTA de la página:
    //   document.dispatchEvent(new CustomEvent('wm-chat-open'));
    document.addEventListener("wm-chat-open", () => { if (!abierto) abrir(); });
  }
})();
