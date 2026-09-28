/* ─────────────────────────────────────────────────────────────────────────
   /desarrollo-software/ · móvil con app (#app-movil) y flujos de ejemplo (#flujo-ia).
   Todo es decorativo y con datos de ejemplo: la página se entiende entera
   sin este fichero (el HTML trae el primer flujo completo; sólo faltan los
   cables y las pestañas, que van con hidden hasta que este JS las muestra).
   - Las animaciones sólo corren con la sección en pantalla y la pestaña
     visible: .is-vivo en la <section> también despausa las de CSS.
   - prefers-reduced-motion: nada se mueve y todo queda en su estado final.
   - Sin innerHTML: todo el texto entra por textContent.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

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

  /* ── 1 · Aviso push en el móvil ─────────────────────────────────────── */
  (function () {
    var sec = document.getElementById('app-movil');
    var aviso = document.getElementById('wmapp-aviso');
    var tit = document.getElementById('wmapp-aviso-t');
    var sub = document.getElementById('wmapp-aviso-s');
    if (!sec || !aviso || !tit || !sub || reduce) return;

    var avisos = [
      ['Nueva cita confirmada', 'Revisión ITV · jueves 10:30'],
      ['Pago recibido', 'Factura F-0412 · cobrada'],
      ['Cliente en recepción', 'L. Gómez · cambio de aceite']
    ];
    // El primer aviso ya está en el HTML y visible: se arranca desde el 2º.
    var k = 1;
    var tOut = 0;
    var tLoop = 0;
    aviso.classList.add('is-anim', 'is-ver');

    function ocultarLuego() {
      clearTimeout(tOut);
      tOut = setTimeout(function () { aviso.classList.remove('is-ver'); }, 3200);
    }
    function ciclo() {
      var a = avisos[k % avisos.length];
      k++;
      tit.textContent = a[0];
      sub.textContent = a[1];
      aviso.classList.add('is-ver');
      ocultarLuego();
    }

    vigilar(sec, function () {
      if (aviso.classList.contains('is-ver')) ocultarLuego();
      tLoop = setInterval(ciclo, 5200);
    }, function () {
      clearTimeout(tOut);
      clearInterval(tLoop);
    });
  })();

  /* ── 2 · Flujos de ejemplo: pestañas, cables, secuencia y registro ────── */
  (function () {
    var sec = document.getElementById('flujo-ia');
    var lienzo = document.getElementById('wmflujo-lienzo');
    var svg = document.getElementById('wmflujo-cables');
    var log = document.getElementById('wmflujo-log');
    var tabs = document.getElementById('wmflujo-tabs');
    var holo = document.getElementById('wmflujo-holo');
    var elSigla = document.getElementById('wmflujo-sigla');
    var elNegocio = document.getElementById('wmflujo-negocio');
    var elSub = document.getElementById('wmflujo-sub');
    if (!sec || !lienzo || !svg || !log || !tabs || !elSigla || !elNegocio || !elSub) return;

    // Flujos de ejemplo (datos ficticios). El primero es el que trae el HTML.
    // Cada nodo: [id, título, texto, icono, etiqueta, columna, fila, esHub]
    // El de «Integración de IA» usa el id "iadoc" para que su ancla
    // (#flujo-iadoc) no choque con #flujo-ia, que es la sección.
    var FLUJOS = [
      { id: 'web', tab: 'Agente IA en tu web', sigla: 'TR', negocio: 'Taller Rivas', sub: 'Flujo «Web → cita → cobro»',
        cols: '1fr 1.1fr 1.3fr',
        nodos: [
          ['web', 'Web del cliente', 'Un visitante pide cita para la ITV en el chat', '◎', 'TRIGGER', '1', '2 / span 2'],
          ['ia', 'Agente IA', 'Entiende, busca hueco y reserva el jueves 10:30', '◐', 'IA', '2', '2 / span 2', true],
          ['admin', 'Admin · CRM', 'Ficha del cliente y cita en agenda', '▤', '', '3', '1'],
          ['correo', 'Correo', 'Confirmación y recordatorio 24 h antes', '✉', '', '3', '2'],
          ['fact', 'Facturación', 'Presupuesto y factura listos al cerrar', '€', '', '3', '3'],
          ['com', 'Comercial', 'Aviso: ofrecer revisión anual', '↗', '', '3', '4']
        ],
        pasos: [
          ['web', null, 'Web: visitante abre el chat · pide cita ITV'],
          ['ia', 'web>ia', 'Agente IA: hueco jueves 10:30 · reservado'],
          ['admin', 'ia>admin', 'CRM: cita creada · cliente actualizado'],
          ['correo', 'ia>correo', 'Correo de confirmación enviado'],
          ['fact', 'ia>fact', 'Presupuesto preparado · pre-ITV'],
          ['com', 'ia>com', 'Comercial: tarea «ofrecer revisión anual»']
        ] },
      { id: 'empresas', tab: 'Software para empresas', sigla: 'DN', negocio: 'Distribuciones Norte', sub: 'Plataforma interna «Pedido → almacén → reparto»',
        cols: '1fr 1.1fr 1.3fr',
        nodos: [
          ['pedido', 'Pedido de un cliente', 'Entra por su portal, sin correos ni hojas de cálculo', '⊞', 'TRIGGER', '1', '2 / span 2'],
          ['plat', 'Plataforma interna', 'Comprueba stock y condiciones del cliente', '◈', 'PLATAFORMA', '2', '2 / span 2', true],
          ['almacen', 'Almacén', 'Orden de preparación con ubicaciones', '▦', '', '3', '1'],
          ['reparto', 'Reparto', 'Pedido asignado a la ruta de mañana', '➜', '', '3', '2'],
          ['albaran', 'Facturación', 'Albarán y factura al entregar', '€', '', '3', '3'],
          ['aviso', 'Aviso al cliente', '«Tu pedido va en camino», con seguimiento', '✉', '', '3', '4']
        ],
        pasos: [
          ['pedido', null, 'Portal: pedido nuevo · Bar Central'],
          ['plat', 'pedido>plat', 'Plataforma: stock y condiciones OK'],
          ['almacen', 'plat>almacen', 'Almacén: orden de preparación P-2291'],
          ['reparto', 'plat>reparto', 'Reparto: asignado a la ruta Norte · mañana'],
          ['albaran', 'plat>albaran', 'Facturación: albarán listo para la entrega'],
          ['aviso', 'plat>aviso', 'Cliente: aviso «pedido en camino» enviado']
        ] },
      { id: 'erp', tab: 'ERP y CRM', sigla: 'IV', negocio: 'Instalaciones Vega', sub: 'Del presupuesto aceptado a la obra',
        cols: '1fr 1.1fr 1.3fr',
        nodos: [
          ['firma', 'Presupuesto aceptado', 'El cliente lo firma desde el enlace', '✓', 'TRIGGER', '1', '2 / span 2'],
          ['erp', 'ERP', 'Convierte el presupuesto en una obra', '▤', 'ERP', '2', '2 / span 2', true],
          ['compras', 'Compras', 'Pedido del material al proveedor', '▣', '', '3', '1'],
          ['plan', 'Planificación', 'Técnico y fecha según disponibilidad', '◷', '', '3', '2'],
          ['anticipo', 'Facturación', 'Factura de anticipo al cliente', '€', '', '3', '3'],
          ['crm', 'CRM', 'Cliente «en obra» y seguimiento agendado', '◉', 'CRM', '3', '4']
        ],
        pasos: [
          ['firma', null, 'Firma: presupuesto PR-0877 aceptado'],
          ['erp', 'firma>erp', 'ERP: obra O-311 creada'],
          ['compras', 'erp>compras', 'Compras: pedido de material enviado'],
          ['plan', 'erp>plan', 'Planificación: técnico asignado · martes'],
          ['anticipo', 'erp>anticipo', 'Facturación: factura de anticipo emitida'],
          ['crm', 'erp>crm', 'CRM: estado «en obra» · seguimiento agendado']
        ] },
      { id: 'datos', tab: 'Big data y analytics', sigla: 'GB', negocio: 'Grupo Brasa · 3 restaurantes', sub: 'Cada noche, todos los datos en un solo sitio',
        cols: '1fr 1.1fr 1.3fr',
        nodos: [
          ['tpv', 'TPV', 'Ventas de los tres locales', '▭', 'FUENTE', '1', '1'],
          ['reservas', 'Reservas', 'Ocupación y cancelaciones', '◷', '', '1', '2'],
          ['delivery', 'Delivery', 'Pedidos de las plataformas', '➜', '', '1', '3'],
          ['resenas', 'Reseñas', 'Opiniones de Google', '★', '', '1', '4'],
          ['dw', 'Almacén de datos', 'Une, limpia y cruza todo cada noche', '◈', 'DATOS', '2', '2 / span 2', true],
          ['panel', 'Cuadro de mando', 'Ventas y ocupación por local, de un vistazo', '▦', '', '3', '1'],
          ['alerta', 'Alerta', 'Reseña de 1–2★ → aviso al encargado', '!', '', '3', '2'],
          ['prev', 'Previsión', 'Compras sugeridas para mañana', '↗', '', '3', '3'],
          ['informe', 'Informe del lunes', 'Resumen semanal por correo a gerencia', '✉', '', '3', '4']
        ],
        pasos: [
          ['tpv', 'tpv>dw', 'TPV: ventas del día importadas'],
          ['reservas', 'reservas>dw', 'Reservas: ocupación del día importada'],
          ['delivery', 'delivery>dw', 'Delivery: pedidos importados'],
          ['resenas', 'resenas>dw', 'Reseñas: 3 nuevas importadas'],
          ['dw', null, 'Datos: unidos y limpios · listos'],
          ['panel', 'dw>panel', 'Cuadro de mando actualizado'],
          ['alerta', 'dw>alerta', 'Alerta: reseña de 2★ en Brasa Centro → encargado'],
          ['prev', 'dw>prev', 'Previsión: compras sugeridas para mañana'],
          ['informe', 'dw>informe', 'Informe semanal programado · lunes 8:00']
        ] },
      { id: 'modernizacion', tab: 'Auditoría y modernización', sigla: 'AL', negocio: 'Asesoría Luna', sub: 'De un programa de escritorio a una web propia, sin parar la oficina',
        cols: '1fr 1fr 1fr',
        nodos: [
          ['antes', 'Sistema actual', 'Programa de escritorio y un servidor en la oficina', '⌂', 'ANTES', '1', '1'],
          ['audit', 'Auditoría', 'Código, datos, accesos y copias de seguridad', '⌕', '', '2', '1'],
          ['plan', 'Plan por fases', 'Qué se cambia primero y por qué', '☰', '', '3', '1'],
          ['migra', 'Migración de datos', 'Clientes y expedientes, comprobados', '⇄', '', '3', '2'],
          ['paralelo', 'En paralelo', 'Nuevo y viejo conviven hasta validar', '⧉', '', '2', '2'],
          ['nuevo', 'Sistema nuevo', 'Web propia, accesos por rol y copias automáticas', '◆', 'DESPUÉS', '1', '2', true]
        ],
        pasos: [
          ['antes', null, 'Inventario: programa, servidor y bases de datos'],
          ['audit', 'antes>audit', 'Auditoría: código, accesos y copias revisados'],
          ['plan', 'audit>plan', 'Plan: tres fases priorizadas'],
          ['migra', 'plan>migra', 'Migración: clientes y expedientes comprobados'],
          ['paralelo', 'migra>paralelo', 'En paralelo: el equipo valida el sistema nuevo'],
          ['nuevo', 'paralelo>nuevo', 'Sistema nuevo en marcha · el viejo, solo lectura']
        ] },
      { id: 'iadoc', tab: 'Integración de IA', sigla: 'GP', negocio: 'Gestoría Prado', sub: 'Facturas que llegan por correo, contabilizadas',
        cols: '1fr 1.1fr 1.3fr',
        nodos: [
          ['mail', 'Correo con factura', 'PDF o foto que envía el cliente', '✉', 'TRIGGER', '1', '2 / span 2'],
          ['lee', 'La IA lee el documento', 'Saca emisor, NIF, fecha, base e IVA', '◐', 'IA', '2', '2 / span 2', true],
          ['conta', 'Contabilidad', 'Asiento propuesto en el programa de siempre', '▤', '', '3', '1'],
          ['revisa', 'Revisión humana', 'Si algo no cuadra, a la cola del gestor', '◑', '', '3', '2'],
          ['archivo', 'Archivo', 'Guardada en la carpeta del cliente', '▢', '', '3', '3'],
          ['acuse', 'Acuse al cliente', '«Recibida, la estamos procesando»', '↩', '', '3', '4']
        ],
        pasos: [
          ['mail', null, 'Correo: factura recibida · Panadería Sol'],
          ['lee', 'mail>lee', 'IA: emisor, NIF, fecha, base e IVA extraídos'],
          ['conta', 'lee>conta', 'Contabilidad: asiento propuesto'],
          ['revisa', 'lee>revisa', 'Revisión: una duda → cola del gestor'],
          ['archivo', 'lee>archivo', 'Archivo: guardada en su carpeta · T3'],
          ['acuse', 'lee>acuse', 'Cliente: acuse enviado']
        ] }
    ];

    var actual = null;
    var elegido = -1;
    var pares = {};
    var paso = 0;
    var tPaso = 0;
    var tCambia = 0;
    // El flujo se monta (nodos, cables, pestañas) al acercarse a la vista:
    // medir los nodos al cargar forzaba una maquetación de toda la página.
    var montado = false;

    function nodo(n) { return lienzo.querySelector('[data-n="' + n + '"]'); }
    function indice(id) {
      for (var i = 0; i < FLUJOS.length; i++) if (FLUJOS[i].id === id) return i;
      return -1;
    }

    // Cable entre dos nodos: horizontal si el destino está a la derecha, o a
    // la izquierda cuando se solapan en vertical; si no, vertical hacia abajo
    // o hacia arriba (la cadena de «Modernización» sube y vuelve). Se mide
    // con offset* para que la inclinación 3D no deforme el trazado.
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
      var ns = lienzo.querySelectorAll('.wmflujo-nodo');
      for (var i = 0; i < ns.length; i++) ro.observe(ns[i]);
    }

    // Registro: hora de ejemplo que avanza, máximo 3 líneas.
    var h = 10, m = 2, s = 14;
    function hora() {
      s += 2;
      if (s >= 60) { s -= 60; m++; }
      return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    function linea(txt) {
      var d = document.createElement('div');
      d.className = 'wmflujo-linea';
      var tm = document.createElement('time');
      tm.textContent = hora();
      var sp = document.createElement('span');
      sp.textContent = txt;
      d.appendChild(tm);
      d.appendChild(sp);
      log.insertBefore(d, log.firstChild);
      while (log.children.length > 3) log.removeChild(log.lastChild);
    }

    function marcar(p) {
      var acts = lienzo.querySelectorAll('.wmflujo-nodo.is-act');
      for (var i = 0; i < acts.length; i++) acts[i].classList.remove('is-act');
      Object.keys(pares).forEach(function (k) { pares[k].luz.classList.remove('is-on'); });
      var el = nodo(p[0]);
      if (el) el.classList.add('is-act');
      if (p[1] && pares[p[1]]) pares[p[1]].luz.classList.add('is-on');
      linea(p[2]);
    }

    function crearNodo(n) {
      var el = document.createElement('div');
      el.className = 'wmflujo-nodo' + (n[7] ? ' wmflujo-hub' : '');
      el.setAttribute('data-n', n[0]);
      el.style.setProperty('--c', n[5]);
      el.style.setProperty('--r', n[6]);
      if (n[4]) {
        var tag = document.createElement('span');
        tag.className = 'wmflujo-tag';
        tag.setAttribute('aria-hidden', 'true');
        tag.textContent = n[4];
        el.appendChild(tag);
      }
      var ic = document.createElement('span');
      ic.className = 'wmflujo-ic';
      ic.setAttribute('aria-hidden', 'true');
      // U+FE0E: que ✉ y compañía salgan como texto y no como emoji.
      ic.textContent = n[3] + '︎';
      var tx = document.createElement('div');
      var b = document.createElement('b');
      b.textContent = n[1];
      var sm = document.createElement('small');
      sm.textContent = n[2];
      tx.appendChild(b);
      tx.appendChild(sm);
      el.appendChild(ic);
      el.appendChild(tx);
      return el;
    }

    function montar(f) {
      actual = f;
      elSigla.textContent = f.sigla;
      elNegocio.textContent = f.negocio;
      elSub.textContent = f.sub;
      lienzo.style.setProperty('--cols', f.cols);

      var viejos = lienzo.querySelectorAll('.wmflujo-nodo');
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
        base.setAttribute('class', 'wmflujo-cable-base');
        var luz = document.createElementNS(NS, 'path');
        luz.setAttribute('class', 'wmflujo-cable-luz');
        luz.style.animationDelay = (-0.7 * k) + 's';
        svg.appendChild(base);
        svg.appendChild(luz);
        pares[p[1]] = { a: nodo(ab[0]), b: nodo(ab[1]), base: base, luz: luz };
      });
      dibujar();
      observar();

      while (log.firstChild) log.removeChild(log.firstChild);
      h = 10; m = 2; s = 14;
      if (reduce) {
        // Estado final: todos los nodos hechos, cables encendidos y quietos,
        // y el registro con los tres últimos pasos.
        var ns = lienzo.querySelectorAll('.wmflujo-nodo');
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
      var bt = document.createElement('button');
      bt.type = 'button';
      bt.className = 'wmflujo-tab';
      bt.id = 'wmflujo-tab-' + f.id;
      bt.setAttribute('role', 'tab');
      bt.setAttribute('aria-controls', 'wmflujo-lienzo');
      bt.setAttribute('aria-selected', 'false');
      bt.tabIndex = -1;
      bt.textContent = f.tab;
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
      lienzo.setAttribute('aria-labelledby', 'wmflujo-tab-' + f.id);
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

    // Enlaces profundos: #flujo-erp, #flujo-datos… eligen su pestaña. El
    // scroll lo hace el navegador hasta el <span> ancla (también sin JS).
    function hashIndice(hash) {
      return hash.indexOf('#flujo-') === 0 ? indice(hash.slice(7)) : -1;
    }
    window.addEventListener('hashchange', function () { elegir(hashIndice(location.hash), true); });
    // Si el hash ya es ese, pulsar el enlace no dispara hashchange.
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#flujo-"]') : null;
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
        holo.style.setProperty('--wmflujo-rx', (-y * 4).toFixed(2) + 'deg');
        holo.style.setProperty('--wmflujo-ry', (x * 5).toFixed(2) + 'deg');
      };
      holo.addEventListener('pointermove', function (e) {
        px = e.clientX;
        py = e.clientY;
        if (!rafTilt) rafTilt = requestAnimationFrame(inclinar);
      });
      holo.addEventListener('pointerleave', function () {
        if (rafTilt) { cancelAnimationFrame(rafTilt); rafTilt = 0; }
        holo.style.removeProperty('--wmflujo-rx');
        holo.style.removeProperty('--wmflujo-ry');
      });
    }
  })();
})();
