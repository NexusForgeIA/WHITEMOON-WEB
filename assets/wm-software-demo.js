/* ─────────────────────────────────────────────────────────────────────────
   /desarrollo-software/ · móvil con app (#app-movil) y flujo IA (#flujo-ia).
   Todo es decorativo y con datos de ejemplo: la página se entiende entera
   sin este fichero (nodos y texto están en el HTML; sólo faltan los cables).
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

  /* ── 2 · Flujo IA: cables, secuencia, registro e inclinación ─────────── */
  (function () {
    var sec = document.getElementById('flujo-ia');
    var lienzo = document.getElementById('wmflujo-lienzo');
    var svg = document.getElementById('wmflujo-cables');
    var log = document.getElementById('wmflujo-log');
    var holo = document.getElementById('wmflujo-holo');
    if (!sec || !lienzo || !svg || !log) return;

    function nodo(n) { return lienzo.querySelector('[data-n="' + n + '"]'); }
    var nodos = lienzo.querySelectorAll('.wmflujo-nodo');

    // Cables: se crean una vez y sólo se recalcula su "d" al cambiar el
    // tamaño. Se mide con offset* (no getBoundingClientRect) para que la
    // inclinación 3D de la tarjeta no deforme el trazado.
    var enlaces = [['web', 'ia'], ['ia', 'admin'], ['ia', 'correo'], ['ia', 'fact'], ['ia', 'com']];
    var cables = {};
    enlaces.forEach(function (e, i) {
      var base = document.createElementNS(NS, 'path');
      base.setAttribute('class', 'wmflujo-cable-base');
      var luz = document.createElementNS(NS, 'path');
      luz.setAttribute('class', 'wmflujo-cable-luz');
      luz.style.animationDelay = (-0.7 * i) + 's';
      svg.appendChild(base);
      svg.appendChild(luz);
      cables[e[0] + '>' + e[1]] = { base: base, luz: luz, a: nodo(e[0]), b: nodo(e[1]) };
    });

    function camino(a, b) {
      var ax = a.offsetLeft, ay = a.offsetTop, aw = a.offsetWidth, ah = a.offsetHeight;
      var bx = b.offsetLeft, by = b.offsetTop, bw = b.offsetWidth, bh = b.offsetHeight;
      if (bx >= ax + aw - 4) {
        var x1 = ax + aw, y1 = ay + ah / 2, x2 = bx, y2 = by + bh / 2, dx = (x2 - x1) / 2;
        return 'M' + x1 + ',' + y1 + ' C' + (x1 + dx) + ',' + y1 + ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2;
      }
      var vx1 = ax + aw / 2, vy1 = ay + ah, vx2 = bx + bw / 2, vy2 = by, dy = Math.max((vy2 - vy1) / 2, 18);
      return 'M' + vx1 + ',' + vy1 + ' C' + vx1 + ',' + (vy1 + dy) + ' ' + vx2 + ',' + (vy2 - dy) + ' ' + vx2 + ',' + vy2;
    }
    var rafCables = 0;
    function dibujar() {
      rafCables = 0;
      Object.keys(cables).forEach(function (k) {
        var c = cables[k];
        if (!c.a || !c.b) return;
        var d = camino(c.a, c.b);
        c.base.setAttribute('d', d);
        c.luz.setAttribute('d', d);
      });
    }
    function pedirDibujo() {
      if (!rafCables) rafCables = requestAnimationFrame(dibujar);
    }
    dibujar();
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(pedirDibujo);
      ro.observe(lienzo);
      for (var i = 0; i < nodos.length; i++) ro.observe(nodos[i]);
    } else {
      window.addEventListener('resize', pedirDibujo);
    }

    // Registro: hora de ejemplo que avanza, máximo 3 líneas.
    var h = 10, m = 2, s = 19;
    function hora() {
      s += 2;
      if (s >= 60) { s -= 60; m++; }
      return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    function linea(txt, t) {
      var d = document.createElement('div');
      d.className = 'wmflujo-linea';
      var tm = document.createElement('time');
      tm.textContent = t || hora();
      var sp = document.createElement('span');
      sp.textContent = txt;
      d.appendChild(tm);
      d.appendChild(sp);
      log.insertBefore(d, log.firstChild);
      while (log.children.length > 3) log.removeChild(log.lastChild);
    }

    var pasos = [
      ['web', null, 'Web: visitante abre el chat · pide cita ITV'],
      ['ia', 'web>ia', 'Agente IA: hueco jueves 10:30 · reservado'],
      ['admin', 'ia>admin', 'CRM: cita creada · cliente actualizado'],
      ['correo', 'ia>correo', 'Correo de confirmación enviado'],
      ['fact', 'ia>fact', 'Presupuesto preparado · pre-ITV'],
      ['com', 'ia>com', 'Comercial: tarea «ofrecer revisión anual»']
    ];

    if (reduce) {
      // Estado final: todos los nodos hechos, cables encendidos y quietos,
      // y el registro con los tres últimos pasos.
      for (var j = 0; j < nodos.length; j++) nodos[j].classList.add('is-act');
      Object.keys(cables).forEach(function (k) { cables[k].luz.classList.add('is-on'); });
      while (log.firstChild) log.removeChild(log.firstChild);
      linea(pasos[3][2], '10:02:21');
      linea(pasos[4][2], '10:02:23');
      linea(pasos[5][2], '10:02:25');
      return;
    }

    // El HTML ya enseña los 3 primeros pasos: la secuencia sigue desde el 4º.
    var paso = 3;
    var tPaso = 0;
    function avanzar() {
      for (var n = 0; n < nodos.length; n++) nodos[n].classList.remove('is-act');
      Object.keys(cables).forEach(function (k) { cables[k].luz.classList.remove('is-on'); });
      var p = pasos[paso];
      var el = nodo(p[0]);
      if (el) el.classList.add('is-act');
      if (p[1] && cables[p[1]]) cables[p[1]].luz.classList.add('is-on');
      linea(p[2]);
      paso = (paso + 1) % pasos.length;
    }

    vigilar(sec, function () {
      tPaso = setInterval(avanzar, 1500);
    }, function () {
      clearInterval(tPaso);
    });

    // Inclinación con el puntero: sólo ratón/trackpad, nunca en táctil.
    if (holo && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      var rafTilt = 0, px = 0, py = 0;
      function inclinar() {
        rafTilt = 0;
        var r = holo.getBoundingClientRect();
        var x = (px - r.left) / r.width - 0.5;
        var y = (py - r.top) / r.height - 0.5;
        holo.style.setProperty('--wmflujo-rx', (-y * 4).toFixed(2) + 'deg');
        holo.style.setProperty('--wmflujo-ry', (x * 5).toFixed(2) + 'deg');
      }
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
