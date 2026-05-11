/**
 * WHITEMOON CHATBOT — standalone (sin licencias, sin CDN)
 * © WhiteMoon · whitemoon.es
 */
(function(){
  var CONFIG = {
    botName:  'Asistente WhiteMoon',
    color:    '#7c3aed',
    tel:      '643199580',
    biz:      'WhiteMoon Agencia IA',
    flowUrl:  '/chat-flows/agencia.js',
    askName:  'Para continuar, ¿me dices tu nombre?',
    askPhone: 'Gracias {nombre} 👋 ¿Tu teléfono de contacto? (9 dígitos)'
  };

  var SUPABASE_URL = 'https://mlaqtniujnvfxcvcourm.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYXF0bml1am52ZnhjdmNvdXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzUyMzIsImV4cCI6MjA5MzQxMTIzMn0.Neh7VUS8ADsxf0DPab0JoJyGXOAXnLIaXzXbKzj2BGs';

  // ─── REGLA FIJA (todos los flujos, presentes y futuros) ───────────────────
  // · Todo startCapture() debe pasar el sector detectado por el bot.
  // · Todo finishCapture() debe llamar a saveLead().
  // · saveLead() siempre incluye sector + mensaje además de nombre y telefono.
  // · Si el envío a Supabase falla → console.warn, NUNCA se interrumpe el flujo.
  function saveLead(data){
    data = data || {};
    var payload = {
      nombre:   data.nombre      || null,
      telefono: data.telefono    || null,
      sector:   data.sector      || null,
      interes:  data.interes     || null,
      mensaje:  data.descripcion || null,
      origen:   'whitemoon.es',
      fecha:    new Date().toISOString()
    };
    try {
      return fetch(SUPABASE_URL + '/rest/v1/leads_web', {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal'
        },
        body: JSON.stringify(payload)
      })
        .then(function(r){ if(r && !r.ok) console.warn('[WM-CHAT] saveLead HTTP ' + r.status); return r; })
        .catch(function(e){ console.warn('[WM-CHAT] saveLead', e); });
    } catch(e){ console.warn('[WM-CHAT] saveLead', e); }
  }

  function normalize(s){
    return String(s||'').toLowerCase().trim()
      .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e').replace(/[íìï]/g,'i')
      .replace(/[óòö]/g,'o').replace(/[úùü]/g,'u').replace(/ñ/g,'n');
  }
  function matchKeyword(text, responses){
    var t = normalize(text);
    var keys = Object.keys(responses);
    for(var i = 0; i < keys.length; i++){
      if(keys[i].charAt(0) === '_') continue;
      var parts = keys[i].split(',');
      for(var j = 0; j < parts.length; j++){
        var kw = normalize(parts[j]);
        if(kw && t.indexOf(kw) !== -1) return responses[keys[i]];
      }
    }
    return null;
  }
  function replaceVars(text, vars){
    return String(text||'').replace(/\{(\w+)\}/g, function(_, k){ return vars[k] !== undefined ? vars[k] : ''; });
  }
  // Mensajes adaptados al horario laboral (Lun-Vie 9:00-20:00)
  function scheduleVars(nombre){
    var hora = new Date().getHours();
    var dia  = new Date().getDay();
    var esHorarioLaboral = hora >= 9 && hora < 20;
    var esFindeSemana    = (dia === 0 || dia === 6);
    var n = nombre ? (', ' + nombre) : '';
    var cierreLargo, cierreFoot, horario;
    if(esFindeSemana){
      cierreLargo = 'Hemos recibido tus datos.\nEl lunes a primera hora te llamamos para explicarte todo sin compromiso. 💜';
      cierreFoot  = '💜 ¡Buen fin de semana' + n + '!';
      horario     = 'Te llamamos el lunes a primera hora.';
    } else if(!esHorarioLaboral){
      cierreLargo = 'Hemos recibido tus datos.\nNuestro equipo te llamará mañana a primera hora (9:00h) para explicarte todo.\n¡Que descanses! 🌙';
      cierreFoot  = '🌙 ¡Que descanses' + n + '!';
      horario     = 'Te llamamos mañana a primera hora (9:00h).';
    } else {
      cierreLargo = 'Un/a especialista recibirá tus datos y te llamará en menos de 1 hora.\nSin compromiso. Sin tecnicismos. 💜';
      cierreFoot  = '🌟 ¡Hablamos enseguida' + n + '!';
      horario     = 'Te contactamos en menos de 1 hora.';
    }
    return { cierreLargo: cierreLargo, cierreFoot: cierreFoot, horario: horario, esHorarioLaboral: esHorarioLaboral, esFindeSemana: esFindeSemana };
  }
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
  function hexToRgb(hex){
    var c = (hex||'#7c3aed').replace('#','');
    if(c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    return { r: parseInt(c.slice(0,2),16), g: parseInt(c.slice(2,4),16), b: parseInt(c.slice(4,6),16) };
  }

  function loadFlow(widget, cfg){
    var s = document.createElement('script');
    s.src = cfg.flowUrl + '?_=' + Date.now();
    s.onload = function(){
      if(window.WMFlow && typeof window.WMFlow.init === 'function'){
        try { window.WMFlow.init(cfg, widget); }
        catch(e){ console.error('[WM-CHAT] flow init', e); }
      } else {
        console.error('[WM-CHAT] WMFlow no definido tras cargar el flujo');
      }
    };
    s.onerror = function(){ console.error('[WM-CHAT] No se pudo cargar el flujo'); };
    document.head.appendChild(s);
  }

  function buildWidget(cfg){
    var rgb = hexToRgb(cfg.color);
    var colorLight = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',.12)';
    var colorMid   = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',.25)';

    var sty = document.createElement('style');
    sty.textContent = [
      '#wm-chat-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:'+cfg.color+';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.35);z-index:9999;opacity:0;transition:opacity .4s,transform .2s;}',
      '#wm-chat-btn.wm-visible{opacity:1;}',
      '#wm-chat-btn:hover{transform:scale(1.08);}',
      '#wm-chat-btn svg{width:26px;height:26px;fill:#fff;}',
      '@keyframes wm-pulse{0%,100%{box-shadow:0 4px 20px rgba(0,0,0,.35)}50%{box-shadow:0 4px 28px '+colorMid+',0 0 0 8px '+colorLight+'}}',
      '#wm-chat-btn.wm-visible{animation:wm-pulse 4s ease-in-out infinite;}',
      '#wm-chat-btn.wm-open{display:none;}',
      '#wm-chat-btn::after{content:"¿En qué podemos ayudarte?";position:absolute;right:66px;bottom:50%;transform:translateY(50%);background:#1a1a2e;color:#fff;font-size:12px;font-family:system-ui,sans-serif;white-space:nowrap;padding:6px 10px;border-radius:8px;pointer-events:none;opacity:0;transition:opacity .2s;}',
      '#wm-chat-btn:hover::after{opacity:1;}',
      '#wm-chat-modal{position:fixed;bottom:90px;right:20px;width:360px;height:520px;background:#1a1a2e;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.4);z-index:9998;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;}',
      '#wm-chat-modal.wm-show{display:flex;}',
      '@media(max-width:600px){#wm-chat-modal{bottom:0;right:0;width:100vw;height:80vh;border-radius:16px 16px 0 0;}}',
      '#wm-chat-modal .wm-header{background:'+cfg.color+';padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;}',
      '#wm-chat-modal .wm-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}',
      '#wm-chat-modal .wm-hinfo{flex:1;min-width:0;}',
      '#wm-chat-modal .wm-hname{color:#fff;font-weight:700;font-size:.88rem;}',
      '#wm-chat-modal .wm-hstatus{color:rgba(255,255,255,.8);font-size:.7rem;display:flex;align-items:center;gap:4px;}',
      '#wm-chat-modal .wm-hdot{width:7px;height:7px;background:#4ade80;border-radius:50%;display:inline-block;}',
      '#wm-chat-modal .wm-close{background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;padding:4px;line-height:1;opacity:.85;}',
      '#wm-chat-modal .wm-close:hover{opacity:1;}',
      '#wm-chat-modal .wm-close.wm-hidden{display:none;}',
      '#wm-chat-modal .wm-msgs{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:8px;}',
      '#wm-chat-modal .wm-msgs::-webkit-scrollbar{width:4px;}',
      '#wm-chat-modal .wm-msgs::-webkit-scrollbar-thumb{background:#2a2a4e;border-radius:2px;}',
      '.wm-msg{max-width:82%;font-size:.83rem;line-height:1.45;padding:9px 13px;word-break:break-word;}',
      '.wm-msg.wm-bot{background:#2a2a4e;color:#e0e0ff;border-radius:12px 12px 12px 4px;align-self:flex-start;}',
      '.wm-msg.wm-usr{background:'+cfg.color+';color:#fff;border-radius:12px 12px 4px 12px;align-self:flex-end;}',
      '.wm-typing{display:flex;gap:5px;padding:12px 14px;background:#2a2a4e;border-radius:12px 12px 12px 4px;align-self:flex-start;align-items:center;}',
      '.wm-typing span{width:7px;height:7px;background:#7c7caa;border-radius:50%;animation:wm-dot 1.2s ease-in-out infinite;}',
      '.wm-typing span:nth-child(2){animation-delay:.2s;}',
      '.wm-typing span:nth-child(3){animation-delay:.4s;}',
      '@keyframes wm-dot{0%,80%,100%{transform:scale(.7);opacity:.4}40%{transform:scale(1);opacity:1}}',
      '#wm-chat-modal .wm-opts{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 4px;align-self:flex-start;max-width:100%;}',
      '#wm-chat-modal .wm-opts button{background:transparent;color:#e0e0ff;border:1px solid '+colorMid+';border-radius:18px;padding:7px 13px;font-size:.76rem;font-family:inherit;cursor:pointer;transition:background .15s,color .15s;white-space:normal;}',
      '#wm-chat-modal .wm-opts button:hover{background:'+cfg.color+';color:#fff;border-color:'+cfg.color+';}',
      '#wm-chat-modal .wm-input-wrap{padding:10px 12px;background:#111827;display:flex;gap:8px;flex-shrink:0;border-top:1px solid #2a2a4e;}',
      '#wm-chat-modal .wm-input{flex:1;background:#1f2937;border:1px solid #374151;border-radius:10px;padding:9px 12px;color:#fff;font-size:.83rem;font-family:inherit;outline:none;}',
      '#wm-chat-modal .wm-input:focus{border-color:'+cfg.color+';}',
      '#wm-chat-modal .wm-send{background:'+cfg.color+';border:none;border-radius:10px;padding:9px 14px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;}',
      '#wm-chat-modal .wm-send:hover{opacity:.85;}',
      '#wm-chat-modal .wm-send svg{width:18px;height:18px;fill:#fff;}',
      '#wm-chat-modal .wm-warn{display:block;margin-top:6px;padding:8px 10px;background:rgba(245,158,11,.1);border-left:3px solid #f59e0b;border-radius:4px;color:#fbbf24;font-size:.72rem;line-height:1.4;font-style:italic;}',
      '#wm-chat-modal .wm-final{margin-top:8px;padding:16px;border-radius:12px;background:linear-gradient(135deg,rgba('+rgb.r+','+rgb.g+','+rgb.b+',.22) 0%,rgba('+rgb.r+','+rgb.g+','+rgb.b+',.06) 100%);border:1px solid '+colorMid+';color:#f1f5f9;align-self:stretch;}',
      '#wm-chat-modal .wm-final-title{font-size:.95rem;font-weight:700;margin-bottom:8px;color:#fff;}',
      '#wm-chat-modal .wm-final-text{font-size:.82rem;line-height:1.5;color:#e5e7eb;margin-bottom:10px;}',
      '#wm-chat-modal .wm-final-cta{font-size:.78rem;color:#cbd5e1;margin-bottom:10px;text-align:center;}',
      '#wm-chat-modal .wm-final-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;background:#25D366;color:#fff;padding:13px 14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:.9rem;box-shadow:0 4px 14px rgba(37,211,102,.35);transition:transform .15s,box-shadow .15s;}',
      '#wm-chat-modal .wm-final-btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(37,211,102,.5);}',
      '#wm-chat-modal .wm-final-btn svg{width:20px;height:20px;fill:#fff;flex-shrink:0;}',
      '#wm-chat-modal .wm-final-foot{margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.12);text-align:center;font-size:.76rem;color:#cbd5e1;}',
      '#wm-chat-modal .wm-powered{text-align:center;padding:4px 0 8px;font-size:.6rem;color:#4a4a6a;}',
      '#wm-chat-modal .wm-powered a{color:#6a6a9a;text-decoration:none;}'
    ].join('');
    document.head.appendChild(sty);

    var btn = document.createElement('button');
    btn.id = 'wm-chat-btn';
    btn.setAttribute('aria-label', 'Abrir chat');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>';

    var modal = document.createElement('div');
    modal.id = 'wm-chat-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Chat con ' + escapeHtml(cfg.botName));
    modal.innerHTML = [
      '<div class="wm-header">',
        '<div class="wm-avatar">💬</div>',
        '<div class="wm-hinfo">',
          '<div class="wm-hname">' + escapeHtml(cfg.botName) + '</div>',
          '<div class="wm-hstatus"><span class="wm-hdot"></span> En línea</div>',
        '</div>',
        '<button class="wm-close" aria-label="Cerrar chat">×</button>',
      '</div>',
      '<div class="wm-msgs" id="wm-msgs"></div>',
      '<div class="wm-input-wrap">',
        '<input type="text" class="wm-input" id="wm-input" placeholder="Escribe tu mensaje..." autocomplete="off">',
        '<button class="wm-send" id="wm-send" aria-label="Enviar">',
          '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
        '</button>',
      '</div>',
      '<div class="wm-powered">Powered by <a href="https://whitemoon.es" target="_blank">WhiteMoon</a></div>'
    ].join('');

    document.body.appendChild(btn);
    document.body.appendChild(modal);

    var msgsEl  = modal.querySelector('#wm-msgs');
    var inputEl = modal.querySelector('#wm-input');
    var sendBtn = modal.querySelector('#wm-send');
    var closeBtn= modal.querySelector('.wm-close');

    var inputHandler     = null;
    var baseInputHandler = null;
    var captureCtx       = null;
    var started          = false;
    var leadData         = {};

    // ─── TIMEOUT DE INACTIVIDAD (45s) ─────────────────────────────────────────
    var IDLE_MS       = 45000;
    var idleTimer     = null;
    var idleStage     = 0;     // 0 = activo · 1 = ya avisado una vez
    var idleEnded     = false; // true = conversación en pausa por inactividad (no rearmar)
    var convoFinished = false; // true = lead capturado, conversación terminada

    function addBot(html){
      var d = document.createElement('div');
      d.className = 'wm-msg wm-bot';
      d.innerHTML = html;
      msgsEl.appendChild(d);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      return d;
    }
    function addUser(text){
      var d = document.createElement('div');
      d.className = 'wm-msg wm-usr';
      d.innerHTML = escapeHtml(text);
      msgsEl.appendChild(d);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      return d;
    }
    function showTyping(cb){
      var t = document.createElement('div');
      t.className = 'wm-typing';
      t.innerHTML = '<span></span><span></span><span></span>';
      msgsEl.appendChild(t);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      var delay = 600 + Math.floor(Math.random() * 500);
      setTimeout(function(){
        if(t.parentNode) t.parentNode.removeChild(t);
        cb();
      }, delay);
    }
    function bot(html, cb){ showTyping(function(){ addBot(html); if(cb) cb(); scheduleIdle(); }); }
    function botText(text, cb){ bot(escapeHtml(text).replace(/\n/g,'<br>'), cb); }

    function showOpts(opts, onPick){
      var wrap = document.createElement('div');
      wrap.className = 'wm-opts';
      opts.forEach(function(o){
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = o.label;
        b.addEventListener('click', function(){
          userActivity();
          if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
          addUser(o.label);
          onPick(o);
        });
        wrap.appendChild(b);
      });
      msgsEl.appendChild(wrap);
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    // ─── INACTIVIDAD ──────────────────────────────────────────────────────────
    function clearIdle(){ if(idleTimer){ clearTimeout(idleTimer); idleTimer = null; } }
    function scheduleIdle(){ clearIdle(); if(idleEnded) return; idleTimer = setTimeout(onIdle, IDLE_MS); }
    function userActivity(){ clearIdle(); idleStage = 0; idleEnded = false; }
    function onIdle(){
      idleTimer = null;
      if(idleEnded) return;
      if(idleStage === 0){
        idleStage = 1;
        bot('👋 ¿Sigues ahí?<br>Si tienes alguna duda o prefieres que te llamemos directamente, dímelo — estamos aquí para ayudarte.', function(){
          showOpts([
            { label: 'Sí, sigo aquí',             value: '__idle_stay' },
            { label: '📞 Prefiero que me llamen', value: '__idle_call' }
          ], function(o){
            if(o.value === '__idle_call'){
              startCapture({ tramite: 'Llamada solicitada (inactividad chat)', agent: 'especialista' });
            } else {
              bot('¡Genial! 👍 Seguimos cuando quieras.', function(){
                if(inputEl.disabled && !captureCtx) setInput(true);
              });
            }
          });
        });
      } else {
        idleEnded = true;
        bot('No hay problema 😊<br>Cuando quieras retomar la conversación aquí estaremos.<br>¡Que tengas un excelente día! 🌟', function(){
          setInput(false, '⏸️ Conversación en pausa — abre el chat para retomar');
        });
      }
    }

    function setInput(enabled, placeholder, type){
      inputEl.disabled = !enabled;
      sendBtn.disabled = !enabled;
      inputEl.placeholder = placeholder || (enabled ? 'Escribe tu mensaje...' : '');
      inputEl.type = type || 'text';
      inputEl.value = '';
      if(enabled) setTimeout(function(){ inputEl.focus(); }, 50);
    }
    function onInput(fn){ inputHandler = fn; baseInputHandler = fn; }
    function onInputOnce(fn){
      var prev = inputHandler;
      inputHandler = function(text){
        var ok = fn(text);
        if(ok !== false) inputHandler = prev;
      };
    }

    function hideClose(){ closeBtn.classList.add('wm-hidden'); }
    function showCloseBtn(){ closeBtn.classList.remove('wm-hidden'); }

    function openChat(initFn){
      modal.classList.add('wm-show');
      btn.classList.add('wm-open');
      if(!started){ started = true; if(initFn) initFn(); return; }
      if(convoFinished){ return; }            // conversación ya terminada: solo mostrar el chat
      // reabrir: si quedó en pausa por inactividad, retomar la conversación
      if(idleEnded){
        idleEnded = false; idleStage = 0;
        if(captureCtx){ setInput(true, captureCtx.step === 2 ? '612345678' : 'Tu nombre', captureCtx.step === 2 ? 'tel' : 'text'); scheduleIdle(); return; }
        bot('👋 Seguimos donde lo dejamos. Dime, ¿en qué te ayudo?', function(){ setInput(true); });
        return;
      }
      idleStage = 0;
      if(!inputEl.disabled) inputEl.focus();
      scheduleIdle();
    }
    function closeChat(){
      clearIdle();
      modal.classList.remove('wm-show');
      btn.classList.remove('wm-open');
    }

    function flow(steps, onDone){
      var idx = 0;
      var data = {};
      function next(){
        if(idx >= steps.length){ onDone(data); return; }
        var s = steps[idx];
        bot(s.msg, function(){
          if(s.input){
            setInput(true, s.placeholder || '', s.type || 'text');
            onInputOnce(function(text){
              text = (text || '').trim();
              if(!text) return false;
              if(s.validate){
                var ok = s.validate(text);
                if(ok !== true){ if(typeof ok === 'string') botText(ok); return false; }
              }
              data[s.key || ('step'+idx)] = text;
              addUser(text);
              idx++; next();
              return true;
            });
          } else {
            setInput(false);
            var opts = (s.opts || []).map(function(o){
              return typeof o === 'string' ? { label: o, value: o } : o;
            });
            showOpts(opts, function(o){
              if(typeof o.action === 'function'){ o.action(data); return; }
              data[s.key || ('step'+idx)] = o.value != null ? o.value : (o.label || '');
              if(s.tag) data[s.tag] = o.tag || data[s.key];
              idx++; next();
            });
          }
        });
      }
      next();
    }

    function startCapture(opts){
      opts = opts || {};
      captureCtx = { step: 1, opts: opts };
      if(opts.tramite)     leadData.tramite = opts.tramite;
      if(opts.prioridad)   leadData.prioridad = opts.prioridad;
      if(opts.detalle)     leadData.detalle = opts.detalle;
      if(opts.sector)      leadData.sector = opts.sector;
      if(opts.descripcion) leadData.descripcion = opts.descripcion;
      bot(escapeHtml(opts.askName || cfg.askName), function(){
        setInput(true, 'Tu nombre');
      });
    }

    function resetState(){
      captureCtx = null;
      Object.keys(leadData).forEach(function(k){ delete leadData[k]; });
      var leftover = msgsEl.querySelectorAll('.wm-opts, .wm-final, .wm-typing');
      leftover.forEach(function(el){ if(el.parentNode) el.parentNode.removeChild(el); });
      inputHandler = baseInputHandler;
      idleStage = 0; idleEnded = false; convoFinished = false; clearIdle();
      showCloseBtn();
      setInput(true);
    }
    function backToMenu(){
      resetState();
      bot('↩ Volver al menú principal…', function(){
        if(typeof api._onOpen === 'function') api._onOpen();
      });
    }
    function isMenuKeyword(text){
      return /^(menu|menú|inicio|volver|empezar)\b/i.test(String(text||'').trim());
    }
    function handleCaptureInput(text){
      if(!captureCtx) return;
      if(captureCtx.step === 1){
        leadData.nombre = text.trim();
        addUser(leadData.nombre);
        captureCtx.step = 2;
        var ph = replaceVars(captureCtx.opts.askPhone || cfg.askPhone, { nombre: leadData.nombre, horario: scheduleVars(leadData.nombre).horario });
        bot(escapeHtml(ph), function(){
          setInput(true, '612345678', 'tel');
        });
      } else if(captureCtx.step === 2){
        var digits = text.replace(/[^0-9]/g, '');
        if(digits.length < 9){ botText('⚠️ El teléfono debe tener al menos 9 dígitos.'); return; }
        leadData.telefono = digits.slice(-9);
        addUser(leadData.telefono);
        finishCapture(captureCtx.opts || {});
      }
    }

    function buildDetalle(extra){
      var src = extra || leadData.detalle;
      if(!src) return 'Consulta general';
      if(typeof src === 'string') return src;
      var parts = [];
      Object.keys(src).forEach(function(k){
        if(k.charAt(0) === '_') return;
        parts.push(k + ': ' + src[k]);
      });
      return parts.length ? parts.join(' | ') : 'Consulta general';
    }

    function finishCapture(opts){
      opts = opts || {};
      captureCtx = null;
      convoFinished = true; idleEnded = true; clearIdle();
      setInput(false, 'Conversación finalizada');

      var detalle = buildDetalle(opts.detalle);
      var prioridad = opts.prioridad || leadData.prioridad || '';
      var tramite = opts.tramite || leadData.tramite || 'Consulta general';

      var defaultTpl = '📋 NUEVA CONSULTA — {botName}\n━━━━━━━━━━━━━━━\n👤 {nombre} · 📱 +34{telefono}\n📋 {tramite}{prioridadLine}\n📝 Detalle: {detalle}\n━━━━━━━━━━━━━━━\nVia chatbot WhiteMoon · whitemoon.es';
      var tpl = opts.waTemplate || defaultTpl;
      var msg = replaceVars(tpl, {
        botName:  cfg.botName,
        biz:      cfg.biz,
        nombre:   leadData.nombre,
        telefono: leadData.telefono,
        tramite:  tramite,
        prioridad: prioridad,
        prioridadLine: prioridad ? '\n🚨 Prioridad: ' + prioridad : '',
        detalle:  detalle
      });
      var waLink = cfg.tel
        ? 'https://wa.me/34'+cfg.tel+'?text='+encodeURIComponent(msg)
        : 'https://wa.me/?text='+encodeURIComponent(msg);

      var fin = opts.finish || {};
      var agente = opts.agent || fin.agent || 'gestor/a';
      var sch   = scheduleVars(leadData.nombre);
      var finVars = { nombre: leadData.nombre, agent: agente, cierreLargo: sch.cierreLargo, cierreFoot: sch.cierreFoot, horario: sch.horario };
      var title = replaceVars(fin.title || '✅ ¡Listo, {nombre}!', finVars);
      var text  = replaceVars(fin.text  || sch.cierreLargo, finVars);
      var cta   = replaceVars(fin.cta || '👇 Pulsa para confirmar tu solicitud', finVars);
      var btnLb = replaceVars(fin.btn || '📲 Confirmar solicitud', finVars);
      var foot  = replaceVars(fin.foot || sch.cierreFoot, finVars);

      showTyping(function(){
        var card = document.createElement('div');
        card.className = 'wm-final';
        var html = '<div class="wm-final-title">'+escapeHtml(title)+'</div>'+
                   '<div class="wm-final-text">'+escapeHtml(text).replace(/\n/g,'<br>')+'</div>';
        if(cta) html += '<div class="wm-final-cta">'+escapeHtml(cta)+'</div>';
        html += '<a class="wm-final-btn" href="'+escAttr(waLink)+'" target="_blank" rel="noopener">'+
                  '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074z"/></svg>'+
                  escapeHtml(btnLb)+
                '</a>';
        if(foot) html += '<div class="wm-final-foot">'+escapeHtml(foot)+'</div>';
        card.innerHTML = html;
        msgsEl.appendChild(card);
        msgsEl.scrollTop = msgsEl.scrollHeight;
        showCloseBtn();

        var detStr      = typeof detalle === 'string' ? detalle : '';
        var sectorMatch = /sector\s*:\s*([^|]+)/i.exec(detStr);
        var descMatch   = /descripci[oó]n\s*:\s*([^|]+)/i.exec(detStr);
        saveLead({
          nombre:      leadData.nombre,
          telefono:    leadData.telefono,
          sector:      opts.sector || leadData.sector || (sectorMatch ? sectorMatch[1].trim() : null),
          interes:     tramite,
          descripcion: opts.descripcion || leadData.descripcion || (descMatch ? descMatch[1].trim() : null)
        });
      });
    }

    sendBtn.addEventListener('click', function(){ dispatch(inputEl.value); });
    inputEl.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); dispatch(inputEl.value); }
    });
    function dispatch(text){
      text = (text || '').trim();
      if(!text) return;
      inputEl.value = '';
      userActivity();
      if(isMenuKeyword(text)){
        addUser(text);
        backToMenu();
        return;
      }
      if(captureCtx){ handleCaptureInput(text); return; }
      if(typeof inputHandler === 'function'){ inputHandler(text); return; }
    }

    btn.addEventListener('click', function(){ openChat(api._onOpen); });
    closeBtn.addEventListener('click', closeChat);
    setTimeout(function(){ btn.classList.add('wm-visible'); }, 1500);

    var swipeStartY = null;
    var headerEl = modal.querySelector('.wm-header');
    if(headerEl){
      headerEl.addEventListener('touchstart', function(e){
        if(e.touches.length !== 1) return;
        swipeStartY = e.touches[0].clientY;
      }, { passive: true });
      headerEl.addEventListener('touchmove', function(e){
        if(swipeStartY === null) return;
        var dy = e.touches[0].clientY - swipeStartY;
        if(dy > 80){ closeChat(); swipeStartY = null; }
      }, { passive: true });
      headerEl.addEventListener('touchend', function(){ swipeStartY = null; }, { passive: true });
      headerEl.addEventListener('touchcancel', function(){ swipeStartY = null; }, { passive: true });
    }

    var api = {
      cfg: cfg,
      addBot: addBot,
      addUser: addUser,
      bot: bot,
      botText: botText,
      showTyping: showTyping,
      showOpts: showOpts,
      flow: flow,
      setInput: setInput,
      onInput: onInput,
      onInputOnce: onInputOnce,
      hideClose: hideClose,
      showClose: showCloseBtn,
      closeWidget: closeChat,
      startCapture: startCapture,
      finishCapture: finishCapture,
      data: leadData,
      utils: { normalize: normalize, matchKeyword: matchKeyword, replaceVars: replaceVars, escapeHtml: escapeHtml },
      _onOpen: null
    };
    api.onOpen = function(fn){ api._onOpen = fn; };
    return api;
  }

  function start(){
    var widget = buildWidget(CONFIG);
    loadFlow(widget, CONFIG);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
