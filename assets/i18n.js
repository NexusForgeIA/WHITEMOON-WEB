/* WhiteMoon · selector de idioma ES / EN / FR — solo para el visitante.
 *
 * El HTML se sirve SIEMPRE en espanol (es lo que indexa Google): canonical,
 * hreflang, title y meta no se tocan. Este script cambia el texto en el
 * navegador cuando el visitante lo pide, y nada mas.
 *
 *   data-i18n="clave"               -> contenido del elemento
 *   data-i18n-attr="alt:k1;title:k2" -> atributos (alt, placeholder, aria-label, title)
 *
 * Diccionarios: /assets/i18n/common.json (navbar y footer, los genera
 * scripts/nav_rebuild.py) + /assets/i18n/<data-page>.json. Forma: {en:{},fr:{}}.
 * Clave que falta en un idioma -> se queda el espanol. Un valor con "<" se
 * pinta como HTML (son ficheros propios, mismo origen); el resto como texto.
 *
 * Por defecto, espanol. No se mira el idioma del navegador ni se redirige.
 * La eleccion se guarda en localStorage ("wm-lang") para las paginas que
 * visite despues; las que no cargan este script siguen en espanol.
 *
 * Sin salto de maquetacion al cargar: el <head> de cada pagina de la fase 1
 * lleva un snippet inline que, si hay "en" o "fr" guardado, oculta el body
 * (.wm-i18n-wait, con tope de 2 s) y precarga los JSON. Aqui se quita al
 * pintar. Con espanol no pasa nada de eso y no se descarga ningun JSON.
 *
 * Sin precios ni claims cableados: todo el texto vive en los JSON.
 */
