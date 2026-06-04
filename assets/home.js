// /assets/home.js — Scripts inline de la home consolidados
// Generado por feat/home-slim-secciones (2026-06-03)

// === Bloque 1 (footer year + handlers) ===
document.getElementById('yr').textContent = new Date().getFullYear();

function toggleSvc(card) {
  const wasOpen = card.classList.contains('open');
  document.querySelectorAll('.svc-card').forEach(c => c.classList.remove('open'));
  if (!wasOpen) card.classList.add('open');
}
function toggleFaq(btn) {
  const item = btn.parentElement, open = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!open) item.classList.add('open');
}

// ── PACKS MODAL ──
const PACKS={
  advance:{
    ico:'💬',title:'Spark',sub:'Agente IA conversacional',isGold:false,
    price:'499€ + 199€/mes',period:'Setup único · Cuota mensual',note:'Sin permanencia',
    features:['Agente IA instalado en tu web o QR','El cliente puede escribir libremente','IA detecta intención y responde en contexto','Cualificación automática de leads','Captación de datos por WhatsApp','Respuestas rápidas personalizadas','Detección de palabras clave por área','Actualización de contenidos incluida'],
    noInclude:'',wa:'Hola%20WhiteMoon%2C%20me%20interesa%20Spark%20499%E2%82%AC%20%2B%20199%E2%82%AC%2Fmes'
  },
  pyme:{
    ico:'🏆',title:'Core',sub:'Web profesional + Agente IA + SEO y GEO/AEO',isGold:true,
    price:'1.800€ + 199€/mes',period:'Setup único · Cuota mensual',note:'Operativo en 5-7 días · Sin permanencia',
    features:[
      'Web profesional completa con diseño personalizado',
      'Dominio incluido el primer año',
      'Agente IA conversacional 24/7',
      'Sistema de reservas integrado',
      'SEO técnico completo (meta tags, schema, sitemap)',
      'GEO/AEO — optimizado para motores de IA generativa',
      'Captura de leads automática → WhatsApp',
      'Diseño responsive móvil, tablet y escritorio',
      'Operativo en 5-7 días laborables',
      'Sin permanencia'
    ],
    noInclude:'',
    wa:'Hola%20WhiteMoon%2C%20me%20interesa%20Core%201.800%E2%82%AC%20%2B%20199%E2%82%AC%2Fmes'
  }
};

