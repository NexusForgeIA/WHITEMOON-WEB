/* WhiteMoon — Bloque de diagnóstico con Orion en /recursos/
 * ---------------------------------------------------------------------------
 * Tres pasos: DUELE (qué se automatiza y qué no) → CUENTA (su número) →
 * CIERRA (la demo de su sector, o que le llamen).
 *
 * DOS CAMINOS, Y SOLO UNO TOCA LA RED
 *   · Los tres chips de sector son GUION: el texto está aquí abajo, escrito a
 *     mano. Son instantáneos, gratis y siempre correctos, así que no llevan ni
 *     indicador de escritura: un "pensando…" falso delante de una respuesta que
 *     ya está en memoria es decorado que engaña.
 *   · El texto libre llama a la Edge Function `recursos-diagnostico`.
 *
 * EL LLM NO CALCULA. Misma regla que Hugo en logistica-chat. El modelo devuelve
 * tres rangos en lenguaje natural ("2 o 3", "más de 10") y es porDiaDe() quien
 * saca la cifra; la multiplicación por 22 días laborables se hace aquí y se
 * enseña en pantalla. Nada de medias del sector ni cifras inventadas.
 *
 * SI LA FUNCIÓN SE CAE no se ve un error: se usa el mismo diagnóstico genérico
 * que devuelve la propia función cuando el modelo falla. Los chips siguen
 * funcionando igual porque nunca dependieron de la red.
 *
 * Los datos se piden UNA sola vez, al final, y solo si lo pide él. El envío
 * sigue el patrón de captación del sitio (contacto/index.html): INSERT en
 * leads_web con un reintento + aviso a Telegram por sendBeacon con Blob
 * 'text/plain;charset=UTF-8' — con 'application/json' salta el preflight CORS,
 * Chrome descarta el POST y sendBeacon devuelve true igual: el aviso se
 * perdería en silencio.
 */
