/* ─────────────────────────────────────────────────────────────────────────
   /inteligencia-artificial/ · avisos al móvil (#avisos-movil) y el agente
   por dentro (#por-dentro). Mismo motor que wm-software-demo.js.
   Todo es decorativo y con datos de ejemplo: la página se entiende entera
   sin este fichero (el HTML trae tres avisos fijos y el primer flujo
   completo; sólo faltan los cables y las pestañas, que van con hidden
   hasta que este JS las muestra).
   - Las animaciones sólo corren con la sección en pantalla y la pestaña
     visible: .is-vivo en la <section> también despausa las de CSS.
   - prefers-reduced-motion: nada se mueve y todo queda en su estado final.
   - Todo el texto entra por textContent.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  // Llama a start() al entrar en pantalla y a stop() al salir o al ocultar
  // la pestaña. Sin IntersectionObserver la sección se queda quieta.
  function vigilar(sec, start, stop) {
    if (!('IntersectionObserver' in window)) return;
    var visible = false;
    var activo = false;
    function sync() {
      var debe = visible && !document.hidden;
      if (debe === activo) return;
      activo = debe;
      sec.classList.toggle('is-vivo', debe);
      if (debe) start(); else stop();
    }
    new IntersectionObserver(function (entries) {
      visible = entries[entries.length - 1].isIntersecting;
      sync();
    }, { rootMargin: '80px 0px' }).observe(sec);
    document.addEventListener('visibilitychange', sync);
  }

  /* ── 1 · Avisos en la pantalla de bloqueo ───────────────────────────── */
  (function () {
    var sec = document.getElementById('avisos-movil');
    var notis = document.getElementById('wmia-notis');
    var reloj = document.getElementById('wmia-reloj');
    // Con movimiento reducido se quedan los tres avisos fijos del HTML.
    if (!sec || !notis || !reloj || reduce) return;

    // Teléfonos enmascarados: ejemplo del formato, no datos reales.
    var NOTIS = [
      ['23:47', 'Nuevo contacto', 'Laura · 6•• ••• 412 · Quiere saber qué incluye una limpieza'],
      ['00:12', 'Nuevo contacto con cita', 'Andrés · 6•• ••• 208 · Jueves 17:30 · Corte'],
      ['07:05', 'Consulta para ti', 'Marta · 6•• ••• 931 · «¿Revisáis un clásico del 72?»'],
      ['08:31', 'Nuevo contacto', 'Pablo · 6•• ••• 574 · Quiere visitar el piso de la calle Mayor']
    ];
    var k = 0;
    var tLoop = 0;
    var empezado = false;

    function poner(a) {
      var n = el('div', 'wmia-noti is-nueva');
      var cuerpo = el('div');
      var cab = el('div', 'wmia-noti-cab');
      cab.appendChild(el('span', null, 'Asistente IA'));
      cab.appendChild(el('span', null, 'ahora'));
      cuerpo.appendChild(cab);
      cuerpo.appendChild(el('b', null, a[1]));
      cuerpo.appendChild(el('span', 'wmia-noti-t', a[2]));
      n.appendChild(el('div', 'wmia-logo', 'IA'));
      n.appendChild(cuerpo);
      var previos = notis.querySelectorAll('.wmia-noti-cab span:last-child');
      for (var i = 0; i < previos.length; i++) previos[i].textContent = 'antes';
      notis.insertBefore(n, notis.firstChild);
      while (notis.children.length > 3) notis.removeChild(notis.lastChild);
      reloj.textContent = a[0];
    }
    function siguiente() { poner(NOTIS[k % NOTIS.length]); k++; }

    vigilar(sec, function () {
      // La primera vez (aún fuera de pantalla, por el rootMargin) se cambian
      // los tres avisos fijos por el primero y a partir de ahí van entrando.
      if (!empezado) {
        empezado = true;
        while (notis.firstChild) notis.removeChild(notis.firstChild);
        siguiente();
      }
      tLoop = setInterval(siguiente, 3000);
    }, function () {
      clearInterval(tLoop);
    });
  })();

  /* ── 2 · El agente por dentro: pestañas, cables, secuencia y registro ── */
  (function () {
    var sec = document.getElementById('por-dentro');
    var lienzo = document.getElementById('wmia-lienzo');
    var svg = document.getElementById('wmia-cables');
    var log = document.getElementById('wmia-log');
    var tabs = document.getElementById('wmia-tabs');
    var holo = document.getElementById('wmia-holo');
    var elSigla = document.getElementById('wmia-sigla');
    var elNegocio = document.getElementById('wmia-negocio');
    var elSub = document.getElementById('wmia-sub');
    if (!sec || !lienzo || !svg || !log || !tabs || !elSigla || !elNegocio || !elSub) return;

    // Flujos de ejemplo (datos ficticios). El primero es el que trae el HTML.
    // Cada nodo: [id, título, texto, icono, etiqueta, columna, fila, esHub]
    // reloj: hora de ejemplo con la que arranca el registro de ese flujo.
    var FLUJOS = [
      { id: 'noche', reloj: [23, 47, 0], tab: 'Te escriben de noche', sigla: 'DO', negocio: 'Clínica Dental Olmo', sub: 'Miércoles, 23:47 · la clínica está cerrada',
        cols: '1fr 1fr 1fr',
        nodos: [
          ['web', 'Mensaje en tu web', '«¿Qué incluye una limpieza?»', '◎', '23:47', '1', '1'],
          ['ia', 'Agente IA', 'Entiende la pregunta al momento', '◐', 'IA', '2', '1', true],
          ['resp', 'Responde con tus datos', 'Lo que incluye y cuánto dura, según tu información', '▤', '', '3', '1'],
          ['datos', 'Pide nombre y teléfono', '«¿Quieres que la clínica te llame?»', '✎', '', '3', '2'],
          ['aviso', 'Aviso a tu móvil', 'Nuevo contacto · quiere limpieza', '↯', '', '2', '2'],
          ['llamas', 'Por la mañana llamas tú', 'Con todo lo que necesitas saber', '☎', 'TÚ', '1', '2']
        ],
        pasos: [
          ['web', null, 'Web · 23:47 · «¿Qué incluye una limpieza?»'],
          ['ia', 'web>ia', 'Agente IA: pregunta entendida'],
          ['resp', 'ia>resp', 'Responde con la información de la clínica'],
          ['datos', 'resp>datos', 'Pide nombre y teléfono · los deja'],
          ['aviso', 'datos>aviso', 'Aviso enviado a tu móvil'],
          ['llamas', 'aviso>llamas', 'Mañana a primera hora: llamada']
        ] },
      { id: 'cita', reloj: [18, 20, 0], tab: 'Quiere una cita', sigla: 'PB', negocio: 'Peluquería Brisa', sub: 'Domingo, 18:20 · el salón no abre',
        cols: '1fr 1.1fr 1.3fr',
        nodos: [
          ['web', 'Mensaje en tu web', '«¿Tenéis hueco el jueves por la tarde?»', '◎', 'TRIGGER', '1', '2 / span 2'],
          ['ia', 'Agente IA', 'Entiende día, franja y servicio', '◐', 'IA', '2', '2 / span 2', true],
          ['huecos', 'Huecos que tú marcas', 'Jueves 17:30 o 18:15', '▦', '', '3', '1'],
          ['elige', 'El cliente elige', '17:30 · deja nombre y teléfono', '✓', '', '3', '2'],
          ['aviso', 'Aviso a tu móvil', 'Nuevo contacto · jueves 17:30', '↯', '', '3', '3'],
          ['panel', 'En tu panel', 'Con Core Spark Web, queda guardado', '▤', 'CORE', '3', '4']
        ],
        pasos: [
          ['web', null, 'Web · 18:20 · «¿Hueco el jueves por la tarde?»'],
          ['ia', 'web>ia', 'Agente IA: jueves, por la tarde'],
          ['huecos', 'ia>huecos', 'Ofrece jueves 17:30 o 18:15'],
          ['elige', 'ia>elige', 'Elige 17:30 · deja sus datos'],
          ['aviso', 'ia>aviso', 'Aviso: nuevo contacto con cita'],
          ['panel', 'ia>panel', 'Contacto guardado en el panel']
        ] },
      { id: 'nosabe', reloj: [21, 14, 0], tab: 'Algo que no sabe', sigla: 'TS', negocio: 'Talleres Sur', sub: 'Una pregunta que no está en su información',
        cols: '1fr 1fr 1fr',
        nodos: [
          ['web', 'Pregunta poco habitual', '«¿Podéis revisar un coche clásico del 72?»', '◎', 'TRIGGER', '1', '1'],
          ['ia', 'Agente IA', 'Busca en lo que sabe del taller', '◐', 'IA', '2', '1', true],
          ['dice', 'No se lo inventa', '«Eso te lo confirma el taller»', '!', '', '3', '1'],
          ['datos', 'Toma el contacto', 'Nombre, teléfono y la pregunta', '✎', '', '3', '2'],
          ['aviso', 'Te pasa la consulta', 'Tal cual la escribió el cliente', '↯', '', '2', '2'],
          ['tu', 'Respondes tú', 'Con tu criterio, no con una suposición', '☎', 'TÚ', '1', '2']
        ],
        pasos: [
          ['web', null, 'Web · «¿Revisáis un clásico del 72?»'],
          ['ia', 'web>ia', 'Agente IA: no está en la información del taller'],
          ['dice', 'ia>dice', 'Responde: «eso te lo confirma el taller»'],
          ['datos', 'dice>datos', 'Toma nombre, teléfono y la pregunta'],
          ['aviso', 'datos>aviso', 'Consulta enviada a tu móvil'],
          ['tu', 'aviso>tu', 'Respondes tú con criterio']
        ] },
      { id: 'documentos', reloj: [22, 5, 0], tab: 'Con tus documentos', sigla: 'IC', negocio: 'Inmobiliaria Cumbre', sub: 'Proyecto a medida (bajo consulta): responde con sus propios documentos',
        cols: '1fr 1.1fr 1.3fr',
        nodos: [
          ['fichas', 'Fichas de pisos', 'Superficie, zona y estado', '▢', 'A MEDIDA', '1', '1'],
          ['cond', 'Condiciones', 'Requisitos para alquilar', '▢', '', '1', '2'],
          ['faq', 'Preguntas habituales', 'Visitas, fianzas y plazos', '▢', '', '1', '3'],
          ['preg', 'Pregunta del cliente', '«¿Qué piden para alquilar el de la calle Mayor?»', '◎', '', '1', '4'],
          ['base', 'Tus documentos', 'Busca la parte que responde', '◈', 'IA', '2', '2 / span 2', true],
          ['resp', 'Responde', 'Según tus condiciones, con la ficha de ese piso', '▤', '', '3', '1'],
          ['limite', 'Si no está, lo dice', 'Y te pasa la consulta', '!', '', '3', '2'],
          ['visita', 'Pide visita', 'Nombre, teléfono y día que le va bien', '✓', '', '3', '3'],
          ['aviso', 'Aviso a tu móvil', 'Nuevo contacto · quiere visitarlo', '↯', '', '3', '4']
        ],
        pasos: [
          ['preg', 'preg>base', 'Web · «¿Qué piden para alquilar el de la calle Mayor?»'],
          ['fichas', 'fichas>base', 'Consulta la ficha de ese piso'],
          ['cond', 'cond>base', 'Consulta tus condiciones de alquiler'],
          ['base', 'faq>base', 'Encuentra la parte que responde'],
          ['resp', 'base>resp', 'Responde según tus condiciones'],
          ['visita', 'base>visita', 'El cliente pide visita · deja sus datos'],
          ['aviso', 'base>aviso', 'Aviso: nuevo contacto para visita'],
          ['limite', 'base>limite', 'Si algo no está, lo dice y te lo pasa']
        ] }
    ];

    var actual = null;
    var elegido = -1;
    var pares = {};
    var paso = 0;
    var tPaso = 0;
    var tCambia = 0;
    // El flujo se monta (nodos, cables, pestañas) al acercarse a la vista:
    // medir los nodos al cargar forzaría una maquetación de toda la página.
    var montado = false;

    function nodo(n) { return lienzo.querySelector('[data-n="' + n + '"]'); }
    function indice(id) {
      for (var i = 0; i < FLUJOS.length; i++) if (FLUJOS[i].id === id) return i;
      return -1;
    }

    // Cable entre dos nodos: horizontal si el destino está a la derecha, o a
    // la izquierda cuando se solapan en vertical; si no, vertical hacia abajo
    // o hacia arriba. Se mide con offset* para que la inclinación 3D no
    // deforme el trazado.
    function camino(a, b) {
      var ax = a.offsetLeft, ay = a.offsetTop, aw = a.offsetWidth, ah = a.offsetHeight;
      var bx = b.offsetLeft, by = b.offsetTop, bw = b.offsetWidth, bh = b.offsetHeight;
      var der = bx >= ax + aw - 4;
      var solapaY = ay < by + bh && by < ay + ah;
      if (der || (solapaY && bx + bw <= ax + 4)) {
        var x1 = der ? ax + aw : ax, y1 = ay + ah / 2, x2 = der ? bx : bx + bw, y2 = by + bh / 2, dx = (x2 - x1) / 2;
        return 'M' + x1 + ',' + y1 + ' C' + (x1 + dx) + ',' + y1 + ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2;
      }
      var baja = by >= ay;
      var vx1 = ax + aw / 2, vy1 = baja ? ay + ah : ay, vx2 = bx + bw / 2, vy2 = baja ? by : by + bh;
      var dy = (baja ? 1 : -1) * Math.max(Math.abs(vy2 - vy1) / 2, 18);
      return 'M' + vx1 + ',' + vy1 + ' C' + vx1 + ',' + (vy1 + dy) + ' ' + vx2 + ',' + (vy2 - dy) + ' ' + vx2 + ',' + vy2;
    }
    var rafCables = 0;
    function dibujar() {
      rafCables = 0;
      Object.keys(pares).forEach(function (k) {
        var c = pares[k];
        if (!c.a || !c.b) return;
        var d = camino(c.a, c.b);
        c.base.setAttribute('d', d);
        c.luz.setAttribute('d', d);
      });
    }
    function pedirDibujo() {
      if (!rafCables) rafCables = requestAnimationFrame(dibujar);
    }
    var ro = 'ResizeObserver' in window ? new ResizeObserver(pedirDibujo) : null;
    if (!ro) window.addEventListener('resize', pedirDibujo);
    function observar() {
      if (!ro) return;
      ro.disconnect();
      ro.observe(lienzo);
      var ns = lienzo.querySelectorAll('.wmia-nodo');
      for (var i = 0; i < ns.length; i++) ro.observe(ns[i]);
    }

    // Registro: hora de ejemplo que avanza desde el reloj del flujo, máximo 3 líneas.
    var h = 0, m = 0, s = 0;
    function dos(x) { return (x < 10 ? '0' : '') + x; }
    function hora() {
      s += 2;
      if (s >= 60) { s -= 60; m++; }
      if (m >= 60) { m -= 60; h = (h + 1) % 24; }
      return dos(h) + ':' + dos(m) + ':' + dos(s);
    }
    function linea(txt) {
      var d = el('div', 'wmia-linea');
      d.appendChild(el('time', null, hora()));
      d.appendChild(el('span', null, txt));
      log.insertBefore(d, log.firstChild);
      while (log.children.length > 3) log.removeChild(log.lastChild);
    }

    function marcar(p) {
      var acts = lienzo.querySelectorAll('.wmia-nodo.is-act');
      for (var i = 0; i < acts.length; i++) acts[i].classList.remove('is-act');
      Object.keys(pares).forEach(function (k) { pares[k].luz.classList.remove('is-on'); });
      var n = nodo(p[0]);
      if (n) n.classList.add('is-act');
      if (p[1] && pares[p[1]]) pares[p[1]].luz.classList.add('is-on');
      linea(p[2]);
    }

    function crearNodo(n) {
      var d = el('div', 'wmia-nodo' + (n[7] ? ' wmia-hub' : ''));
      d.setAttribute('data-n', n[0]);
      d.style.setProperty('--c', n[5]);
      d.style.setProperty('--r', n[6]);
      if (n[4]) {
        var tag = el('span', 'wmia-tag', n[4]);
        tag.setAttribute('aria-hidden', 'true');
        d.appendChild(tag);
      }
      // U+FE0E: que ☎, ✎ y compañía salgan como texto y no como emoji.
      var ic = el('span', 'wmia-ic', n[3] + '︎');
      ic.setAttribute('aria-hidden', 'true');
      var tx = el('div');
      tx.appendChild(el('b', null, n[1]));
      tx.appendChild(el('small', null, n[2]));
      d.appendChild(ic);
      d.appendChild(tx);
      return d;
    }

    function montar(f) {
      actual = f;
      elSigla.textContent = f.sigla;
      elNegocio.textContent = f.negocio;
      elSub.textContent = f.sub;
      lienzo.style.setProperty('--cols', f.cols);

      var viejos = lienzo.querySelectorAll('.wmia-nodo');
      for (var i = 0; i < viejos.length; i++) lienzo.removeChild(viejos[i]);
      var paths = svg.querySelectorAll('path');
      for (var j = 0; j < paths.length; j++) svg.removeChild(paths[j]);
      f.nodos.forEach(function (n) { lienzo.appendChild(crearNodo(n)); });

      // Un cable por cada paso que lo nombra.
      pares = {};
      f.pasos.forEach(function (p, k) {
        if (!p[1]) return;
        var ab = p[1].split('>');
        var base = document.createElementNS(NS, 'path');
        base.setAttribute('class', 'wmia-cable-base');
        var luz = document.createElementNS(NS, 'path');
        luz.setAttribute('class', 'wmia-cable-luz');
        luz.style.animationDelay = (-0.7 * k) + 's';
        svg.appendChild(base);
        svg.appendChild(luz);
        pares[p[1]] = { a: nodo(ab[0]), b: nodo(ab[1]), base: base, luz: luz };
      });
      dibujar();
      observar();

      while (log.firstChild) log.removeChild(log.firstChild);
      h = f.reloj[0]; m = f.reloj[1]; s = f.reloj[2];
      if (reduce) {
        // Estado final: todos los nodos hechos, cables encendidos y quietos,
        // y el registro con los tres últimos pasos.
        var ns = lienzo.querySelectorAll('.wmia-nodo');
        for (var q = 0; q < ns.length; q++) ns[q].classList.add('is-act');
        Object.keys(pares).forEach(function (k) { pares[k].luz.classList.add('is-on'); });
        f.pasos.slice(-3).forEach(function (p) { linea(p[2]); });
        return;
      }
      // En reposo: los tres primeros pasos ya hechos.
      for (var r = 0; r < 3; r++) marcar(f.pasos[r]);
      paso = 3;
    }

    // Pestañas (roving tabindex: sólo la seleccionada entra en el Tab).
    FLUJOS.forEach(function (f, i) {
      var bt = el('button', 'wmia-tab', f.tab);
      bt.type = 'button';
      bt.id = 'wmia-tab-' + f.id;
      bt.setAttribute('role', 'tab');
      bt.setAttribute('aria-controls', 'wmia-lienzo');
      bt.setAttribute('aria-selected', 'false');
      bt.tabIndex = -1;
      bt.addEventListener('click', function () { elegir(i, true); });
      tabs.appendChild(bt);
    });
    tabs.addEventListener('keydown', function (e) {
      var n = FLUJOS.length;
      var i;
      if (e.key === 'ArrowRight') i = (elegido + 1) % n;
      else if (e.key === 'ArrowLeft') i = (elegido + n - 1) % n;
      else if (e.key === 'Home') i = 0;
      else if (e.key === 'End') i = n - 1;
      else return;
      e.preventDefault();
      elegir(i, true);
      tabs.children[i].focus();
    });

    // Lleva la pestaña a la vista dentro de la barra, sin mover la página.
    function enVista(bt) {
      var izq = bt.offsetLeft - 4;
      var der = bt.offsetLeft + bt.offsetWidth + 4 - tabs.clientWidth;
      if (izq < tabs.scrollLeft) tabs.scrollLeft = izq;
      else if (der > tabs.scrollLeft) tabs.scrollLeft = der;
    }

    function elegir(i, animar) {
      if (i < 0 || i === elegido) return;
      elegido = i;
      var f = FLUJOS[i];
      for (var j = 0; j < tabs.children.length; j++) {
        tabs.children[j].setAttribute('aria-selected', String(j === i));
        tabs.children[j].tabIndex = j === i ? 0 : -1;
      }
      lienzo.setAttribute('aria-labelledby', 'wmia-tab-' + f.id);
      if (!montado) {
        if (animar) montarYa();
        return;
      }
      enVista(tabs.children[i]);
      clearTimeout(tCambia);
      if (!animar || reduce) { lienzo.classList.remove('is-cambia'); montar(f); return; }
      lienzo.classList.add('is-cambia');
      tCambia = setTimeout(function () {
        montar(f);
        lienzo.classList.remove('is-cambia');
      }, 250);
    }

    // Enlaces directos: #noche, #cita, #nosabe, #documentos eligen su
    // pestaña. El scroll lo hace el navegador hasta el <span> ancla (también
    // sin JS).
    function hashIndice(hash) {
      return hash ? indice(hash.slice(1)) : -1;
    }
    window.addEventListener('hashchange', function () { elegir(hashIndice(location.hash), true); });
    // Si el hash ya es ese, pulsar el enlace no dispara hashchange.
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (a) elegir(hashIndice(a.getAttribute('href')), true);
    });

    function montarYa() {
      if (montado) return;
      montado = true;
      tabs.hidden = false;
      lienzo.setAttribute('role', 'tabpanel');
      // Sin nada enfocable dentro, el panel entra en el Tab (patrón ARIA de pestañas).
      lienzo.tabIndex = 0;
      enVista(tabs.children[elegido]);
      montar(FLUJOS[elegido]);
    }

    var inicial = hashIndice(location.hash);
    elegir(Math.max(0, inicial), false);
    if (inicial >= 0 || !('IntersectionObserver' in window)) {
      montarYa();
    } else {
      var ioMontar = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          if (entries[e].isIntersecting) { ioMontar.disconnect(); montarYa(); return; }
        }
      }, { rootMargin: '400px 0px' });
      ioMontar.observe(sec);
    }

    if (!reduce) {
      vigilar(sec, function () {
        tPaso = setInterval(function () {
          if (!actual || lienzo.classList.contains('is-cambia')) return;
          marcar(actual.pasos[paso]);
          paso = (paso + 1) % actual.pasos.length;
        }, 1500);
      }, function () {
        clearInterval(tPaso);
      });
    }

    // Inclinación con el puntero: sólo ratón/trackpad, nunca en táctil.
    if (holo && !reduce && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      var rafTilt = 0, px = 0, py = 0;
      var inclinar = function () {
        rafTilt = 0;
        var rc = holo.getBoundingClientRect();
        var x = (px - rc.left) / rc.width - 0.5;
        var y = (py - rc.top) / rc.height - 0.5;
        holo.style.setProperty('--wmia-rx', (-y * 4).toFixed(2) + 'deg');
        holo.style.setProperty('--wmia-ry', (x * 5).toFixed(2) + 'deg');
      };
      holo.addEventListener('pointermove', function (e) {
        px = e.clientX;
        py = e.clientY;
        if (!rafTilt) rafTilt = requestAnimationFrame(inclinar);
      });
      holo.addEventListener('pointerleave', function () {
        if (rafTilt) { cancelAnimationFrame(rafTilt); rafTilt = 0; }
        holo.style.removeProperty('--wmia-rx');
        holo.style.removeProperty('--wmia-ry');
      });
    }
  })();
})();