function toggleDesglose(id) {
  const card = document.getElementById('card-' + id);
  const btn = card.querySelector('.pb-ghost');
  const isExpanded = card.classList.contains('expanded');
  // Colapsar todas
  document.querySelectorAll('.price-card').forEach(c => c.classList.remove('expanded'));
  document.querySelectorAll('.pb-ghost').forEach(b => { b.classList.remove('active'); b.textContent = 'Ver desglose ▾'; });
  // Si no estaba expandida, expandir esta
  if (!isExpanded) {
    card.classList.add('expanded');
    btn.classList.add('active');
    btn.textContent = 'Ocultar desglose ▴';
  }
}
function openPack(id){
  const p=PACKS[id];
  const head=document.getElementById('pm-head');
  const closeBtn=document.getElementById('pm-close');
  if(p.isGold){head.classList.add('gold-head');closeBtn.classList.add('gold-mx');}
  else{head.classList.remove('gold-head');closeBtn.classList.remove('gold-mx');}
  document.getElementById('pm-ico').textContent=p.ico;
  document.getElementById('pm-title').textContent=p.title;
  document.getElementById('pm-sub').textContent=p.sub;

  const isGold=p.isGold;
  const goldC=isGold?'gold-mprice':'';
  const goldMain=isGold?'gold-main':'';
  const goldNote=isGold?'gold-note':'';
  const goldList=isGold?'gold-list':'';
  const goldDiv=isGold?'gold-divider':'';
  const goldDivSpan=isGold?`style="color:var(--gold)"` : '';
  const goldBtn=isGold?'gold-btn':'';
  const goldInputCls=isGold?'gold-input':'';

  const leadForm = (id === 'basic' || id === 'advance' || id === 'pyme') ? `
    <div class="lead-divider ${goldDiv}"><span ${goldDivSpan}>¿Te interesa? Déjanos tus datos</span></div>
    <div class="lead-form" id="leadForm-${id}">
      <div class="lead-row">
        <div class="lead-field"><label>Nombre y apellido</label><input type="text" id="lead-nombre-${id}" class="${goldInputCls}" placeholder="Tu nombre"></div>
        <div class="lead-field"><label>Teléfono / WhatsApp</label><input type="tel" id="lead-tel-${id}" class="${goldInputCls}" placeholder="6XX XXX XXX"></div>
      </div>
      <div class="lead-row">
        <div class="lead-field"><label>Email</label><input type="email" id="lead-email-${id}" class="${goldInputCls}" placeholder="tu@email.com"></div>
        <div class="lead-field"><label>Tipo de negocio</label><input type="text" id="lead-negocio-${id}" class="${goldInputCls}" placeholder="Ej: clínica, abogado, tienda..."></div>
      </div>
      <div class="lead-field" style="margin-top:8px">
        <label>¿Algo que quieras contarnos? <span style="color:var(--muted);font-weight:400">(opcional)</span></label>
        <textarea id="lead-msg-${id}" class="${goldInputCls}" placeholder="Cuéntanos brevemente tu negocio o dudas..." style="min-height:70px;resize:vertical"></textarea>
      </div>
      <button class="lead-send-btn ${goldBtn}" onclick="sendLead('${id}')">
        <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.638 4.83 1.757 6.865L2 30l7.331-1.724A13.916 13.916 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2z"/></svg>
        Enviar solicitud por WhatsApp
      </button>
      <div id="lead-ok-${id}" class="lead-ok" style="display:none">
        ✅ <strong>¡Solicitud enviada!</strong> Te contactaremos en menos de 24h.
      </div>
    </div>
  ` : '';

  document.getElementById('pm-body').innerHTML=
    `<div class="mprice ${goldC}"><div class="mprice-main ${goldMain}">${p.price}</div><div class="mprice-per">${p.period}</div>${p.note?`<div class="mprice-note ${goldNote}">${p.note}</div>`:''}</div>`+
    `<div class="mftitle">Qué incluye</div>`+
    `<ul class="mflist ${goldList}">`+p.features.map(f=>`<li>${f}</li>`).join('')+`</ul>`+
    (p.noInclude?`<div class="mnotice"><p>ℹ️ ${p.noInclude}</p></div>`:'')+
    leadForm+
    `<a href="https://wa.me/34643199580?text=${p.wa}" target="_blank" class="mwa" rel="noopener noreferrer"><svg width="16" height="16" viewBox="0 0 32 32"><path fill="currentColor" d="M16 2C8.268 2 2 8.268 2 16c0 2.49.638 4.83 1.757 6.865L2 30l7.331-1.724A13.916 13.916 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2z"/></svg>Hablar directamente por WhatsApp</a>`;

  document.getElementById('pack-modal').style.display='block';
  document.body.style.overflow='hidden';
}

function sendLead(packId){
  const nombre=document.getElementById('lead-nombre-'+packId)?.value.trim()||'';
  const tel=document.getElementById('lead-tel-'+packId)?.value.trim()||'';
  const email=document.getElementById('lead-email-'+packId)?.value.trim()||'';
  const negocio=document.getElementById('lead-negocio-'+packId)?.value.trim()||'';
  const msg=document.getElementById('lead-msg-'+packId)?.value.trim()||'';
  if(!nombre||!tel){alert('Por favor, rellena al menos tu nombre y teléfono.');return;}
  const packNames={advance:'Spark 499€ + 199€/mes',pyme:'Core 1.800€ + 199€/mes (web+agente IA)'};
  const text=encodeURIComponent(
    '🔥 *Nuevo lead desde la web* 🔥\n\n'+
    '*Pack interesado:* '+(packNames[packId]||packId)+'\n'+
    '*Nombre:* '+nombre+'\n*Teléfono:* '+tel+'\n'+
    '*Email:* '+(email||'—')+'\n*Negocio:* '+(negocio||'—')+'\n*Mensaje:* '+(msg||'—')
  );
  window.open('https://wa.me/34643199580?text='+text,'_blank');
  document.getElementById('lead-ok-'+packId).style.display='block';
}

