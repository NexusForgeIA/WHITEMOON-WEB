/* WhiteMoon · embudo de venta guiado de /demos/
   Origen: repo WHITEMOON-PROPUESTA-COMERCIAL-. Aquí solo cambian tres cosas:
   las tarjetas de demos ya vienen en el HTML (este fichero solo las filtra),
   el lead se marca con origen "demo-embudo-web" y el guion vive fuera del HTML.
   El resto —packs, diagnóstico, formulario, Cal.com— es el mismo. */
(function(){
  "use strict";

  /* ==========================================================
     DATOS — fuente: https://whitemoon.es/precios/ y /demos/
     Tarifa 2026. Ningún pack tiene permanencia.
     ========================================================== */

  var PACKS = [
    {
      id:"spark", warranty:true, name:"Spark", forWho:"Ya tienes web",
      tag:"Chatbot conversacional completo con IA. Tu negocio atiende clientes 24/7 sin esfuerzo.",
      big:"499€", small:"+ 99€/mes", sub:"Setup único · Sin permanencia · Operativo en 7 días laborables",
      desde:"499€ setup + 99€/mes",
      short:"Agente IA de chat 24/7 sobre tu web actual, que recoge los datos y te avisa al móvil.",
      url:"https://whitemoon.es/spark/",
      items:["Agente IA conversacional 24/7","Recoge solo los datos de quien pregunta","Aviso al móvil de cada persona interesada","Flujo conversacional específico del sector","Te llega quién es y qué necesita, con la conversación entera"]
    },
    {
      id:"mini-core", warranty:true, name:"Pack Mini Core", forWho:"Autónomos sin web",
      tag:"Tu presencia online lista en 7 días laborables: landing profesional y un agente IA que atiende a cada cliente y te avisa al móvil.",
      big:"599€", small:"+ 99€/mes", sub:"Setup único · Sin permanencia · Operativo en 7 días laborables",
      desde:"599€ setup + 99€/mes",
      short:"Landing profesional, dominio el primer año y chatbot básico que recoge el contacto y te avisa.",
      url:"https://whitemoon.es/mini-core/",
      items:["Landing profesional a medida","Dominio propio incluido (primer año)","Agente IA básico (chatbot en la landing)","Chatbot de 3 acciones: responde dudas, recoge nombre y teléfono, y deriva al contacto","Aviso al instante en tu móvil de cada contacto"]
    },
    {
      id:"orion-agent", warranty:true, name:"Orion IA Agent", forWho:"Gestión de citas",
      tag:"Agente de voz IA 24/7 sobre la web que ya tienes. Gestiona citas y recoge contactos sin que intervenga nadie.",
      big:"799€", small:"+ 99€/mes", sub:"Setup único · Sin permanencia · Operativo en 5-7 días laborables",
      desde:"799€ setup + 99€/mes",
      short:"Agente de voz 24/7 sobre tu web actual, con agenda automática vía Cal.com.",
      url:"https://whitemoon.es/orion-agent/",
      items:["Agente de voz 24/7 en español natural","Gestiona citas desde tu web sin intervención humana","Recoge nombre, teléfono y motivo de la consulta","Integración con Cal.com para agenda automática","Flujo conversacional específico de tu sector"]
    },
    {
      id:"core", warranty:true, name:"Core Spark Web", forWho:"Web + chat IA",
      tag:"Web profesional + dominio + Agente Spark conversacional 24/7 + SEO/GEO/AEO completo desde el día 1.",
      big:"899€", small:"+ 99€/mes", sub:"Setup único · Sin permanencia · Operativo en 5-7 días laborables",
      desde:"899€ setup + 99€/mes",
      short:"Web profesional con dominio, agente de chat 24/7 y SEO/GEO/AEO desde el día 1.",
      url:"https://whitemoon.es/core/",
      items:["Web profesional + dominio primer año incluido","SSL + hosting + mantenimiento técnico","Agente Spark conversacional 24/7","Sistema de reservas y citas online","SEO técnico + GEO/AEO · visible en ChatGPT, Grok y Perplexity"]
    },
    {
      id:"core-orion", warranty:true, name:"Core Orion", forWho:"Web + voz IA",
      tag:"Web profesional + dominio + Orion IA voz 24/7 + SEO/GEO/AEO. Tu negocio online y automatizado con voz desde el día 1.",
      big:"1.499€", small:"+ 99€/mes", sub:"Setup único · Sin permanencia · Operativo en 5-7 días laborables",
      desde:"1.499€ setup + 99€/mes",
      short:"Web profesional con dominio, Orion IA de voz 24/7, reservas y SEO/GEO/AEO.",
      url:"https://whitemoon.es/core-orion/",
      items:["Web profesional + dominio primer año incluido","SSL + hosting + mantenimiento técnico","Orion IA — agente de voz 24/7 en tu web","Gestiona citas y llamadas sin intervención humana","SEO técnico + GEO/AEO · visible en ChatGPT, Grok y Perplexity"]
    },
    {
      id:"wm360", warranty:true, name:"WhiteMoon 360", forWho:"Negocio con equipo",
      tag:"Tu negocio entero en un sistema: la web capta el aviso o la cita, el agente IA de chat lo clasifica, tu equipo lo recibe en su móvil y tú lo gestionas desde tu propio panel.",
      big:"1.899€", small:"+ 199€/mes", sub:"Setup único · Sin permanencia · Operativo en 7 días laborables",
      desde:"1.899€ setup + 199€/mes",
      short:"Web + agente IA de chat + CRM propio con reparto de trabajo, agenda y panel de KPIs.",
      url:"https://whitemoon.es/whitemoon-360/",
      items:["Web profesional completa + dominio primer año","Agente IA de chat 24/7 que atiende, clasifica y agenda","CRM de gestión en tu propio dominio","Reparto automático del trabajo por zona y especialidad","Panel de KPIs y enlace de reseña Google automático"]
    },
    {
      id:"core-rag", warranty:true, name:"Core RAG", forWho:"Mucha documentación",
      tag:"Agente IA entrenado con tus documentos, procedimientos y normativa. Responde como un experto de tu empresa.",
      big:"2.499€", small:"+ 199€/mes", sub:"Setup único · Sin permanencia",
      desde:"2.499€ setup + 199€/mes",
      short:"Agente entrenado con hasta 100 documentos propios, búsqueda semántica y voz incluida.",
      url:"https://whitemoon.es/core-rag/",
      items:["Agente IA entrenado con hasta 100 documentos propios","Búsqueda semántica RAG sobre tu contenido real","1.000 consultas al mes incluidas","Widget + URL pública tipo ChatGPT","Orion IA — agente de voz web incluido"]
    },
    {
      id:"pack-ads", name:"Pack Ads", forWho:"Publicidad digital",
      tag:"Gestión completa de Meta Ads (Facebook + Instagram) para captar clientes en tu zona.",
      big:"599€", small:"/mes", sub:"Sin setup · Sin permanencia · + inversión en plataforma",
      desde:"599€/mes · sin setup",
      short:"Gestión de Meta Ads con creatividades, segmentación por zona y test A/B. La inversión publicitaria va aparte.",
      url:"https://whitemoon.es/pack-ads/",
      items:["Gestión Meta Ads (Facebook + Instagram)","Creatividades incluidas (imágenes + copy)","Segmentación por zona geográfica y sector","Test A/B y optimización semanal","Informe mensual de resultados con métricas"]
    },
    {
      id:"auditoria", name:"Auditoría GEO IA", forWho:"Diagnóstico previo",
      tag:"Descubre si tu negocio aparece en ChatGPT, Grok y Perplexity.",
      big:"899€", small:"pago único", sub:"Entrega en 48 h · Sin permanencia",
      desde:"899€ pago único",
      short:"Análisis SEO/GEO/AEO de 35 checks con informe PDF profesional en 48 h.",
      url:"https://whitemoon.es/auditoria-geo-ia/",
      items:["Análisis completo SEO/GEO/AEO (35 checks)","Informe PDF profesional","Entrega en 48 h","Visibilidad en ChatGPT, Grok y Perplexity"]
    },
    {
      id:"itp", warranty:true, name:"Calculadora ITP Pro", forWho:"Gestorías y administradores",
      tag:"Instala la calculadora ITP oficial del BOE 2026 en tu web con un simple script.",
      big:"599€", small:"+ 99€/mes", sub:"Por licencia · Sin permanencia",
      desde:"599€ setup + 99€/mes por licencia",
      short:"Calculadora ITP oficial BOE 2026 instalable en tu web, con todas las comunidades autónomas.",
      url:"https://whitemoon.es/precios/#herramientas-pro",
      items:["Todas las comunidades autónomas","Depreciación automática Anexo IV BOE","Casos especiales contemplados","Se instala con un script en tu web"]
    }
  ];

  var REASONS = {
    "core-rag":{
      why:"Como trabajas con mucha documentación tuya —normativa, expedientes, procedimientos—, lo que te encaja es un agente que se los haya leído. Core RAG se entrena con hasta 100 documentos tuyos, así que responde con tu criterio y tu letra pequeña, no con generalidades de internet.",
      alt:"wm360", altWhy:"te añade además el CRM, el reparto de trabajo a tu equipo y el panel de KPIs."
    },
    "core-orion":{
      why:"Como aún no tienes web y prefieres que te atiendan hablando, te hace falta empezar por las dos cosas a la vez. Core Orion te monta la web con tu dominio y le pone encima Orion IA: coge la conversación por voz, deja la cita puesta y te avisa al móvil.",
      alt:"core", altWhy:"te sale más ajustado si al final ves que con el chat te vale."
    },
    "core":{
      why:"Como aún no tienes web y te ves más cómodo con el chat, esto te deja las dos cosas resueltas: tu web con tu dominio, el agente Spark contestando a cualquier hora y el SEO/GEO/AEO puesto desde el primer día.",
      alt:"core-orion", altWhy:"es lo mismo pero atendiendo por voz, si te tira más el teléfono."
    },
    "orion-agent":{
      why:"Como ya tienes web, no hace falta que la rehagas. Orion IA se mete en la que tienes: atiende hablando, te deja las citas puestas en tu calendario y te avisa al móvil de cada persona que pregunta.",
      alt:"core-orion", altWhy:"es la opción si algún día te apetece renovar también la web."
    },
    "spark":{
      why:"Como ya tienes web y prefieres el chat, con esto es suficiente. Spark le añade un agente que contesta a cualquier hora, se entera de lo que necesita cada persona y te lo pasa con toda la conversación detrás.",
      alt:"orion-agent", altWhy:"es el paso natural si además quieres que atienda por voz y gestione citas."
    }
  };

  /* ==========================================================
     Utilidades
     ========================================================== */
  /* Sello de garantía. Solo lo llevan los packs con puesta en marcha y cuota:
     en Pack Ads no hay setup que garantizar y la Auditoría GEO IA no tiene cuota
     mensual que dejar de pagar, así que ahí la frase no querría decir nada. */
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
     Pintado: demos
     ========================================================== */
  var demosBox  = $("#demos");
  var demoCount = $("#demo-count");
  var demoEmpty = $("#demo-empty");
  /* Las tarjetas ya vienen escritas en el HTML: así el texto de los veintiún
     sectores lo lee un buscador sin ejecutar nada. Aquí solo se enseñan y se
     esconden, y `data-k` trae el heno ya normalizado. */
  var demoCards = $$(".demo", demosBox);

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
            /* Sin importe: aquí se habla de qué hace y para quién. El precio se
               revela entero en el paso 8, y `sub` no lleva cifras (plazo y
               "sin permanencia"), así que puede quedarse. */
            +   '<p class="pack__sub">' + esc(p.sub) + '</p>'
            +   (p.warranty ? seal(false) : '')
            +   '<ul>' + items + '</ul>'
            + '</article>';
    }
    $("#packs").innerHTML = html;

    var lead = $("#packs-lead");
    lead.textContent = recoId
      ? "De lo más sencillo a lo más completo, y el que encaja contigo aparece primero, en verde. Los importes los vemos luego, con calma."
      : "De lo más sencillo a lo más completo. Mira qué hace cada uno y para quién es; los importes los vemos luego, con calma.";
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

  /* Paso 8: aquí y solo aquí se enseñan los importes. Misma fuente (PACKS) que
     las tarjetas y la tabla, así que no pueden desincronizarse. */
  function renderPrecios(recoId){
    var lista = PACKS.slice();
    if(recoId){
      lista.sort(function(a,b){ return (b.id === recoId) - (a.id === recoId); });
    }

    var html = "";
    for(var i=0;i<lista.length;i++){
      var p = lista[i];
      var reco = p.id === recoId;
      html += '<article class="price' + (reco ? ' is-reco' : '') + '">'
            +   '<div class="price__main">'
            +     (reco ? '<span class="price__tag">Encaja contigo</span>' : '')
            +     '<p class="price__for">' + esc(p.forWho) + '</p>'
            +     '<h3 class="price__name">' + esc(p.name) + '</h3>'
            +     '<p class="price__note">' + esc(p.sub) + '</p>'
            +     '<a class="price__link" href="' + esc(p.url) + '" target="_blank" rel="noopener">Ver detalles de ' + esc(p.name)
            +       '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M9 7h8v8"/></svg>'
            +       '<span class="sr-only"> (se abre en una pestaña nueva)</span>'
            +     '</a>'
            +   '</div>'
            +   '<p class="price__amount"><span class="price__big">' + esc(p.big)
            +     '<small>' + esc(p.small) + '</small></span></p>'
            + '</article>';
    }
    $("#precios").innerHTML = html;

    $("#precios-lead").textContent = recoId
      ? "Ahora sí, los importes. El que encaja contigo aparece primero y en verde, pero decides tú por cuál empezar."
      : "Ahora sí, los importes. Ya sabes qué hace cada uno, así que la cifra se lee sabiendo lo que hay detrás.";
  }

  /* ==========================================================
     Diagnóstico
     ========================================================== */
  var answers = { web:null, canal:null, docs:null };
  var recommendedId = null;

  function decide(a){
    if(a.web === null || a.canal === null || a.docs === null) return null;
    if(a.docs === "si") return "core-rag";
    if(a.web === "no") return a.canal === "voz" ? "core-orion" : "core";
    return a.canal === "voz" ? "orion-agent" : "spark";
  }

  function renderResult(){
    var out = $("#diag-out");
    var id = decide(answers);
    recommendedId = id;

    if(!id){
      var left = 0;
      if(answers.web === null) left++;
      if(answers.canal === null) left++;
      if(answers.docs === null) left++;
      out.innerHTML = '<p class="pending" id="diag-pending">'
        + (left === 3
            ? "Responde las tres y aquí verás por dónde te encaja empezar."
            : "Te falta " + left + (left === 1 ? " respuesta" : " respuestas") + " y lo vemos.")
        + '</p>';
      renderPacks(null);
      renderTabla(null);
      renderPrecios(null);
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
      + '<p class="result__alt">Si algún día quieres ir un paso más allá: <b>' + esc(alt.name) + '</b> ' + esc(r.altWhy) + '</p>'
      + '<div class="result__cta">'
      +   '<button type="button" class="btn btn--g" data-go="6">Ver todos los packs</button>'
      + '</div>'
      + '</div>';

    renderPacks(id);
    renderTabla(id);
    renderPrecios(id);
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
       2. Aviso a Telegram por la Edge Function propuesta-notify, con
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
  var NOTIFY_FN    = SUPABASE_URL + "/functions/v1/propuesta-notify";
  var SECTOR       = "demo-embudo-web";
  var ORIGEN       = "demo-embudo-web";

  var form        = $("#lead-form");
  var packSelect  = $("#f-pack");
  var statusBox   = $("#lead-status");
  var goLabel     = $("#lead-go-label");
  var packTouched = false;   // si el cliente elige pack a mano, el paso 5 ya no le pisa la elección
  var enviado     = false;

  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  /* Móvil español: nueve cifras que empiezan por 6 o 7, con prefijo opcional. */
  var RE_MOVIL = /^(?:\+?34|0034)?[67]\d{8}$/;
  var RE_CP    = /^\d{5}$/;

  function soloDigitos(v){ return String(v).replace(/[\s.\-()]/g, ""); }

  var CAMPOS = [
    {id:"nombre",    err:"Dinos cómo te llamas."},
    {id:"empresa",   err:"Falta el nombre de tu empresa."},
    {id:"cif",       err:"Falta el CIF o el NIF."},
    {id:"movil",     err:"Escribe un móvil de nueve cifras.", test:function(v){ return RE_MOVIL.test(soloDigitos(v)); }},
    {id:"email",     err:"Revisa el correo, parece que le falta algo.", test:function(v){ return RE_EMAIL.test(v.trim()); }},
    {id:"direccion", err:"Falta la dirección."},
    {id:"cp",        err:"El código postal son cinco cifras.", test:function(v){ return RE_CP.test(soloDigitos(v)); }},
    {id:"ciudad",    err:"Falta la ciudad."},
    {id:"provincia", err:"Falta la provincia."},
    {id:"pack",      err:"Elige el pack por el que quieres empezar."}
  ];

  function campoEl(c){ return $("#f-" + c.id); }

  function valida(c){
    var v = campoEl(c).value;
    if(!String(v).trim()) return false;
    return c.test ? c.test(v) : true;
  }

  function marca(c, ok){
    var el = campoEl(c);
    el.closest(".field").classList.toggle("is-bad", !ok);
    if(ok){
      el.removeAttribute("aria-invalid");
      $("#e-" + c.id).textContent = "";
    } else {
      el.setAttribute("aria-invalid", "true");
      $("#e-" + c.id).textContent = c.err;
    }
    return ok;
  }

  function pintaPacks(){
    var html = '<option value="">Elige el pack</option>';
    for(var i=0;i<PACKS.length;i++){
      html += '<option value="' + esc(PACKS[i].id) + '">' + esc(PACKS[i].name) + '</option>';
    }
    packSelect.innerHTML = html;
  }

  /* El pack que encaja llega ya elegido, pero manda el cliente: en cuanto toca
     el desplegable, el diagnóstico deja de sobrescribirle la elección. */
  function syncPackSelect(){
    if(enviado || packTouched) return;
    packSelect.value = recommendedId || "";
  }

  function insertLead(lead, reintento){
    fetch(SUPABASE_URL + "/rest/v1/leads_web", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(lead)
    })
    .then(function(r){ if(!r.ok && !reintento) setTimeout(function(){ insertLead(lead, 1); }, 800); })
    .catch(function(){ if(!reintento) setTimeout(function(){ insertLead(lead, 1); }, 800); });
  }

  function notificarTelegram(aviso){
    var payload = JSON.stringify(aviso);
    var sent = false;
    try {
      if(navigator.sendBeacon){
        sent = navigator.sendBeacon(NOTIFY_FN, new Blob([payload], {type:"text/plain;charset=UTF-8"}));
      }
    } catch(e){}
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
      }).catch(function(){ /* silencioso — el cliente no tiene que ver esto */ });
    }
  }

  function bloquearForm(){
    $$("#lead-form input, #lead-form select, #lead-form button").forEach(function(el){ el.disabled = true; });
    form.classList.add("is-sent");
    goLabel.textContent = "Datos enviados";
  }

  function confirmar(nombre){
    statusBox.innerHTML =
      '<div class="confirm">'
      +   '<span class="confirm__check" aria-hidden="true">'
      +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="m5 13 4.5 4.5L19 7"/></svg>'
      +   '</span>'
      +   '<h3>¡Listo, ' + esc(nombre) + '!</h3>'
      +   '<p>Hemos recibido tus datos. Nos ponemos con tu proyecto: en 7 días laborables estará funcionando, en las condiciones de la garantía.</p>'
      +   '<h4 class="next__title">Qué pasa ahora</h4>'
      +   '<ol class="next">'
      +     '<li><span class="next__n" aria-hidden="true">1</span>Te llamamos en menos de 24 h laborables</li>'
      +     '<li><span class="next__n" aria-hidden="true">2</span>Preparamos y configuramos tu agente</li>'
      +     '<li><span class="next__n" aria-hidden="true">3</span>En 7 días laborables, funcionando</li>'
      +   '</ol>'
      + '</div>';
    statusBox.focus();
  }

  function resetLeadForm(){
    enviado = false;
    packTouched = false;
    form.reset();
    CAMPOS.forEach(function(c){ marca(c, true); });
    $$("#lead-form input, #lead-form select, #lead-form button").forEach(function(el){ el.disabled = false; });
    form.classList.remove("is-sent");
    goLabel.textContent = "Empezar mi proyecto";
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

    var primerFallo = null;
    CAMPOS.forEach(function(c){
      if(!marca(c, valida(c)) && !primerFallo) primerFallo = campoEl(c);
    });
    if(primerFallo){ primerFallo.focus(); return; }

    var d = {};
    CAMPOS.forEach(function(c){ d[c.id] = campoEl(c).value.trim(); });

    var pack = packById(d.pack);
    var packNombre = pack ? pack.name : d.pack;
    var direccionCompleta = d.direccion + ", " + d.cp + " " + d.ciudad + " (" + d.provincia + ")";

    /* leads_web sí tiene columna propia para empresa y email, así que van
       aparte además de en `mensaje`: el resumen concatenado se mantiene porque
       es lo que leen los avisos y el CRM, pero el dato queda consultable.
       `fecha` la pone el cliente en ISO — la columna no tiene default. */
    var lead = {
      nombre:   d.nombre,
      telefono: d.movil,
      sector:   SECTOR,
      interes:  packNombre,
      empresa:  d.empresa,
      email:    d.email,
      mensaje:  "Empresa: " + d.empresa + " | CIF: " + d.cif + " | Email: " + d.email
              + " | Dirección: " + direccionCompleta,
      origen:   ORIGEN,
      fecha:    new Date().toISOString()
    };

    /* El aviso lleva los campos sueltos: Telegram los pinta uno a uno. */
    var aviso = {
      nombre: d.nombre, empresa: d.empresa, cif: d.cif, pack: packNombre,
      telefono: d.movil, email: d.email,
      direccion: d.direccion, cp: d.cp, ciudad: d.ciudad, provincia: d.provincia,
      sector: SECTOR, origen: ORIGEN
    };

    insertLead(lead, 0);
    notificarTelegram(aviso);

    enviado = true;
    bloquearForm();
    confirmar(d.nombre);
  });

  pintaPacks();

  /* ==========================================================
     Calendario de Cal.com — carga diferida
     ----------------------------------------------------------
     El script de Cal.com trae su propio runtime y no tiene por qué costarle
     nada a los ocho pasos anteriores: no se inyecta con la página, sino cuando
     el hueco del calendario se acerca a la pantalla. Como el paso 9 está
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

    if(location.hash !== "#paso-" + n){
      history.replaceState(null, "", "#paso-" + n);
    }

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
    answers = { web:null, canal:null, docs:null };
    recommendedId = null;
    $$(".opt").forEach(function(o){ o.setAttribute("aria-pressed","false"); });
    $$(".q").forEach(function(f){ f.classList.remove("is-answered"); });
    var q = $("#demo-q");
    if(q) q.value = "";
    renderDemos("");
    renderResult();
    resetLeadForm();
    show(1);
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

  window.addEventListener("hashchange", function(){
    var m = /^#paso-(\d+)$/.exec(location.hash);
    if(m){ show(parseInt(m[1], 10)); }
  });

  /* ==========================================================
     Arranque
     ========================================================== */
  $("#demo-q").addEventListener("input", function(ev){ renderDemos(ev.target.value); });

  renderDemos("");
  renderResult();

  var start = /^#paso-(\d+)$/.exec(location.hash);
  show(start ? parseInt(start[1], 10) : 1, {silent:true});
})();