(function () {
  'use strict';

  var KEY = 'wm-lang';
  var LANGS = ['es', 'en', 'fr'];
  var root = document.documentElement;
  var me = document.currentScript;
  var page = me && me.getAttribute('data-page');
  if (!page) return;

  var dicts = {};          // lang -> {key: texto}, ya fusionado common + pagina
  var pending = {};        // lang -> Promise
  var current = 'es';

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return LANGS.indexOf(v) > 0 ? v : 'es';
    } catch (e) { return 'es'; }
  }
  function store(lang) {
    try {
      if (lang === 'es') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, lang);
    } catch (e) { /* modo privado o almacenamiento bloqueado: solo esta pagina */ }
  }

  function getJSON(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }
  function load(lang) {
    if (dicts[lang]) return Promise.resolve(dicts[lang]);
    if (!pending[lang]) {
      var v = me.src.split('?')[1] || '';
      var q = v ? '?' + v : '';
      pending[lang] = Promise.all([
        getJSON('/assets/i18n/common.json' + q).catch(function () { return {}; }),
        getJSON('/assets/i18n/' + page + '.json' + q)
      ]).then(function (res) {
        var out = {}, k;
        var c = res[0][lang] || {}, p = res[1][lang] || {};
        for (k in c) out[k] = c[k];
        for (k in p) out[k] = p[k];
        dicts[lang] = out;
        return out;
      });
      pending[lang].catch(function () { delete pending[lang]; });
    }
    return pending[lang];
  }

  // El espanol original se guarda la primera vez que se traduce cada nodo.
  // Contenido y atributos van aparte: un mismo elemento puede llevar los dos.
  var ORIG = '__wmEs';
  var ORIG_ATTR = '__wmEsAttr';
  function setContent(el, val) {
    if (val.indexOf('<') !== -1) el.innerHTML = val;
    else el.textContent = val;
  }
  // Todo lo que cuelga de `scope` (por defecto, la pagina), incluido el propio scope.
  function all(scope, sel) {
    var list = Array.prototype.slice.call(scope.querySelectorAll(sel));
    if (scope.matches && scope.matches(sel)) list.unshift(scope);
    return list;
  }
  function paint(dict, scope) {
    scope = scope || document;
    var nodes = all(scope, '[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var val = dict && dict[el.getAttribute('data-i18n')];
      if (val != null) {
        if (el[ORIG] === undefined) el[ORIG] = el.innerHTML;
        setContent(el, val);
      } else if (el[ORIG] !== undefined) {
        el.innerHTML = el[ORIG];
      }
    }
    var attrs = all(scope, '[data-i18n-attr]');
    for (var j = 0; j < attrs.length; j++) {
      var a = attrs[j];
      var saved = a[ORIG_ATTR] || (a[ORIG_ATTR] = {});
      a.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':');
        var name = p[0], k = p[1];
        if (!name || !k) return;
        var v = dict && dict[k];
        if (!(name in saved)) saved[name] = a.getAttribute(name);
        if (v != null) a.setAttribute(name, v);
        else if (saved[name] != null) a.setAttribute(name, saved[name]);
      });
    }
  }

  function syncButtons(lang) {
    var btns = document.querySelectorAll('.wm-lang button[data-lang]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-lang') === lang ? 'true' : 'false');
    }
  }
  function reveal() { root.classList.remove('wm-i18n-wait'); }

  // Diccionario pintado ahora mismo (null = espanol). Lo leen los widgets
  // que montan su HTML con JS (banner de cookies, lanzador, widget de la home).
  var painted = null;
  var paintedLang = 'es';
  function announce(lang) {
    if (lang === paintedLang) return;
    paintedLang = lang;
    try {
      document.dispatchEvent(new CustomEvent('wm:lang', { detail: { lang: lang } }));
    } catch (e) { /* navegador sin CustomEvent: los widgets se quedan como esten */ }
  }

  function apply(lang) {
    if (LANGS.indexOf(lang) === -1) lang = 'es';
    current = lang;
    syncButtons(lang);
    if (lang === 'es') {
      painted = null;
      paint(null);
      root.lang = 'es';
      reveal();
      announce('es');
      return Promise.resolve();
    }
    return load(lang).then(function (dict) {
      if (current !== lang) return;        // clics rapidos: gana el ultimo
      painted = dict;
      paint(dict);
      root.lang = lang;
      reveal();
      announce(lang);
    }).catch(function (e) {
      if (window.console) console.warn('[i18n]', e && e.message);
      current = 'es';
      painted = null;
      syncButtons('es');
      root.lang = 'es';
      reveal();
      announce('es');
    });
  }

  // API para el HTML que se monta con JS. Sin diccionario pintado (espanol,
  // o todavia cargando) t() devuelve el espanol que le pasan.
  //   wmI18n.t('clave', 'texto en espanol')  -> texto en el idioma pintado
  //   wmI18n.apply(nodo)                      -> traduce un bloque recien insertado
  //   document 'wm:lang' (detail.lang)        -> el idioma acaba de cambiar
  window.wmI18n = {
    lang: function () { return paintedLang; },
    t: function (key, es) {
      var v = painted && painted[key];
      return v != null ? v : es;
    },
    apply: function (scope) {
      if (painted && scope) paint(painted, scope);
    }
  };

  // ── Selector ────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.wm-lang button[data-lang]');
    if (!b) return;
    var lang = b.getAttribute('data-lang');
    if (lang === current) return;
    store(lang);
    apply(lang);
    if (typeof window.wmTrack === 'function') {
      try { window.wmTrack('cambiar_idioma', { idioma: lang }); } catch (err) { /* nunca romper */ }
    }
  });
  // Precarga en cuanto el visitante se acerca al selector: asi el cambio
  // pinta dentro de la ventana de "input reciente" y no cuenta como CLS.
  function warm(e) {
    var b = e.target.closest && e.target.closest('.wm-lang');
    if (!b) return;
    load('en').catch(function () {});
    load('fr').catch(function () {});
  }
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('focusin', warm);
  document.addEventListener('touchstart', warm, { passive: true });

  var initial = stored();
  if (initial === 'es') { syncButtons('es'); reveal(); }
  else apply(initial);
})();