function closePack(){document.getElementById('pack-modal').style.display='none';document.body.style.overflow='';}
function closePackOut(e){if(e.target.id==='pack-modal')closePack();}

const LEGAL={
  aviso:{title:'Aviso Legal',html:'<div class="lsec"><h3>Datos identificativos</h3><div class="lhl"><p><b>Denominación:</b> WhiteMoon Agencia de IA</p><p><b>Domicilio:</b> Majadahonda, Madrid, España</p><p><b>Email:</b> comercial@whitemoon.es</p><p><b>Teléfono:</b> 643 199 580</p></div></div><div class="lsep"></div><div class="lsec"><h3>Propiedad intelectual</h3><p>Todos los contenidos son propiedad de WhiteMoon Agencia de IA. Prohibida su reproducción sin autorización.</p></div><div class="lsep"></div><div class="lsec"><h3>Legislación aplicable</h3><p>Legislación española. Juzgados de Majadahonda (Madrid).</p></div>'},
  privacidad:{title:'Política de Privacidad',html:'<div class="lsec"><h3>Responsable</h3><div class="lhl"><p><b>Responsable:</b> WhiteMoon Agencia de IA</p><p><b>Email:</b> comercial@whitemoon.es</p><p><b>Tel:</b> 643 199 580 · Majadahonda, Madrid</p></div></div><div class="lsep"></div><div class="lsec"><h3>Datos que recogemos</h3><p>Solo los que el usuario facilita voluntariamente. No usamos cookies de terceros ni píxeles publicitarios.</p></div><div class="lsep"></div><div class="lsec"><h3>Sus derechos</h3><p>Acceso, rectificación, supresión, oposición, limitación y portabilidad. Escribe a comercial@whitemoon.es.</p></div>'},
  cookies:{title:'Política de Cookies',html:'<div class="lsec"><h3>Cookies que utilizamos</h3><p>Solo <b>cookies técnicas estrictamente necesarias</b>. No utilizamos cookies de analítica, publicidad ni redes sociales.</p></div>'}
};
function openLegal(p){const d=LEGAL[p];document.getElementById('l-title').textContent=d.title;document.getElementById('l-body').innerHTML=d.html;const o=document.getElementById('lo');o.style.display='block';document.body.style.overflow='hidden';o.scrollTop=0;}
function closeLegal(){document.getElementById('lo').style.display='none';document.body.style.overflow='';}
function closeLO(e){if(e.target.id==='lo')closeLegal();}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePack();closeLegal();}});

