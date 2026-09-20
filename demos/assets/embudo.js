/* WhiteMoon · embudo de venta guiado de /demos/
   Origen: repo WHITEMOON-PROPUESTA-COMERCIAL-. Aquí solo cambian tres cosas:
   las tarjetas de demos ya vienen en el HTML (este fichero solo las filtra),
   el lead se marca con origen "demos-embudo" y el guion vive fuera del HTML.
   El resto —packs, diagnóstico, formulario, Cal.com— es el mismo. */
(function(){
  "use strict";

  /* ==========================================================
     DATOS — dos productos: Spark y Core Spark Web.
     Sin importes: cada propuesta se prepara a medida.
     Ninguno tiene permanencia.
     ========================================================== */

  var PACKS = [
    {
      id:"spark", warranty:true, name:"Spark", forWho:"Ya tienes web",
      tag:"Un agente IA en la web que ya tienes: atiende a tus clientes 24/7, recoge sus datos y te avisa al móvil.",
      sub:"Propuesta a medida · Sin permanencia · Operativo en 7 días laborables",
      short:"Agente IA de chat 24/7 sobre tu web actual, que recoge los datos y te avisa al móvil.",
      url:"https://whitemoon.es/spark/",
      items:["Agente IA conversacional 24/7","Recoge solo los datos de quien pregunta","Aviso al móvil de cada persona interesada","Flujo conversacional específico del sector","Te llega quién es y qué necesita, con la conversación entera"]
    },
    {
      id:"core-spark-web", warranty:true, name:"Core Spark Web", forWho:"Aún no tienes web",
      tag:"Web profesional + dominio (primer año) + agente Spark conversacional 24/7 + SEO/GEO/AEO completo desde el día 1.",
      sub:"Propuesta a medida · Sin permanencia · Operativo en 7 días laborables",
      short:"Web profesional con dominio (primer año), agente de chat 24/7 y SEO/GEO/AEO desde el día 1.",
      url:"https://whitemoon.es/core/",
      items:["Web profesional + dominio primer año incluido","SSL + hosting + mantenimiento técnico","Agente Spark conversacional 24/7","Sistema de reservas y citas online","SEO técnico + GEO/AEO · visible en ChatGPT, Grok y Perplexity"]
    }
  ];

  var REASONS = {
    "spark":{
      why:"Como ya tienes web, no hace falta rehacerla. Spark le añade un agente que contesta a cualquier hora, se entera de lo que necesita cada persona y te lo pasa con toda la conversación detrás.",
      alt:"core-spark-web", altWhy:"es la opción si algún día quieres renovar también la web, con el agente dentro."
    },
    "core-spark-web":{
      why:"Como aún no tienes web, te conviene empezar por las dos cosas a la vez: tu web con dominio incluido el primer año, el agente Spark contestando a cualquier hora y el SEO/GEO/AEO puesto desde el primer día.",
      alt:"spark", altWhy:"te basta si más adelante ya tienes web propia: pone el agente en la que tengas, sin rehacerla."
    }
  };

  /* ==========================================================
     Utilidades
     ========================================================== */
  /* Sello de garantía: lo llevan los productos con puesta en marcha y cuota
     mensual (hoy, los dos). */
  var SEAL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
    + '<path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 8.5-4.1-.9-7-4.3-7-8.5V6l7-3Z"/>'
    + '<path d="m9 12 2 2 4-4"/></svg>';

  function seal(wide){
    return '<p class="seal' + (wide ? ' seal--wide' : '') + '">' + SEAL_SVG
         + '<span>Puesta en marcha garantizada · Sin permanencia</span></p>';
  }

  var $ = function(s,c){return (c||document).querySelector(s);};
  var $$ = function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));};

  function esc(str){
    return String(str)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function packById(id){
    for(var i=0;i<PACKS.length;i++){ if(PACKS[i].id===id) return PACKS[i]; }
    return null;
  }
  function norm(s){
    return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  /* ==========================================================
     Medicion
     ----------------------------------------------------------
     Los ocho pasos viven en una sola URL, asi que para GA4 todo el embudo era
     UNA page_view y el abandono no se podia situar. Ahora cada paso empuja una
     entrada de historial (/demos/#paso-N) y emite su propia page_view, con lo
     que el embudo se ve nativo por page_path.

     wmTrack() es el helper de assets/wm-track.js: acaba llamando a
     gtag('event', nombre, params) y es no-op si gtag no esta disponible
     (consentimiento no dado, adblock, JS del consent bloqueado). Ni el
     recorrido ni el formulario dependen de que la medicion funcione.
     ========================================================== */
  function track(nombre, params){
    if(typeof window.wmTrack === "function"){
      try { window.wmTrack(nombre, params || {}); } catch(e){}
    }
  }

  var pasoMedido = null;
  function medirPaso(n){
    if(pasoMedido === n) return;          /* sin duplicados al volver por historial */
    pasoMedido = n;
    track("page_view", {
      page_path:  "/demos/#paso-" + n,
      page_title: "Demos \u00b7 paso " + n
    });
  }

  /* Sector de la ultima demo abierta. Alimenta el evento demo_open y viaja
     despues en el campo `sector` del lead: si alguien probo la demo de
     talleres, esa es su pista de sector y no un literal fijo. */
  var sectorVisto = "";

  /* ==========================================================
     Pintado: demos
     ========================================================== */
  var demosBox  = $("#demos");
  var demoCount = $("#demo-count");
  var demoEmpty = $("#demo-empty");
  /* Las tarjetas ya vienen escritas en el HTML: así el texto de los veintiún
     sectores lo lee un buscador sin ejecutar nada. Aquí solo se enseñan y se
     esconden, y `data-k` trae el heno ya normalizado. */
  var demoCards = $$(".demo", demosBox);

  /* Abrir una demo es el momento de valor de la pagina y no se medía. El
     listener NO toca el evento: las tarjetas son <a target="_blank"> y la
     pestana se abre igual aunque wmTrack falle o gtag no exista. Tambien se
     guarda el sector para el lead del paso 8. */
  demoCards.forEach(function(card){
    card.addEventListener("click", function(){
      var h3 = card.querySelector("h3");
      var sector = h3 ? h3.textContent.trim() : "";
      if(sector) sectorVisto = sector;
      track("demo_open", {sector: sector, from: "demos"});
    });
  });

  /* Se busca palabra a palabra, no la frase entera: la gente escribe como
     habla ("clínica dental", "permiso de conducir") y antes eso no encontraba
     nada porque el texto tenía que coincidir seguido. Las palabras de enlace
     se ignoran, salvo que la búsqueda sea solo eso. */
  var VACIAS = " de del la el los las y o en con para un una al ";

  function terminos(filter){
    var t = norm(filter || "").trim().split(/\s+/).filter(Boolean);
    var utiles = t.filter(function(w){ return VACIAS.indexOf(" " + w + " ") === -1; });
    return utiles.length ? utiles : t;
  }

  function renderDemos(filter){
    var q = terminos(filter);
    var shown = 0;
    demoCards.forEach(function(card){
      var heno = card.getAttribute("data-k") || "";
      var encaja = true;
      for(var t=0;t<q.length;t++){
        if(heno.indexOf(q[t]) === -1){ encaja = false; break; }
      }
      /* Se oculta de verdad, no solo a la vista: una tarjeta escondida no debe
         quedarse en el recorrido del tabulador ni en el del lector de pantalla. */
      card.hidden = !encaja;
      if(encaja) shown++;
    });
    demoEmpty.hidden = shown !== 0;
    demoCount.textContent = shown === 1 ? "1 demo disponible" : shown + " demos disponibles";
  }

  /* ==========================================================
     Pintado: packs + tabla
     ========================================================== */
  function renderPacks(recoId){
    // El recomendado se coloca primero en el propio DOM, no con `order` de CSS:
    // así el orden que se ve, el de tabulación y el que lee un lector de pantalla
    // son el mismo (WCAG 1.3.2).
    var lista = PACKS.slice();
    if(recoId){
      lista.sort(function(a,b){
        return (b.id === recoId) - (a.id === recoId);
      });
    }

    var html = "";
    for(var i=0;i<lista.length;i++){
      var p = lista[i];
      var reco = p.id === recoId;
      var items = "";
      for(var j=0;j<p.items.length;j++){ items += "<li>" + esc(p.items[j]) + "</li>"; }
      html += '<article class="pack' + (reco ? " is-reco" : "") + '">'
            +   '<span class="pack__badge">Encaja contigo</span>'
            +   '<p class="pack__for">' + esc(p.forWho) + '</p>'
            +   '<h3>' + esc(p.name) + '</h3>'
            +   '<p class="pack__tag">' + esc(p.tag) + '</p>'
            /* Sin importe: cada propuesta se prepara a medida. `sub` son
               plazo y "sin permanencia", sin cifras. */
            +   '<p class="pack__sub">' + esc(p.sub) + '</p>'
            +   (p.warranty ? seal(false) : '')
            +   '<ul>' + items + '</ul>'
            + '</article>';
    }
    $("#packs").innerHTML = html;

    var lead = $("#packs-lead");
    lead.textContent = recoId
      ? "Los dos productos, y el que encaja contigo aparece primero, en verde. El precio va en tu propuesta, hecha a medida."
      : "Los dos productos: mira qué hace cada uno y para quién es. El precio va en tu propuesta, hecha a medida.";
  }

  function renderTabla(recoId){
    var html = "";
    for(var i=0;i<PACKS.length;i++){
      var p = PACKS[i];
      var reco = p.id === recoId;
      html += '<tr' + (reco ? ' class="is-reco"' : '') + '>'
            +   '<th scope="row">' + esc(p.name) + (reco ? ' <span class="sr-only">(el que encaja contigo)</span><span aria-hidden="true" style="color:#00d4aa">&#9733;</span>' : '') + '</th>'
            +   '<td data-label="Para quién">' + esc(p.forWho) + '</td>'
            +   '<td data-label="Qué incluye">' + esc(p.short) + '</td>'
            + '</tr>';
    }
    $("#tabla").innerHTML = html;
  }

  /* ==========================================================
     Diagnóstico
     ========================================================== */
  var answers = { web:null, docs:null };
  var recommendedId = null;

  /* Dos productos: con web, Spark; sin web, Core Spark Web. La documentación
     no cambia el producto: si hay mucha, se cuenta que el agente puede
     entrenarse con esos documentos (RAG), como capacidad opcional. */
  var DOCS_LINE = "Como trabajas con mucha documentación tuya, el agente se puede entrenar con tus documentos (RAG) para responder con tu criterio y no con generalidades. Es opcional: lo vemos en tu propuesta.";

  function decide(a){
    if(a.web === null || a.docs === null) return null;
    return a.web === "si" ? "spark" : "core-spark-web";
  }

  function renderResult(){
    var out = $("#diag-out");
    var id = decide(answers);
    recommendedId = id;

    if(!id){
      var left = 0;
      if(answers.web === null) left++;
      if(answers.docs === null) left++;
      out.innerHTML = '<p class="pending" id="diag-pending">'
        + (left === 2
            ? "Responde las dos y aquí verás por dónde te encaja empezar."
            : "Te falta 1 respuesta y lo vemos.")
        + '</p>';
      renderPacks(null);
      renderTabla(null);
      return;
    }

    var p = packById(id);
    var r = REASONS[id];
    var alt = packById(r.alt);

    out.innerHTML =
      '<div class="result">'
      + '<p class="result__tag">Por aquí te encaja empezar</p>'
      + '<h3>' + esc(p.name) + '</h3>'
      /* Sin importe: el encaje se explica por lo que hace, no por lo que cuesta.
         `sub` son plazo y "sin permanencia", sin cifras. */
      + '<p class="result__sub">' + esc(p.sub) + '</p>'
      + (p.warranty ? seal(true) : '')
      + '<p class="result__why">' + esc(r.why) + '</p>'
      + (answers.docs === "si" ? '<p class="result__alt">' + esc(DOCS_LINE) + '</p>' : '')
      + '<p class="result__alt">La otra opción: <b>' + esc(alt.name) + '</b> ' + esc(r.altWhy) + '</p>'
      + '<div class="result__cta">'
      +   '<button type="button" class="btn btn--g" data-go="6">Ver los dos productos</button>'
      + '</div>'
      + '</div>';

    renderPacks(id);
    renderTabla(id);
  }

  $$(".opt").forEach(function(btn){
    btn.addEventListener("click", function(){
      var q = btn.getAttribute("data-q");
      var v = btn.getAttribute("data-v");
      answers[q] = v;

      $$('.opt[data-q="' + q + '"]').forEach(function(o){
        o.setAttribute("aria-pressed", String(o === btn));
      });
      var fs = document.querySelector('.q[data-q="' + q + '"]');
      if(fs) fs.classList.add("is-answered");

      renderResult();
    });
  });

  /* ==========================================================
     Cierre con formulario — lead a Supabase + aviso a Telegram
     ----------------------------------------------------------
     Regla del proyecto (docs/regla-aviso-telegram.md): al cerrarse el lead se
     hacen DOS envíos EN PARALELO, nunca encadenados:

       1. INSERT en leads_web con la publishable key, con UN reintento a los
          800 ms. Supabase devuelve 503 transitorios de forma esporádica y sin
          reintento ese lead se pierde.
       2. Aviso a Telegram por la Edge Function whitemoon-notify, con
          navigator.sendBeacon y Blob 'text/plain;charset=UTF-8'. Con
          'application/json' se dispara el preflight CORS, Chrome descarta el
          POST y sendBeacon devuelve true igual: el aviso se pierde en
          silencio. El body sigue siendo JSON y la función lo parsea igual.
          Fallback a fetch con keepalive.

     La publishable key no es secreta: por RLS el rol anónimo solo puede
     INSERT. El token de Telegram vive en los Secrets de la Edge Function,
     nunca en el cliente.
     ========================================================== */
  var SUPABASE_URL = "https://mlaqtniujnvfxcvcourm.supabase.co";
  var SUPABASE_KEY = "sb_publishable_6no6BuOgiA_2nonTJntAuQ_DTqEgrcV";
  /* whitemoon-notify es la funcion estandar de aviso del sitio: lee
     {nombre, telefono, interes, mensaje} y no inserta nada. El INSERT lo hace
     este cliente con la publishable key. */
  var NOTIFY_FN    = SUPABASE_URL + "/functions/v1/whitemoon-notify";
  var ORIGEN       = "demos-embudo";

  var form        = $("#lead-form");
  var packSelect  = $("#f-pack");
  var statusBox   = $("#lead-status");
  var goLabel     = $("#lead-go-label");
  var goBtn       = $("#lead-go");
  var consentBox  = $("#f-consent");
  var consentErr  = $("#e-consent");
  var packTouched = false;   // si el cliente elige pack a mano, el paso 5 ya no le pisa la eleccion
  var enviado     = false;

  function soloDigitos(v){ return String(v).replace(/[^0-9]/g, ""); }

  /* El embudo pedia diez campos obligatorios, CIF y direccion incluidos: eso
     es un alta de cliente, no un lead, y se cobraba en abandono justo en el
     ultimo paso. Ahora solo bloquean el envio el nombre, el telefono y el
     consentimiento; empresa y producto son opcionales y los datos de
     facturacion se piden fuera del embudo, cuando hay algo que facturar. */
  var CAMPOS = [
    {id:"nombre", req:true,  err:"Dinos cómo te llamas."},
    {id:"movil",  req:true,  err:"Escribe un teléfono de al menos nueve cifras.",
     test:function(v){ return soloDigitos(v).length >= 9; }},
    {id:"empresa", req:false},
    {id:"pack",    req:false}
  ];

  function campoEl(c){ return $("#f-" + c.id); }

  function valida(c){
    var v = String(campoEl(c).value || "").trim();
    if(!v) return !c.req;                 // vacio solo falla si es obligatorio
    return c.test ? c.test(v) : true;
  }

  function marca(c, ok){
    var el = campoEl(c);
    el.closest(".field").classList.toggle("is-bad", !ok);
    var box = $("#e-" + c.id);
    if(ok){
      el.removeAttribute("aria-invalid");
      if(box) box.textContent = "";
    } else {
      el.setAttribute("aria-invalid", "true");
      if(box) box.textContent = c.err || "";
    }
    return ok;
  }

  function marcaConsent(ok){
    consentErr.textContent = ok ? "" : "Para poder escribirte necesitamos que aceptes la política de privacidad.";
    consentErr.classList.toggle("is-on", !ok);
    if(ok) consentBox.removeAttribute("aria-invalid");
    else consentBox.setAttribute("aria-invalid", "true");
    return ok;
  }

  function pintaPacks(){
    var html = '<option value="">Elige el producto</option>';
    for(var i=0;i<PACKS.length;i++){
      html += '<option value="' + esc(PACKS[i].id) + '">' + esc(PACKS[i].name) + '</option>';
    }
    packSelect.innerHTML = html;
  }

  /* El pack que encaja llega ya elegido, pero manda el cliente: en cuanto toca
     el desplegable, el diagnostico deja de sobrescribirle la eleccion. */
  function syncPackSelect(){
    if(enviado || packTouched) return;
    packSelect.value = recommendedId || "";
  }

  /* 1 - leads_web, con UN reintento a los 800 ms. Devuelve una promesa que
         resuelve true solo si el INSERT acabo entrando. Mismo patron que
         homeLeadForm en index.html. */
  function postLead(lead){
    return fetch(SUPABASE_URL + "/rest/v1/leads_web", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(lead)
    }).then(function(r){
      if(!r.ok) console.warn("[demos] leads_web " + r.status);
      return r.ok;
    }).catch(function(err){
      console.warn("[demos] leads_web error", err);
      return false;
    });
  }
  function insertLead(lead){
    return postLead(lead).then(function(entro){
      if(entro) return true;
      return new Promise(function(res){
        setTimeout(function(){ postLead(lead).then(res); }, 800);
      });
    });
  }

  /* 2 - aviso a Telegram. sendBeacon con text/plain para no disparar el
         preflight CORS: con application/json Chrome descarta el POST y
         sendBeacon devuelve true igual, asi que el aviso se perderia en
         silencio. El body sigue siendo JSON y la funcion lo parsea igual. */
  function notificarTelegram(aviso){
    var payload = JSON.stringify(aviso);
    var sent = false;
    try {
      if(navigator.sendBeacon){
        sent = navigator.sendBeacon(NOTIFY_FN, new Blob([payload], {type:"text/plain;charset=UTF-8"}));
      }
    } catch(e){ /* sin sendBeacon usable, cae al fetch de abajo */ }
    if(!sent){
      fetch(NOTIFY_FN, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY
        },
        body: payload
      }).catch(function(){ /* silencioso - el cliente no tiene que ver esto */ });
    }
  }

  function bloquearForm(){
    $$("#lead-form input, #lead-form select, #lead-form button").forEach(function(el){ el.disabled = true; });
    form.classList.add("is-sent");
    goLabel.textContent = "Datos enviados";
  }
  function desbloquearForm(){
    $$("#lead-form input, #lead-form select, #lead-form button").forEach(function(el){ el.disabled = false; });
    form.classList.remove("is-sent");
    goLabel.textContent = "Empezar mi proyecto";
  }

  function confirmar(){
    statusBox.innerHTML =
      '<div class="confirm">'
      +   '<span class="confirm__check" aria-hidden="true">'
      +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="m5 13 4.5 4.5L19 7"/></svg>'
      +   '</span>'
      +   '<h3>Gracias por tu solicitud.</h3>'
      +   '<p>En breve el equipo de WhiteMoon se pone en contacto contigo.</p>'
      + '</div>';
    statusBox.focus();
  }

  function errorEnvio(){
    statusBox.innerHTML =
      '<p class="sendfail" role="alert">No se pudo enviar. Prueba otra vez o escríbenos a '
      + '<a href="mailto:comercial@whitemoon.es">comercial@whitemoon.es</a>.</p>';
  }

  function resetLeadForm(){
    enviado = false;
    packTouched = false;
    form.reset();
    CAMPOS.forEach(function(c){ marca(c, true); });
    marcaConsent(true);
    desbloquearForm();
    statusBox.innerHTML = "";
    syncPackSelect();
  }

  packSelect.addEventListener("change", function(){ packTouched = true; });

  CAMPOS.forEach(function(c){
    var el = campoEl(c);
    /* El error se retira en cuanto el campo está bien; no se pinta de rojo
       mientras el cliente todavía está escribiendo. */
    el.addEventListener("input", function(){
      if(el.closest(".field").classList.contains("is-bad") && valida(c)) marca(c, true);
    });
    el.addEventListener("blur", function(){
      if(String(el.value).trim()) marca(c, valida(c));
    });
  });

  form.addEventListener("submit", function(ev){
    ev.preventDefault();
    if(enviado) return;

    /* Gate minimo: nombre, telefono y consentimiento. Empresa y producto son
       opcionales y no bloquean nada. */
    var primerFallo = null;
    CAMPOS.forEach(function(c){
      if(!marca(c, valida(c)) && !primerFallo) primerFallo = campoEl(c);
    });
    if(primerFallo){ primerFallo.focus(); return; }

    /* El consentimiento RGPD va DESPUES de validar los campos y ANTES de
       cualquier envio: un return aqui deja el lead sin salir. */
    if(!consentBox.checked){
      marcaConsent(false);
      consentBox.focus();
      return;
    }
    marcaConsent(true);

    var d = {};
    CAMPOS.forEach(function(c){ d[c.id] = String(campoEl(c).value || "").trim(); });

    var pack = packById(d.pack);
    var packNombre = pack ? pack.name : "";

    /* El diagnostico del paso 5 viaja en `preferencia`: dice si el visitante
       tiene web y si trabaja con documentacion propia, que es lo que decide
       por donde encaja empezar. Si no lo respondio, va vacio. */
    var diag = [];
    if(answers.web)  diag.push("Web: "  + (answers.web  === "si" ? "si" : "no"));
    if(answers.docs) diag.push("Docs: " + (answers.docs === "si" ? "si" : "no"));
    var preferencia = diag.join(" | ");

    enviado = true;
    bloquearForm();

    /* Los dos envios arrancan a la vez; el aviso no espera al INSERT.
       En el aviso, `interes` lleva producto + empresa: es la linea que se lee
       de un vistazo en la notificacion del movil. */
    notificarTelegram({
      nombre:   d.nombre,
      telefono: d.movil,
      interes:  [(packNombre || "Demos"), d.empresa].filter(Boolean).join(" · "),
      mensaje:  ["Lead embudo /demos/", sectorVisto ? "Demo vista: " + sectorVisto : "", preferencia]
                  .filter(Boolean).join(" | ")
    });

    insertLead({
      nombre:      d.nombre,
      telefono:    d.movil,
      empresa:     d.empresa,
      sector:      sectorVisto,
      interes:     packNombre,
      preferencia: preferencia,
      mensaje:     "Lead embudo /demos/",
      origen:      ORIGEN,
      fecha:       new Date().toISOString()
    }).then(function(entro){
      if(!entro){
        enviado = false;
        desbloquearForm();
        errorEnvio();
        return;
      }
      track("demos_lead_enviado", {
        producto: packNombre || "",
        sector:   sectorVisto || ""
      });
      /* Lead real: el INSERT entro y el movil ya paso el filtro de 9+ cifras
         de CAMPOS, que no deja llegar hasta aqui. */
      track("lead_captured", { method: "demos", wm_source: ORIGEN });
      confirmar();
    });
  });

  pintaPacks();

  /* ==========================================================
     Calendario de Cal.com — carga diferida
     ----------------------------------------------------------
     El script de Cal.com trae su propio runtime y no tiene por qué costarle
     nada a los pasos anteriores: no se inyecta con la página, sino cuando
     el hueco del calendario se acerca a la pantalla. Como el último paso está
     `hidden` hasta que se abre, el observador no dispara antes de llegar ahí.
     Si el navegador no trae IntersectionObserver, se carga al abrirse el paso.
     ========================================================== */
  var CAL_LINK = "whitemoon/contenidos";
  var calBox   = $("#cal-inline");
  var calCargado = false;

  function cargarCal(){
    if(calCargado || !calBox) return;
    calCargado = true;

    /* Stub oficial de Cal.com: encola las llamadas y mete el <script>. */
    (function(C, A, L){
      var p = function(a, ar){ a.q.push(ar); };
      var d = C.document;
      C.Cal = C.Cal || function(){
        var cal = C.Cal, ar = arguments;
        if(!cal.loaded){
          cal.ns = {};
          cal.q = cal.q || [];
          d.head.appendChild(d.createElement("script")).src = A;
          cal.loaded = true;
        }
        if(ar[0] === L){
          var api = function(){ p(api, arguments); };
          var ns = ar[1];
          api.q = api.q || [];
          if(typeof ns === "string"){
            cal.ns[ns] = cal.ns[ns] || api;
            p(cal.ns[ns], ar);
            p(cal, ["initNamespace", ns]);
          } else { p(cal, ar); }
          return;
        }
        p(cal, ar);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    window.Cal("init", "contenidos", {origin:"https://app.cal.com"});
    window.Cal.ns.contenidos("inline", {
      elementOrSelector: "#cal-inline",
      config: {layout:"month_view"},
      calLink: CAL_LINK
    });
    /* Tema oscuro y verde de la casa, para que no desentone con la página. */
    window.Cal.ns.contenidos("ui", {
      theme: "dark",
      cssVarsPerTheme: {dark:{"cal-brand":"#00d4aa"}},
      hideEventTypeDetails: false,
      layout: "month_view"
    });

    /* ----------------------------------------------------------
       meeting_scheduled — la reserva de verdad, no el clic
       ----------------------------------------------------------
       Los 327 enlaces a cal.com del sitio abren pestaña nueva y solo se
       puede medir la INTENCION (click_nav_meeting, launcher_agendar...).
       Este es el unico embed inline que hay, asi que es el unico sitio
       donde se puede saber que alguien reservo de verdad.

       Como funciona el 'on' del embed (comprobado en app.cal.com/embed/
       embed.js): on(accion, cb) hace addEventListener sobre window del
       tipo "CAL:<namespace>:<accion>". Por eso hay que registrarlo en
       Cal.ns.contenidos y no en un Cal global: con el namespace vacio
       escucharia "CAL::..." y no llegaria nada. No hay lista blanca de
       acciones, asi que registrar una que el booker no emita es inocuo.

       Se escuchan DOS nombres: la doc de Cal.com documenta hoy
       bookingSuccessfulV2 y da bookingSuccessful por obsoleto, pero el
       nombre lo emite el iframe, no el embed.js que servimos, asi que no
       se puede saber desde aqui cual manda la version desplegada. Con los
       dos queda cubierto en ambos casos; `medidas` evita contar dos veces
       si llegaran los dos.

       NO se escucha dryRunBookingSuccessfulV2: son reservas de prueba.
       ---------------------------------------------------------- */
    var medidas = {};
    function alReservar(e){
      var d = (e && e.detail && e.detail.data) || {};
      /* Dedupe por reserva. Si el payload no trae uid se cae a una sola
         medicion por carga de pagina, que es el caso realista aqui. */
      var clave = d.uid || "sin-uid";
      if(medidas[clave]) return;
      medidas[clave] = true;

      /* Se mide toda reserva completada, pendiente de confirmacion o no:
         el estado NO filtra, viaja como parametro. Si el event type pide
         confirmacion del anfitrion, la reserva nace pendiente y aun asi
         cuenta como reserva hecha; separarlas es cosa de GA4.
         V2 trae `status`; el payload antiguo solo `confirmed`, que se
         normaliza al mismo vocabulario para que la dimension sirva
         vengan por donde vengan. */
      var estado = d.status;
      if(!estado && typeof d.confirmed === "boolean"){
        estado = d.confirmed ? "accepted" : "pending";
      }

      /* meeting_type sale del slug que ya conocemos (CAL_LINK es
         "whitemoon/contenidos"). El payload V2 no trae eventType.slug
         —solo eventTypeId—, asi que no se inventa el campo. */
      window.wmTrack && window.wmTrack("meeting_scheduled", {
        wm_source:    "demos",
        meeting_type: CAL_LINK.split("/").pop() || "demo",
        status:       estado || "unknown"
      });
    }
    window.Cal.ns.contenidos("on", {action: "bookingSuccessfulV2", callback: alReservar});
    window.Cal.ns.contenidos("on", {action: "bookingSuccessful",   callback: alReservar});

    /* El embed monta el iframe por su cuenta y no siempre le pone título: sin
       él, un lector de pantalla anuncia un marco sin nombre. */
    var titula = new MutationObserver(function(){
      var f = calBox.querySelector("iframe");
      if(!f) return;
      f.setAttribute("title", "Calendario de WhiteMoon para reservar una reunión de 30 minutos");
      titula.disconnect();
    });
    titula.observe(calBox, {childList:true, subtree:true});

    /* Si un bloqueador o la red se lo comen, mejor ofrecer el enlace directo
       que dejar al cliente mirando un hueco vacío. */
    setTimeout(function(){
      if(!calBox.querySelector("iframe")) $("#cal-fallback").hidden = false;
    }, 6000);
  }

  if(calBox && window.IntersectionObserver){
    var calObs = new IntersectionObserver(function(entradas){
      for(var i=0;i<entradas.length;i++){
        if(entradas[i].isIntersecting){ calObs.disconnect(); cargarCal(); return; }
      }
    }, {rootMargin:"600px"});
    calObs.observe(calBox);
  }

  /* ==========================================================
     Navegación por pasos
     ========================================================== */
  var steps = $$(".step");
  var TOTAL = steps.length;
  var current = 1;

  var dotsBox = $("#dots");
  var dotsHtml = "";
  for(var s=0;s<TOTAL;s++){
    dotsHtml += '<button type="button" class="dot" data-go="' + (s+1) + '" aria-label="Ir al paso ' + (s+1) + ': ' + esc(steps[s].getAttribute("data-title")) + '"></button>';
  }
  dotsBox.innerHTML = dotsHtml;

  var stepnav = $("#stepnav");
  var prevBtn = $("#prev");
  var nextBtn = $("#next");
  var nextLabel = $("#next-label");
  var counter = $("#counter");

  function pad(n){ return n < 10 ? "0" + n : String(n); }

  function show(n, opts){
    n = Math.min(Math.max(1, n|0), TOTAL);
    current = n;

    steps.forEach(function(sec, i){
      var on = (i + 1) === n;
      sec.hidden = !on;
      sec.classList.toggle("is-active", on);
    });

    $$(".dot", dotsBox).forEach(function(d, i){
      d.classList.toggle("is-now", (i + 1) === n);
      d.classList.toggle("is-done", (i + 1) < n);
      if((i + 1) === n){ d.setAttribute("aria-current","step"); }
      else { d.removeAttribute("aria-current"); }
    });

    counter.innerHTML = pad(n) + '<span aria-hidden="true">/' + pad(TOTAL) + '</span><span class="sr-only"> de ' + pad(TOTAL) + '</span>';

    stepnav.hidden = (n === 1);
    prevBtn.disabled = (n <= 1);
    prevBtn.style.visibility = n <= 1 ? "hidden" : "visible";
    nextLabel.textContent = n === TOTAL ? "Volver al principio" : "Siguiente";

    /* Cada paso deja su entrada en el historial, asi el boton atras del
       navegador retrocede de paso en vez de sacarte de la pagina. La primera
       pintada y el regreso por popstate no empujan nada: reemplazan, o el
       historial se llenaria de duplicados. */
    if(location.hash !== "#paso-" + n){
      var modo = (opts && opts.history) || "push";
      if(modo === "push"){ history.pushState({paso:n}, "", "#paso-" + n); }
      else if(modo === "replace"){ history.replaceState({paso:n}, "", "#paso-" + n); }
    }
    medirPaso(n);

    syncPackSelect();
    if(n === TOTAL && !window.IntersectionObserver) cargarCal();
    window.scrollTo(0, 0);

    if(!opts || !opts.silent){
      var target = steps[n - 1];
      target.focus({preventScroll:true});
    }
  }

  function go(delta){
    if(current === TOTAL && delta > 0){ reset(); return; }
    show(current + delta);
  }

  function reset(){
    answers = { web:null, docs:null };
    recommendedId = null;
    $$(".opt").forEach(function(o){ o.setAttribute("aria-pressed","false"); });
    $$(".q").forEach(function(f){ f.classList.remove("is-answered"); });
    var q = $("#demo-q");
    if(q) q.value = "";
    renderDemos("");
    renderResult();
    resetLeadForm();
    show(1, {history:"replace"});
  }

  document.addEventListener("click", function(ev){
    var t = ev.target.closest ? ev.target.closest("[data-go]") : null;
    if(!t) return;
    ev.preventDefault();
    show(parseInt(t.getAttribute("data-go"), 10));
  });

  prevBtn.addEventListener("click", function(){ go(-1); });
  nextBtn.addEventListener("click", function(){ go(1); });

  document.addEventListener("keydown", function(ev){
    var tag = (ev.target && ev.target.tagName) ? ev.target.tagName.toLowerCase() : "";
    if(tag === "input" || tag === "textarea" || tag === "select" || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if(ev.key === "ArrowRight"){ go(1); }
    else if(ev.key === "ArrowLeft"){ go(-1); }
  });

  /* popstate cubre el boton atras del navegador y tambien la edicion manual
     del hash. Se pinta con history:"none" porque la entrada ya existe: volver
     a empujarla dejaria el boton atras girando en bucle. */
  window.addEventListener("popstate", function(){
    var m = /^#paso-(\d+)$/.exec(location.hash);
    show(m ? parseInt(m[1], 10) : 1, {history:"none"});
  });

  /* ==========================================================
     Arranque
     ========================================================== */
  $("#demo-q").addEventListener("input", function(ev){ renderDemos(ev.target.value); });

  renderDemos("");
  renderResult();

  var start = /^#paso-(\d+)$/.exec(location.hash);
  show(start ? parseInt(start[1], 10) : 1, {silent:true, history:"replace"});
})();