(function () {
  'use strict';

  var stream = document.getElementById('dgStream');
  var chipsBox = document.getElementById('dgChips');
  var chipsLabel = document.getElementById('dgChipsLabel');
  var form = document.getElementById('dgComposer');
  var input = document.getElementById('dgQ');
  if (!stream || !chipsBox || !form || !input) return;

  var SB_URL = 'https://mlaqtniujnvfxcvcourm.supabase.co';
  var SB_KEY = 'sb_publishable_6no6BuOgiA_2nonTJntAuQ_DTqEgrcV';
  var FN_DIAGNOSTICO = SB_URL + '/functions/v1/recursos-diagnostico';
  var NOTIFY_FN = SB_URL + '/functions/v1/whitemoon-notify';
  var ORIGEN = 'recursos-diagnostico';

  var DIAS_LABORABLES = 22;
  var MAX_LEN = 500;

  var REDUCE = false;
  try {
    REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* navegador sin matchMedia: se anima, no pasa nada */ }

  /* ---------------------------------------------------------------- guion */

  var DEMOS = {
    'clinica-dental': 'https://nexusforgeia.github.io/WHITEMOON-CLINICAS-DENTALES/',
    'gestoria': 'https://nexusforgeia.github.io/WHITEMOON-GESTORIAS-DEMO/',
    'taller': 'https://nexusforgeia.github.io/WHITEMOON-TALLERES-COCHES/'
  };

  var CASOS = {
    'clinica-dental': {
      user: 'Tengo una clínica dental y no paro de coger el teléfono.',
      intro: 'La mayoría de esas llamadas son lo mismo: pedir cita, cambiarla o preguntar el horario.',
      si: 'Citas, cambios, horarios y primeras preguntas. Eso libera la recepción entera.',
      no: 'Una urgencia con dolor. Ahí el agente no decide: te avisa al instante en vez de dejarlo en el buzón.',
      pregunta: '¿Cuántas de esas se te quedan sin coger en un día normal?',
      opciones: ['2 o 3', '5 o 6', 'más de 10'],
      unidad: 'llamadas sin coger',
      cierre: 'Una clínica de tu tamaño con esos números. Antes de hablar de nada, lo suyo es que oigas cómo atendería.',
      demoTexto: 'Ver la demo de clínica dental'
    },
    'gestoria': {
      user: 'Gestoría. Me llaman veinte veces por lo mismo.',
      intro: 'Las preguntas que se repiten son justo las que mejor funcionan: estado de un trámite, qué papeles hacen falta, plazos.',
      si: 'Responder lo repetido y recoger los datos del cliente antes de que hables tú con él.',
      no: 'Dar un criterio fiscal sobre el caso concreto de alguien. Eso lo firma un gestor, no un agente.',
      pregunta: '¿Cuántas de esas llamadas repetidas atiendes en un día?',
      opciones: ['4 o 5', '8 o 10', 'más de 15'],
      unidad: 'llamadas repetidas',
      cierre: 'Eso es tiempo de gestor contestando lo que ya está escrito. Lo más rápido es que oigas cómo lo resuelve.',
      demoTexto: 'Ver la demo de gestoría'
    },
    'taller': {
      user: 'Taller. Pierdo llamadas mientras estoy debajo de un coche.',
      intro: 'Esas son recuperables: las que entran cuando no puedes cogerlo no se pierden, se recogen.',
      si: 'Coger el recado, apuntar matrícula y motivo, y avisarte al móvil para que devuelvas la llamada tú.',
      no: 'Diagnosticar la avería o dar un precio por teléfono. Eso pasa por ver el coche.',
      pregunta: '¿Cuántas se te escapan en un día normal?',
      opciones: ['3 o 4', '6 o 7', 'más de 10'],
      unidad: 'llamadas perdidas',
      cierre: 'Cada una es alguien que ha llamado al siguiente taller de la lista. Oye cómo las cogería.',
      demoTexto: 'Ver la demo de taller'
    }
  };

  /* El mismo texto que devuelve la Edge Function cuando el modelo falla: una
     caída no cambia lo que lee nadie, cambia quién lo escribe. */
  var GENERICO = {
    intro: 'Con eso ya puedo orientarte, aunque te preguntaría un par de cosas más.',
    si: 'Lo que se repite todos los días: responder lo de siempre, recoger datos y avisarte al momento.',
    no: 'Lo que exige criterio tuyo o ver algo en persona. Eso no se delega, se te pasa antes.',
    pregunta: '¿Cuántas veces al día te interrumpe eso?',
    opciones: ['2 o 3', '5 o 6', 'más de 10'],
    unidad: 'interrupciones'
  };

  var CIERRE_LIBRE = 'Antes de hablar de nada, lo suyo es que veas uno funcionando en tu sector.';
  var DEMO_LIBRE = { texto: 'Ver las demos por sector', url: '/demos/' };

  /* -------------------------------------------------------------- números */

  /*
   * De un rango en lenguaje natural a una cifra por día. Es la única
   * aritmética del bloque y vive aquí, nunca en el modelo.
   *   "2 o 3"       → 2.5    (media de los dos extremos)
   *   "8 o 10"      → 9
   *   "más de 10"   → 11     (el rango abierto cuenta uno más que su borde)
   *   "menos de 5"  → 4
   *   "4"           → 4
   * Sin ninguna cifra devuelve null y el paso 2 se salta el número en lugar
   * de inventárselo.
   */
  function porDiaDe(texto) {
    var t = String(texto || '').toLowerCase();
    var crudos = t.match(/\d+(?:[.,]\d+)?/g);
    if (!crudos) return null;

    var n = [];
    for (var i = 0; i < crudos.length; i++) {
      var v = parseFloat(crudos[i].replace(',', '.'));
      if (isFinite(v) && v >= 0) n.push(v);
    }
    if (!n.length) return null;
    if (n.length >= 2) return (n[0] + n[1]) / 2;
    if (/\bm[áa]s\b|\+/.test(t)) return n[0] + 1;
    if (/\bmenos\b/.test(t)) return Math.max(1, n[0] - 1);
    return n[0];
  }

  function numES(n) {
    /* 2.5 → "2,5" · 242 → "242". Decimal español, sin decimales inútiles. */
    return String(Math.round(n * 10) / 10).replace('.', ',');
  }

  /* --------------------------------------------------------------- pintar */

  function el(tag, cls, texto) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    /* Siempre textContent: por aquí pasa texto del modelo y de quien escribe. */
    if (texto != null) n.textContent = texto;
    return n;
  }

  function traer(nodo) {
    if (!nodo || !nodo.scrollIntoView) return;
    try {
      nodo.scrollIntoView({ block: 'nearest', behavior: REDUCE ? 'auto' : 'smooth' });
    } catch (e) {
      nodo.scrollIntoView(false);
    }
  }

  function diceUsuario(texto) {
    var m = el('div', 'dg-msg dg-msg--user', texto);
    stream.appendChild(m);
    traer(m);
  }

  function cuerpoBot() {
    var wrap = el('div', 'dg-msg');
    var body = el('div', 'dg-body');
    wrap.appendChild(body);
    stream.appendChild(wrap);
    return body;
  }

  var escribiendo = null;
  function mostrarEscribiendo() {
    escribiendo = el('div', 'dg-typing');
    escribiendo.setAttribute('aria-label', 'Orion está escribiendo');
    for (var i = 0; i < 3; i++) escribiendo.appendChild(document.createElement('i'));
    stream.appendChild(escribiendo);
    traer(escribiendo);
  }
  function quitarEscribiendo() {
    if (escribiendo && escribiendo.parentNode) escribiendo.parentNode.removeChild(escribiendo);
    escribiendo = null;
  }

  function apagar(caja) {
    var bs = caja.getElementsByTagName('button');
    for (var i = 0; i < bs.length; i++) bs[i].disabled = true;
  }

  function track(evento, params) {
    if (typeof window.wmTrack === 'function') window.wmTrack(evento, params);
  }

  /* ------------------------------------------------- paso 1 · duele ------ */

  function paso1(d, sector) {
    var body = cuerpoBot();
    body.appendChild(el('div', null, d.intro));

    var v = el('div', 'dg-verdict');

    var si = el('div', 'dg-v dg-v--si');
    si.appendChild(el('span', 'dg-tag', 'Se automatiza'));
    si.appendChild(el('p', null, d.si));

    var no = el('div', 'dg-v dg-v--no');
    no.appendChild(el('span', 'dg-tag', 'Esto no'));
    no.appendChild(el('p', null, d.no));

    v.appendChild(si);
    v.appendChild(no);
    body.appendChild(v);
    body.appendChild(el('div', 'dg-ask', d.pregunta));

    var opts = el('div', 'dg-opts');
    for (var i = 0; i < d.opciones.length; i++) {
      (function (texto) {
        var b = el('button', 'dg-opt dg-opt--ghost', texto);
        b.type = 'button';
        b.addEventListener('click', function () {
          if (ocupado) return;
          apagar(opts);
          diceUsuario(texto);
          paso2(d, sector, porDiaDe(texto));
        });
        opts.appendChild(b);
      }(d.opciones[i]));
    }
    body.appendChild(opts);
    traer(body.parentNode);
  }

  /* ------------------------------------------------- paso 2 · cuenta ----- */

  function paso2(d, sector, porDia) {
    var body = cuerpoBot();
    var alMes = null;

    /* La cuenta se enseña entera: el número y de dónde sale. Si el rango no
       traía cifra, no hay número — antes que inventarlo, no se pone. */
    if (porDia != null) {
      alMes = Math.round(porDia * DIAS_LABORABLES);
      var caja = el('div', 'dg-num');
      caja.appendChild(el('div', 'dg-num-big', alMes + ' ' + d.unidad + ' al mes'));
      caja.appendChild(el('div', 'dg-num-calc',
        numES(porDia) + ' al día × ' + DIAS_LABORABLES +
        ' días laborables. Tus números, no una media del sector.'));
      body.appendChild(caja);
    }

    track('diagnostico_cantidad', { sector: sector, unidad: d.unidad, al_mes: alMes });

    body.appendChild(el('div', 'dg-ask', d.cierre || CIERRE_LIBRE));

    var opts = el('div', 'dg-opts');

    var demoUrl = DEMOS[sector] || DEMO_LIBRE.url;
    var demo = el('a', 'dg-opt dg-opt--primary', d.demoTexto || DEMO_LIBRE.texto);
    demo.href = demoUrl;
    demo.target = '_blank';
    demo.rel = 'noopener';
    demo.addEventListener('click', function () {
      track('click_diagnostico_demo', { sector: sector });
    });

    var llamada = el('button', 'dg-opt dg-opt--ghost', 'Prefiero que me llamen');
    llamada.type = 'button';
    llamada.addEventListener('click', function () {
      if (ocupado) return;
      apagar(opts);
      diceUsuario('Prefiero que me llamen');
      pasoLead(sector, d, porDia, alMes);
    });

    opts.appendChild(demo);
    opts.appendChild(llamada);
    body.appendChild(opts);
    traer(body.parentNode);
  }

  /* ------------------------------------------------- paso 3 · el lead ---- */

  function pasoLead(sector, d, porDia, alMes) {
    var body = cuerpoBot();
    body.appendChild(el('div', null,
      'Dime tu nombre y un teléfono y te llama alguien del equipo. Nada de formularios ni correos: solo eso.'));

    var f = document.createElement('form');
    f.className = 'dg-lead';
    f.noValidate = true;

    var fila = el('div', 'dg-lead-row');

    var nombre = document.createElement('input');
    nombre.type = 'text';
    nombre.id = 'dgNombre';
    nombre.name = 'nombre';
    nombre.autocomplete = 'name';
    nombre.placeholder = 'Tu nombre';
    nombre.maxLength = 80;

    var tel = document.createElement('input');
    tel.type = 'tel';
    tel.id = 'dgTel';
    tel.name = 'telefono';
    tel.autocomplete = 'tel';
    tel.inputMode = 'tel';
    tel.placeholder = 'Teléfono';
    tel.maxLength = 20;

    var lNombre = el('label', 'dg-sr', 'Tu nombre');
    lNombre.htmlFor = 'dgNombre';
    var lTel = el('label', 'dg-sr', 'Tu teléfono');
    lTel.htmlFor = 'dgTel';

    fila.appendChild(lNombre);
    fila.appendChild(nombre);
    fila.appendChild(lTel);
    fila.appendChild(tel);

    /* Gate RGPD: igual que el resto de formularios del sitio. Sin la casilla
       no se inserta ni se avisa. Una línea, sin sermón. */
    var consentBox = el('div', 'dg-consent');
    var consent = document.createElement('input');
    consent.type = 'checkbox';
    consent.id = 'dgConsent';
    consent.name = 'consent';
    var lConsent = document.createElement('label');
    lConsent.htmlFor = 'dgConsent';
    lConsent.appendChild(document.createTextNode('Acepto la '));
    var pol = el('a', null, 'política de privacidad');
    pol.href = '/politica-privacidad/';
    pol.target = '_blank';
    pol.rel = 'noopener';
    lConsent.appendChild(pol);
    lConsent.appendChild(document.createTextNode('.'));
    consentBox.appendChild(consent);
    consentBox.appendChild(lConsent);

    var enviar = el('button', 'dg-opt dg-opt--primary', 'Que me llamen');
    enviar.type = 'submit';

    var aviso = el('div', 'dg-err');
    aviso.setAttribute('role', 'status');

    f.appendChild(fila);
    f.appendChild(consentBox);
    f.appendChild(enviar);
    f.appendChild(aviso);
    body.appendChild(f);
    traer(body.parentNode);

    var RE_TEL = /^(?:\+?34|0034)?[6789]\d{8}$/;
    var enviado = false;

    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (enviado) return;

      nombre.removeAttribute('aria-invalid');
      tel.removeAttribute('aria-invalid');
      consent.removeAttribute('aria-invalid');
      aviso.textContent = '';

      var vNombre = nombre.value.trim();
      var vTel = tel.value.replace(/[\s.\-()]/g, '');

      if (!vNombre) {
        nombre.setAttribute('aria-invalid', 'true');
        nombre.focus();
        aviso.textContent = 'Dinos cómo te llamas.';
        return;
      }
      if (!RE_TEL.test(vTel)) {
        tel.setAttribute('aria-invalid', 'true');
        tel.focus();
        aviso.textContent = 'Escribe un teléfono de nueve cifras.';
        return;
      }
      if (!consent.checked) {
        consent.setAttribute('aria-invalid', 'true');
        consent.focus();
        aviso.textContent = 'Para poder llamarte necesitamos que aceptes la política de privacidad.';
        return;
      }

      enviado = true;
      enviar.disabled = true;
      enviar.textContent = 'Enviando…';

      /* El diagnóstico entero cabe en el aviso: quien llame ya sabe de qué
         hablar antes de marcar. */
      var resumen = 'Diagnóstico Orion en /recursos/. ' +
        (alMes != null ? alMes + ' ' + d.unidad + ' al mes (' + numES(porDia) + '/día × ' + DIAS_LABORABLES + '). ' : '') +
        'Se automatiza: ' + d.si;

      var interes = 'Diagnóstico Orion · ' + sector;

      /* Los dos envíos arrancan a la vez; el aviso no espera al INSERT. */
      avisar({ nombre: vNombre, telefono: vTel, interes: interes, mensaje: resumen });
      insertLead({
        nombre: vNombre,
        telefono: vTel,
        sector: sector,
        interes: interes,
        mensaje: resumen,
        origen: ORIGEN,
        fecha: new Date().toISOString()
      }).then(function (entro) {
        if (!entro) {
          enviado = false;
          enviar.disabled = false;
          enviar.textContent = 'Que me llamen';
          aviso.textContent = 'No se pudo enviar. Prueba otra vez o escríbenos por WhatsApp al 643 199 580.';
          return;
        }
        track('lead_captured', { origen: ORIGEN, sector: sector });
        var ok = el('div', 'dg-body', 'Hecho, ' + vNombre + '. Te llamamos en menos de 24 h laborables. Mientras tanto, la demo de tu sector sigue ahí arriba.');
        if (f.parentNode) f.parentNode.replaceChild(ok, f);
        traer(ok);
      });
    });

    nombre.focus();
  }

  /* ------------------------------------------------------------ captación */

  function postLead(lead) {
    return fetch(SB_URL + '/rest/v1/leads_web', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(lead)
    }).then(function (r) {
      if (!r.ok) console.warn('[recursos-diagnostico] leads_web ' + r.status);
      return r.ok;
    }).catch(function (err) {
      console.warn('[recursos-diagnostico] leads_web error', err);
      return false;
    });
  }

  /* Supabase devuelve 503 transitorios esporádicos: sin reintento ese lead se
     pierde. */
  function insertLead(lead) {
    return postLead(lead).then(function (entro) {
      if (entro) return true;
      return new Promise(function (res) {
        setTimeout(function () { postLead(lead).then(res); }, 800);
      });
    });
  }

  function avisar(payload) {
    var cuerpo = JSON.stringify(payload);
    var sent = false;
    try {
      if (navigator.sendBeacon) {
        /* 'text/plain;charset=UTF-8' a propósito: con 'application/json' salta
           el preflight CORS, Chrome descarta el POST y sendBeacon devuelve true
           igual. El body sigue siendo JSON y la función lo parsea igual. */
        sent = navigator.sendBeacon(NOTIFY_FN, new Blob([cuerpo], { type: 'text/plain;charset=UTF-8' }));
      }
    } catch (e) { /* sin sendBeacon usable, cae al fetch de abajo */ }
    if (!sent) {
      fetch(NOTIFY_FN, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY
        },
        body: cuerpo
      }).catch(function () { /* silencioso: el cliente no tiene que ver esto */ });
    }
  }

  /* -------------------------------------------------------- texto libre -- */

  var ocupado = false;

  function normaliza(bruto) {
    /* La función ya valida, pero el navegador no da nada por hecho: si falta
       cualquier pieza se usa el genérico entero, no un híbrido a medias. */
    if (!bruto || typeof bruto !== 'object') return null;
    var op = Array.isArray(bruto.opciones) ? bruto.opciones : [];
    if (!bruto.intro || !bruto.si || !bruto.no || !bruto.pregunta || !bruto.unidad) return null;
    if (op.length !== 3) return null;
    return {
      intro: String(bruto.intro),
      si: String(bruto.si),
      no: String(bruto.no),
      pregunta: String(bruto.pregunta),
      unidad: String(bruto.unidad),
      opciones: [String(op[0]), String(op[1]), String(op[2])]
    };
  }

  function pregunta(texto) {
    ocupado = true;
    input.disabled = true;
    form.querySelector('.dg-send').disabled = true;
    mostrarEscribiendo();

    fetch(FN_DIAGNOSTICO, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY
      },
      body: JSON.stringify({ mensaje: texto })
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (data) {
        quitarEscribiendo();
        paso1(normaliza(data) || GENERICO, 'texto-libre');
        ocupado = false;
        input.disabled = false;
        form.querySelector('.dg-send').disabled = false;
      });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var v = input.value.trim();
    if (!v || ocupado) return;
    if (v.length > MAX_LEN) v = v.slice(0, MAX_LEN);
    input.value = '';
    diceUsuario(v);
    track('diagnostico_pregunta_libre', { sector: 'texto-libre', fuente: 'texto' });
    pregunta(v);
  });

  /* ------------------------------------------------------------- chips --- */

  var chips = chipsBox.querySelectorAll('[data-dg-caso]');
  for (var c = 0; c < chips.length; c++) {
    (function (chip) {
      var sector = chip.getAttribute('data-dg-caso');
      var caso = CASOS[sector];
      if (!caso) return;
      chip.addEventListener('click', function () {
        if (ocupado) return;
        chip.disabled = true;
        diceUsuario(caso.user);
        track('click_diagnostico_chip', { sector: sector });
        /* Sin red y sin espera fingida: el guion ya está aquí. */
        paso1(caso, sector);

        var quedan = false;
        for (var i = 0; i < chips.length; i++) if (!chips[i].disabled) quedan = true;
        if (!quedan && chipsLabel) chipsLabel.textContent = 'O escríbele tú abajo:';
      });
    }(chips[c]));
  }

  /* --------------------------------------------------------- medición ---- */

  var bloque = document.getElementById('sec-diagnostico');
  if (bloque && 'IntersectionObserver' in window) {
    var visto = false;
    var obs = new IntersectionObserver(function (entradas) {
      for (var i = 0; i < entradas.length; i++) {
        if (!entradas[i].isIntersecting || visto) continue;
        visto = true;
        track('diagnostico_visible', {});
        obs.disconnect();
      }
    }, { threshold: 0.35 });
    obs.observe(bloque);
  }
})();