// === Bloque 2 ===
(function(){
  var CONVERSATIONS = {
    default: [
      {type:'bot', text:'¡Hola! 👋 Soy el asistente de la clínica. ¿En qué puedo ayudarte?', delay:500},
      {type:'user', text:'Quiero información sobre ortodoncia', delay:1800},
      {type:'typing', delay:2600},
      {type:'bot', text:'¡Claro! 😊 Trabajamos con brackets y Invisalign. ¿Es para ti o para un menor?', delay:3600},
      {type:'user', text:'Para mí, soy adulto', delay:5000},
      {type:'typing', delay:5800},
      {type:'bot', text:'Perfecto. Para darte más info y ver disponibilidad, ¿me dejas tu nombre y teléfono?', delay:6800},
      {type:'user', text:'Soy Carlos, 612 345 678', delay:8300},
      {type:'typing', delay:9100},
      {type:'bot', text:'¡Gracias Carlos! 🙌 El equipo de la clínica te llamará en menos de 24h para informarte y confirmar tu cita.', delay:10100},
    ]
  };

  var msgs = document.getElementById('iphone-msgs');
  if(!msgs) return;

  var conv = CONVERSATIONS.default;
  var i = 0;

  function addMsg(item){
    var typing = msgs.querySelector('.im-typing');
    if(typing) typing.remove();

    if(item.type === 'typing'){
      var t = document.createElement('div');
      t.className = 'im-typing';
      t.innerHTML = '<span></span><span></span><span></span>';
      msgs.appendChild(t);
    } else {
      var m = document.createElement('div');
      m.className = item.type === 'bot' ? 'im-bot' : 'im-user';
      m.textContent = item.text;
      msgs.appendChild(m);
    }
    requestAnimationFrame(function(){msgs.scrollTop = msgs.scrollHeight;});
  }

  function runConversation(){
    if(i >= conv.length){
      setTimeout(function(){
        msgs.innerHTML = '';
        i = 0;
        runConversation();
      }, 4000);
      return;
    }
    var item = conv[i];
    var prevDelay = i > 0 ? conv[i-1].delay : 0;
    var wait = item.delay - prevDelay;
    setTimeout(function(){
      addMsg(item);
      i++;
      runConversation();
    }, wait);
  }

  var observer = new IntersectionObserver(function(entries){
    if(entries[0].isIntersecting){
      runConversation();
      observer.disconnect();
    }
  }, {threshold: 0.3});

  observer.observe(msgs);
})();

// === Bloque 3 ===
(function(){
  var btn = document.getElementById('demoCta');
  var hero = document.querySelector('.hero');
  if(!btn||!hero) return;
  new IntersectionObserver(function(e){
    btn.classList.toggle('visible', !e[0].isIntersecting);
  },{threshold:0.1}).observe(hero);
})();

// === Bloque 4 ===
function calcROIHome(){
  var leads=parseInt(document.getElementById('h-sl-leads').value);
  var valor=parseInt(document.getElementById('h-sl-valor').value);
  var conv=0.30;
  var coste=199;
  var perdida=Math.round(leads*valor*conv);
  var ahorro=perdida-coste;
  var roi=ahorro>0?Math.round((ahorro/coste)*100):0;
  var anual=Math.max(0,ahorro)*12;
  document.getElementById('h-v-leads').textContent=leads;
  document.getElementById('h-v-valor').textContent=valor+' €';
  document.getElementById('h-r-perdida').textContent=perdida.toLocaleString('es-ES')+' €';
  document.getElementById('h-r-roi').textContent=(ahorro>0?'+':'')+roi+'%';
  document.getElementById('h-r-anual').textContent=anual.toLocaleString('es-ES')+' €';
}
calcROIHome();

// === Bloque 5 ===
(function(){
  // STICKY CTA — sin reflow forzado
  // Antes (PR #248): getBoundingClientRect() dentro del listener de scroll
  // disparaba un layout recalc en cada evento (PageSpeed: "Avoid forced
  // reflows"). Ahora:
  //   1) atFooter se actualiza vía IntersectionObserver (asíncrono, sin reflow)
  //   2) El handler de scroll lee solo window.scrollY (sin reflow) y se
  //      agrupa con requestAnimationFrame para correr una vez por frame.
  var cta = document.getElementById('wm-sticky-cta');
  if(!cta) return;
  var footer = document.getElementById('contacto');
  var atFooter = false;
  var ticking = false;

  function update(){
    var scrolled = window.scrollY || window.pageYOffset || 0;
    if(scrolled > 300 && !atFooter){ cta.classList.add('wm-visible'); }
    else{ cta.classList.remove('wm-visible'); }
  }

  function onScrollOrResize(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      update();
      ticking = false;
    });
  }

  // IntersectionObserver: dispara solo cuando el footer entra/sale del viewport
  if(footer && 'IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      atFooter = entries[0].isIntersecting;
      update();
    }, { rootMargin: '0px', threshold: 0 });
    io.observe(footer);
  }

  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });
  update();
})();
