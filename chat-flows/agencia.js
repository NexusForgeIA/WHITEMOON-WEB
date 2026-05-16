/**
 * WHITEMOON FLOW · agencia — conversación inteligente por sector
 * Detección de sector por texto libre · diagnóstico · agitación · mini-demo · captura natural
 */
(function(){
  const CLAUDE_ENDPOINT = 'https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/whitemoon-chat';
  var claudeHistory = [];

  async function askClaude(userMsg) {
    claudeHistory.push({ role: 'user', content: userMsg });
    try {
      const res = await fetch(CLAUDE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: claudeHistory })
      });
      const data = await res.json();
      const reply = data.text || '';
      if (reply) claudeHistory.push({ role: 'assistant', content: reply });
      return reply;
    } catch(e) {
      return null;
    }
  }

  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;

      // ─── CONSTANTES DE CAPTURA ────────────────────────────────────────────
      var SECTORES = ['Dental','Legal','Peluquería','Restaurante','Taller','Gestoría','Veterinaria','Reformas','Otro'];

      var ASK_NAME  = '¿Cómo te llamas?';
      var ASK_PHONE = 'Encantado/a {nombre} 😊 ¿A qué número te llamo? {horario}';

      // El cuerpo y el pie de la tarjeta final los rellena chatbot.js según el
      // horario laboral ({cierreLargo} / {cierreFoot}).
      var FINISH = {
        agent: 'especialista',
        title: '🎉 ¡Perfecto, {nombre}!',
        text:  'Te llamamos hoy antes de las 20h.<br>Prepárate para ver cómo tu negocio empieza a captar clientes solo 🚀',
        cta:   '👇 Confirma por WhatsApp si quieres',
        btn:   '📲 Confirmar cita',
        foot:  '{cierreFoot}'
      };

      // ─── ESTADO DE LA CONVERSACIÓN ────────────────────────────────────────
      var state = 'business';   // 'business' | 'idle'
      var ctx   = { sectorKey:null, sectorLabel:null, descripcion:null, sistema:null, retries:0 };

      function addDesc(text){
        text = String(text || '').trim();
        if(!text) return;
        ctx.descripcion = ctx.descripcion ? (ctx.descripcion + ' · ' + text) : text;
      }

      function doCapture(tramite, detalleStr, origen){
        var sec  = ctx.sectorLabel || 'General';
        var desc = (ctx.descripcion || '—').replace(/[{}\r\n]+/g, ' ').trim();
        var detalle = detalleStr || ('Sector: ' + sec + ' | Descripción: ' + desc);
        var origenLabel = origen || 'whitemoon.es';
        var waTpl =
          '💼 NUEVO LEAD WHITEMOON\n' +
          '━━━━━━━━━━━━━━━\n' +
          '👤 {nombre} · 📱 +34{telefono}\n' +
          '🏢 Sector: ' + sec + '\n' +
          '💬 Descripción: ' + desc + '\n' +
          '🎯 Interés: {tramite}\n' +
          '📍 Origen: ' + origenLabel + ' · chatbot\n' +
          '━━━━━━━━━━━━━━━\n' +
          'Llamar en menos de 1 hora';
        w.startCapture({
          tramite:     tramite,
          agent:       'especialista',
          askName:     ASK_NAME,
          askPhone:    ASK_PHONE,
          detalle:     detalle,
          sector:      sec,
          descripcion: desc,
          empresa:     ctx.empresaNombre || '',
          waTemplate:  waTpl,
          finish:      FINISH,
          origen:      origen
        });
      }

      // Captura "natural" del flujo principal — con preámbulo
      function capturaNatural(tramite){
        w.bot(
          'Perfecto 🙌 En menos de 24h te llamamos para mostrarte exactamente cómo quedaría en tu negocio — sin compromiso y gratis.',
          function(){ doCapture(tramite); }
        );
      }

      // Captura para flujos especializados (auditoría / RAG / web)
      function capture(tramite, sector){
        if(sector && !ctx.sectorLabel) ctx.sectorLabel = sector;
        doCapture(tramite);
      }

      function opts(list, cb){
        w.setInput(false);
        w.showOpts(list, function(o){ cb(o); });
      }

      // ─── DETECCIÓN DE SECTOR POR PALABRAS CLAVE ───────────────────────────
      var SECTOR_KW = [
        { key:'dental',       label:'Clínica dental',              kws:['dental','diente','dientes','clinica dental','odontolog','ortodoncia','dentista'] },
        { key:'legal',        label:'Despacho de abogados',        kws:['abogad','despacho','legal','bufete','juridic','procurador'] },
        { key:'peluqueria',   label:'Peluquería / estética',       kws:['peluquer','salon de belleza','salon','estetic','belleza','cabello','barberi','barbero','manicura'] },
        { key:'restaurante',  label:'Restaurante',                 kws:['restaurante','hosteleria','cocina','cafeteria','tapas','meson','pizzeria','bar','pub','cerveceria','asador','catering','comida para llevar'] },
        { key:'automocion',   label:'Automoción / Concesionario',  kws:['concesionario','coche','coches','automovil','vehiculo','motor','cars','auto','comprar coche','vender coche'] },
        { key:'taller',       label:'Taller mecánico',             kws:['taller','mecanic','chapa y pintura','neumatic'] },
        { key:'gestoria',     label:'Gestoría / asesoría',         kws:['gestoria','asesoria','contabilidad','fiscal','tramites','laboral','autonomos'] },
        { key:'veterinaria',  label:'Clínica veterinaria',         kws:['veterinar','animales','mascota'] },
        { key:'reformas',     label:'Empresa de reformas',         kws:['reforma','construccion','obra','obras','albañil','albanil','carpinter','fontaner','electricista','pintor'] },
        { key:'formacion',    label:'Centro de formación',         kws:['academia','formacion','cursos','curso','clases','educacion','autoescuela','escuela de'] },
        { key:'podologia',    label:'Clínica de podología',        kws:['podolog','plantillas','pies'] },
        { key:'inmobiliaria', label:'Inmobiliaria',                kws:['inmobiliar','pisos','alquiler','vivienda','propiedad','propiedades','agente inmobiliario'] },
        { key:'salud',        label:'Clínica de salud',            kws:['clinica','medic','salud','fisio','psicolog','nutricion','consulta medica','dermatolog','optic'] },
        { key:'gimnasio',     label:'Gimnasio / centro deportivo', kws:['gimnasio','fitness','deporte','entreno','entrenamiento','crossfit','pilates','yoga','box de'] }
      ];

      function detectarSector(text){
        var t = u.normalize(text);
        for(var i = 0; i < SECTOR_KW.length; i++){
          var s = SECTOR_KW[i];
          for(var j = 0; j < s.kws.length; j++){
            if(t.indexOf(u.normalize(s.kws[j])) !== -1) return s;
          }
        }
        return null;
      }

      // ─── PROPUESTA DE VALOR POR SECTOR (afirmar valor + ofrecer solución) ─
      var VALUE_PROP = {
        dental: '🦷 Las clínicas dentales que responden al instante captan hasta un 40% más de pacientes nuevos. Nuestro Agente IA atiende consultas, agenda citas y nunca deja escapar un paciente — ni de noche ni en fin de semana.',
        legal: '⚖️ El primer despacho que responde se lleva al cliente. Nuestro Agente IA cualifica consultas al instante, filtra los casos rentables y llena tu agenda de reuniones con clientes serios.',
        peluqueria: '✂️ Agenda siempre llena, cero llamadas perdidas. Nuestro Agente IA gestiona citas, envía recordatorios automáticos y capta clientes nuevos mientras tú trabajas.',
        restaurante: '🍽️ Más reservas, menos mesas vacías. Nuestro Agente IA gestiona reservas 24/7, responde al instante y llena tu local sin que tengas que mover un dedo.',
        automocion: '🚗 El comprador que no recibe respuesta en minutos elige otro concesionario. Nuestro Agente IA responde al instante, cualifica el interés real y agenda pruebas de conducción solo.',
        taller: '🔧 Mientras trabajas en el taller tu Agente IA capta clientes online, agenda revisiones y confirma citas automáticamente. Sin perder ni una oportunidad.',
        gestoria: '📋 Respuesta inmediata a cada consulta, clientes mejor cualificados y agenda llena de reuniones rentables. Nuestro Agente IA trabaja por ti las 24 horas.',
        veterinaria: '🐾 Las urgencias no esperan y los dueños tampoco. Nuestro Agente IA atiende consultas a cualquier hora, agenda citas y nunca pierde una llamada fuera de horario.',
        reformas: '🏗️ El presupuesto que llega primero tiene más probabilidades de cerrarse. Nuestro Agente IA capta el lead, recoge la información del proyecto y te lo entrega listo para presupuestar.',
        formacion: '📚 Los alumnos eligen centro en minutos. Nuestro Agente IA responde al instante a consultas de matrícula, resuelve dudas y convierte interesados en alumnos matriculados.',
        podologia: '🦶 Agenda siempre optimizada y menos ausencias. Nuestro Agente IA gestiona citas, envía recordatorios automáticos y capta nuevos pacientes mientras atiendes consulta.',
        inmobiliaria: '🏠 Compradores cualificados, visitas con clientes serios. Nuestro Agente IA filtra el interés real, responde dudas al instante y agenda visitas automáticamente.',
        salud: '🏥 Más pacientes nuevos sin más trabajo. Nuestro Agente IA responde consultas al instante, gestiona agenda y capta pacientes mientras tú te centras en atenderlos.',
        gimnasio: '💪 Socios nuevos cada semana sin esfuerzo. Nuestro Agente IA responde dudas de tarifas, ofrece pruebas gratuitas y convierte interesados en socios automáticamente.',
        empresas: '🏢 Más leads, más reuniones, más ventas. Nuestro Agente IA convierte las visitas de tu web en clientes cualificados 24/7 — mientras tú te centras en cerrar los tratos.'
      };

      // ─── 1. APERTURA ──────────────────────────────────────────────────────
      async function abrir(){
        claudeHistory = [];
        ctx   = { sectorKey:null, sectorLabel:null, descripcion:null, sistema:null, retries:0 };
        state = 'business';
        var bienvenida = await askClaude('Hola, acabo de llegar a la web de WhiteMoon');
        if (bienvenida) {
          w.bot(bienvenida);
          w.setInput(true, 'Escribe tu pregunta...');
        } else {
          w.bot('¿Tu negocio podría facturar más este mes? 💰');
          setTimeout(function(){
            w.bot('Nuestros Agentes IA convierten visitas en clientes. ¿A qué te dedicas?');
            w.setInput(true, 'Ej: tengo una clínica dental...');
          }, 800);
        }
      }

      // ─── 2. DESCRIPCIÓN DEL NEGOCIO → DETECCIÓN + 3 OPCIONES DIRECTAS ─────
      function onBusinessDescription(text){
        addDesc(text);
        var s = detectarSector(text);
        if(s){
          ctx.sectorKey   = s.key;
          ctx.sectorLabel = s.label;
          state = 'idle';
          w.bot(VALUE_PROP[s.key] || VALUE_PROP.empresas, function(){
            setTimeout(showSectorOpts, 600);
          });
          return;
        }
        ctx.retries++;
        if(ctx.retries >= 2){
          if(!ctx.sectorLabel) ctx.sectorLabel = 'Empresa';
          ctx.sectorKey = 'empresas';
          state = 'idle';
          w.bot(VALUE_PROP.empresas, function(){
            setTimeout(showSectorOpts, 600);
          });
          return;
        }
        state = 'business';
        w.bot(
          'Interesante 👍 Cuéntame un poco más sobre tu negocio — ¿qué tipo de clientes atiendes y cómo te suelen contactar?',
          function(){ w.setInput(true, 'Cuéntame un poco más...'); }
        );
      }

      // ─── 3. OPCIONES DIRECTAS (demo / precio / llamada) ───────────────────
      function showSectorOpts(){
        w.setInput(false);
        w.bot('¿Qué quieres hacer?', function(){
          w.showOpts([
            { label:'¿Cómo funciona? Muéstrame 👀', value:'demo' },
            { label:'¿Cuánto cuesta? 💰',           value:'precio' },
            { label:'Quiero más clientes 🚀',       value:'llamada' }
          ], function(o){
            if(o.value === 'demo')   return miniDemo();
            if(o.value === 'precio') return mostrarPrecio();
            capturaNatural('Directo — quiere llamada · ' + (ctx.sectorLabel || 'Empresa'));
          });
        });
      }

      // ─── 6. MINI-DEMO INLINE ──────────────────────────────────────────────
      function miniDemo(){
        w.setInput(false);
        var sector = ctx.sectorLabel || 'empresas';
        var demos = {
          'Clínica dental': [
            'Cliente: "Hola, ¿tenéis hueco esta semana para una limpieza?"',
            'Agente IA: "¡Hola! Claro 😊 Tenemos huecos el martes a las 10h y el jueves a las 17h. ¿Cuál te viene mejor?"',
            'Cliente: "El jueves perfecto"',
            'Agente IA: "Anotado ✅ Te confirmo la cita para el jueves. ¿Me das tu nombre y teléfono para el recordatorio?"'
          ],
          'Despacho de abogados': [
            'Cliente: "Necesito asesoramiento por un despido improcedente"',
            'Agente IA: "Entendido 👋 Es un caso que podemos estudiar. ¿Cuándo te despidieron y tienes el finiquito firmado?"',
            'Cliente: "Hace 2 semanas, sin firmar nada"',
            'Agente IA: "Perfecto, en ese caso tienes opciones. Te pongo con un abogado laboralista hoy mismo. ¿A qué número te llamamos?"'
          ],
          'Peluquería': [
            'Cliente: "¿Tenéis sitio mañana para corte y tinte?"',
            'Agente IA: "¡Hola! 💇 Mañana tenemos hueco a las 11h y a las 16h. ¿Cuál prefieres?"',
            'Cliente: "A las 11h genial"',
            'Agente IA: "Perfecto ✅ ¿Me dices tu nombre para reservarte el hueco?"'
          ],
          'Restaurante': [
            'Cliente: "¿Tenéis mesa para 4 personas el sábado por la noche?"',
            'Agente IA: "¡Hola! 🍽️ El sábado tenemos disponibilidad a las 21h y a las 22h. ¿Cuál os viene mejor?"',
            'Cliente: "A las 21h"',
            'Agente IA: "Reserva hecha ✅ ¿Nombre para la reserva y alguna alergia que debamos saber?"'
          ],
          'Taller mecánico': [
            'Cliente: "Me ha salido el testigo del aceite, ¿podéis verlo hoy?"',
            'Agente IA: "¡Hola! 🔧 Podemos recibirte hoy a partir de las 16h. ¿Qué marca y modelo tienes?"',
            'Cliente: "Un Seat León 2019"',
            'Agente IA: "Perfecto, lo apunto. ¿Me das tu nombre y teléfono para confirmar la cita?"'
          ],
          'Gestoría': [
            'Cliente: "Necesito presentar el IVA trimestral, ¿me podéis ayudar?"',
            'Agente IA: "¡Hola! 📋 Por supuesto. El plazo acaba el 20. ¿Tienes ya las facturas del trimestre preparadas?"',
            'Cliente: "Sí, las tengo todas"',
            'Agente IA: "Perfecto ✅ Te asigno un gestor ahora mismo. ¿Tu nombre y teléfono?"'
          ],
          'Veterinaria': [
            'Cliente: "Mi perro lleva 2 días sin comer, ¿podéis atenderle hoy?"',
            'Agente IA: "¡Hola! 🐾 Sí, tenemos hueco esta tarde a las 17h. ¿Qué raza y edad tiene?"',
            'Cliente: "Golden retriever, 5 años"',
            'Agente IA: "Anotado ✅ ¿Me das tu nombre para la cita?"'
          ],
          'Centro de formación': [
            'Cliente: "¿Cuándo empieza el próximo curso de inglés B2?"',
            'Agente IA: "¡Hola! 📚 El próximo grupo B2 empieza el 3 de junio, quedan 3 plazas. ¿Quieres reservar la tuya?"',
            'Cliente: "Sí, me interesa"',
            'Agente IA: "Genial 🎉 Te reservo plaza. ¿Me das tu nombre y teléfono para enviarte la info de matrícula?"'
          ],
          'Podología': [
            'Cliente: "Tengo una uña incarnada bastante molesta, ¿tenéis cita pronto?"',
            'Agente IA: "¡Hola! 🦶 Podemos verte mañana a las 10h o el viernes a las 16h. ¿Cuál te va mejor?"',
            'Cliente: "Mañana a las 10h"',
            'Agente IA: "Perfecto ✅ ¿Me dices tu nombre para la cita?"'
          ],
          'Inmobiliaria': [
            'Cliente: "Busco piso de 2 habitaciones en Majadahonda, máximo 300.000€"',
            'Agente IA: "¡Hola! 🏠 Tenemos 3 opciones que encajan con tu búsqueda. ¿Quieres que te las envíe ahora o prefieres hablar con un agente?"',
            'Cliente: "Prefiero hablar con alguien"',
            'Agente IA: "Perfecto, te llamo hoy. ¿A qué número y en qué horario?"'
          ],
          'Automoción': [
            'Cliente: "Me interesa el SUV eléctrico que tenéis en web, ¿está disponible?"',
            'Agente IA: "¡Hola! 🚗 Sí, está disponible. ¿Quieres que te reserve una prueba de conducción esta semana?"',
            'Cliente: "Sí, el jueves si puede ser"',
            'Agente IA: "Perfecto ✅ ¿A qué hora te viene mejor y tu nombre?"'
          ],
          'Reformas': [
            'Cliente: "Quiero reformar el baño completo, ¿hacéis presupuesto gratis?"',
            'Agente IA: "¡Hola! 🏗️ Sí, el presupuesto es sin compromiso. ¿Puedes enviarnos fotos del baño actual para darte un precio orientativo?"',
            'Cliente: "Claro, ¿a dónde os las mando?"',
            'Agente IA: "Te paso el WhatsApp ahora mismo. ¿Tu nombre para el presupuesto?"'
          ],
          'Clínica': [
            'Cliente: "Quiero información sobre tratamiento para el dolor de espalda"',
            'Agente IA: "¡Hola! 🏥 Tenemos especialistas en columna. ¿El dolor es reciente o crónico?"',
            'Cliente: "Llevo 3 meses con molestias"',
            'Agente IA: "En ese caso lo mejor es una primera consulta. ¿Te agendo para esta semana?"'
          ],
          'Gimnasio': [
            'Cliente: "¿Cuánto cuesta la matrícula y la cuota mensual?"',
            'Agente IA: "¡Hola! 💪 Tenemos cuotas desde 29€/mes sin matrícula este mes. ¿Quieres venir a conocer las instalaciones?"',
            'Cliente: "Sí, ¿cuándo puedo ir?"',
            'Agente IA: "Cuando quieras 😊 ¿Te apunto para mañana y te doy un pase de día gratis?"'
          ]
        };

        var defaultDemo = [
          'Cliente: "Hola, ¿me podéis ayudar con información?"',
          'Agente IA: "¡Hola! 👋 Claro, estoy aquí para ayudarte. ¿Qué necesitas?"',
          'Cliente: "Quiero saber más sobre vuestros servicios"',
          'Agente IA: "Con mucho gusto 😊 ¿Prefieres que te llame un especialista o te lo explico aquí?"'
        ];

        var demoLines = null;
        var sectorLower = sector.toLowerCase();
        for(var key in demos){
          var keyLower = key.toLowerCase();
          if(sectorLower.indexOf(keyLower) >= 0 || keyLower.indexOf(sectorLower) >= 0){
            demoLines = demos[key];
            break;
          }
        }
        if(!demoLines) demoLines = defaultDemo;

        w.bot('Así funciona en tu negocio 👇');
        var delay = 800;
        for(var i = 0; i < demoLines.length; i++){
          (function(line, d){
            setTimeout(function(){ w.bot(line); }, d);
          })(demoLines[i], delay);
          delay += 1000;
        }
        setTimeout(function(){
          capturaNatural('Spark — vio demo · ' + sector);
        }, delay);
      }

      // ─── 7. PRECIO ────────────────────────────────────────────────────────
      function mostrarPrecio(){
        w.setInput(false);
        w.bot('Nuestro Pack Spark es la forma más rápida de empezar 👇');
        setTimeout(function(){
          w.bot(
            '✅ Agente IA en tu web en 5-7 días<br>'+
            '✅ Capta leads 24/7 mientras duermes<br>'+
            '✅ Sin permanencia — si no funciona, te vas sin pagar nada más<br><br>'+
            '💰 <b>499€ de setup + 199€/mes</b>'
          );
        }, 800);
        setTimeout(function(){
          w.bot('Nuestros clientes recuperan la inversión en menos de 6 semanas con los leads que genera. ¿Quieres calcularlo para tu negocio?');
        }, 1800);
        setTimeout(function(){
          opts([
            { label:'Sí, quiero empezar 🚀', value:'start' },
            { label:'Primero ver la demo',   value:'demo'  },
            { label:'Tengo dudas',           value:'dudas' }
          ], function(o){
            if(o.value === 'start')     return capturaNatural('Precio visto — quiere empezar · ' + (ctx.sectorLabel || ''));
            if(o.value === 'demo')      return miniDemo();
            w.bot('Sin problema 😊 ¿Qué duda tienes? Te respondo ahora mismo.', function(){
              w.setInput(true, 'Cuéntame tu duda...');
            });
          });
        }, 2800);
      }

      // ─── EXPLICACIÓN SIMPLE (no sé / no entiendo / ayuda) ─────────────────
      function explicacionSimple(){
        w.setInput(false);
        w.bot(
          'Te lo explico fácil 👍<br><br>'+
          'Ponemos en tu web (o te creamos una) un asistente con IA que atiende a tus clientes <b>24/7</b>: les responde al instante, recoge sus datos y te los manda por WhatsApp para que tú solo tengas que llamar.<br><br>'+
          'Sin que tengas que estar pendiente del móvil ni perder consultas por la noche.<br><br>'+
          '¿Te enseño un ejemplo rápido?',
          function(){
            opts([
              { label:'👀 Sí, enséñame',    value:'demo'   },
              { label:'💰 ¿Cuánto cuesta?', value:'precio' },
              { label:'📞 Mejor llamadme',  value:'llamar' }
            ], function(o){
              if(o.value === 'demo')   return miniDemo();
              if(o.value === 'precio') return mostrarPrecio();
              capturaNatural('Spark — pidió llamada');
            });
          }
        );
      }

      // ─── FALLBACK ─────────────────────────────────────────────────────────
      function fallbackHelp(){
        w.setInput(false);
        w.bot(
          'Te leo 👍 ¿Quieres que te enseñe cómo funciona, ver los precios, o prefieres que te llamemos y lo vemos juntos?',
          function(){
            opts([
              { label:'👀 Ver cómo funciona', value:'demo'   },
              { label:'💰 Ver precios',        value:'precio' },
              { label:'📞 Que me llamen',      value:'llamar' }
            ], function(o){
              if(o.value === 'demo')   return miniDemo();
              if(o.value === 'precio') return mostrarPrecio();
              capturaNatural('Spark — pidió llamada');
            });
          }
        );
      }

      // ─── FLUJO WEB PROFESIONAL ────────────────────────────────────────────
      function flowWeb(){
        w.bot(
          'Una web con IA integrada no es solo una tarjeta de visita online — es <b>tu mejor comercial</b>. 🌐<br><br>'+
          'Trabaja 24/7, nunca se cansa, nunca pierde un lead y aparece en Google Y en ChatGPT cuando tus clientes buscan lo que tú ofreces.<br><br>'+
          'El <b>78% de consumidores</b> investiga online antes de comprar. Si no apareces — no existes para ellos.<br><br>'+
          'Con WhiteMoon tu web no solo existe — <b>destaca</b>. 💪',
          function(){ flowWebQuestions(); }
        );
      }

      function flowWebQuestions(){
        w.flow([
          { key:'sector',  msg:'¿Para qué sector es la web?', opts: SECTORES },
          { key:'dominio', msg:'¿Tienes dominio y hosting?',  opts:['Tengo todo','Necesito todo','No sé'] }
        ], function(data){
          w.bot(
            '<b>🌐 Pack Core — 1.800€ setup + 199€/mes</b><br>'+
            'Web profesional + Chatbot IA para <b>'+u.escapeHtml(data.sector)+'</b> + sistema de reservas<br>'+
            '🔍 SEO técnico completo · 🤖 GEO/AEO (visible en ChatGPT y Grok) · 📱 Captura 24/7 → WhatsApp · Sin permanencia',
            function(){
              w.bot(
                '¿Sabías que el <b>70% de los usuarios decide en menos de 3 segundos</b> si una web es de confianza?<br><br>'+
                'Tu web carga en menos de 2 segundos y está optimizada para Google <b>y</b> para aparecer en ChatGPT y Grok como referencia de tu sector desde el día 1.',
                function(){
                  addDesc('Web profesional · sector ' + data.sector + ' · dominio: ' + data.dominio);
                  capture('Pack Core', data.sector);
                }
              );
            }
          );
        });
      }

      // ─── FLUJO AUDITORÍA IA ───────────────────────────────────────────────
      var AUDIT_TIPO_OPTS = [
        '🏪 Pyme local (1-10 empleados)',
        '🏢 Empresa mediana (10-50 empleados)',
        '🏭 Empresa grande (+50 empleados)',
        '👤 Autónomo / Freelance'
      ];

      var AUDIT_SECTOR_OPTS = [
        { label:'🦷 Dental',                  value:'salud' },
        { label:'⚖️ Legal',                   value:'legal' },
        { label:'✂️ Peluquería',              value:'peluqueria' },
        { label:'🍽️ Restaurante',             value:'hosteleria' },
        { label:'🔧 Taller',                  value:'taller' },
        { label:'📋 Gestoría',                value:'gestoria' },
        { label:'🐾 Veterinaria',             value:'veterinaria' },
        { label:'🏗️ Reformas',                value:'reformas' },
        { label:'📚 Formación',               value:'formacion' },
        { label:'🦶 Podología',               value:'podologia' },
        { label:'🏠 Inmobiliaria',            value:'inmobiliaria' },
        { label:'🛒 Retail',                  value:'retail' },
        { label:'🏭 Industria',               value:'industria' },
        { label:'💼 Servicios profesionales', value:'servicios' },
        { label:'🤔 Otro',                    value:'otro' }
      ];

      var AUDIT_DOLOR_OPTS = [
        '📞 Demasiadas consultas repetitivas',
        '⏰ Procesos manuales que consumen tiempo',
        '🚫 Pierdo clientes fuera de horario',
        '📉 No aparezco en Google ni en ChatGPT',
        '💸 Costes operativos muy altos',
        'Varios de estos'
      ];

      var AUDIT_SECTOR_MSGS = {
        legal:        'Los <b>despachos de abogados</b> que responden al instante captan hasta un <b>40% más de consultas iniciales</b>. Además el <b>60% de clientes</b> busca abogados en Google y ChatGPT antes de llamar — con WhiteMoon apareces ahí desde el día 1.<br><br>Identificamos exactamente dónde se quedan oportunidades sin atender y cómo automatizarlas. 🔍',
        salud:        'Las <b>clínicas</b> gestionan hasta <b>80 llamadas repetitivas al día</b> — citas, precios, horarios. Cada una son 5 minutos de tu equipo: <b>400 minutos diarios</b> en tareas que la IA resuelve sola.<br><br>Te calculamos el ahorro exacto en horas y euros para tu clínica. 💰',
        reformas:     'Las <b>empresas de reformas</b> que responden las primeras tienen <b>5x más probabilidad de cerrar</b> el presupuesto. El cliente pide 3 y elige al que llega antes con propuesta clara.<br><br>Con WhiteMoon ese presupuesto siempre es el tuyo. 🏗️',
        hosteleria:   'Los <b>restaurantes</b> con respuesta automática 24/7 captan hasta <b>20 mesas más por semana</b>. El <b>45% de clientes</b> pregunta en ChatGPT antes de reservar — con WhiteMoon apareces ahí.<br><br>Tu restaurante visible y reservando solo, también de noche. 🍽️',
        retail:       'El <b>comercio local</b> recupera hasta un <b>65% de ventas potenciales</b> con atención automatizada fuera de horario. Los clientes comparan en ChatGPT antes de entrar a la tienda — apareces tú, no Amazon.<br><br>Tu comercio visible 24/7 sin contratar más personal. 🛒',
        industria:    'Las <b>empresas industriales</b> tardan 3-5 días en responder solicitudes de presupuesto. La IA cualifica y responde en <b>menos de 2 minutos — 24/7</b>.<br><br>Cada pedido entra en tu pipeline el mismo instante en que se solicita. 🏭',
        servicios:    'Las <b>consultoras</b> dedican el <b>30% de su tiempo</b> a tareas administrativas repetitivas. La IA gestiona propuestas, seguimientos y onboarding automáticamente.<br><br>Recuperas 15-20 horas semanales para facturarlas en proyectos rentables. 💼',
        gestoria:     'Las <b>gestorías</b> reciben las mismas preguntas <b>100 veces al día</b> — ITP, plazos, documentación. Cada respuesta manual son 10 minutos de un gestor cualificado.<br><br>La IA responde al instante y libera a tu equipo para las tareas que sí facturan. 📋',
        peluqueria:   'Los <b>salones</b> con confirmación automática de reservas reducen ausencias hasta un <b>30%</b>. Cada hueco vacío son 30-60€ recuperados.<br><br>Agenda llena, recordatorios automáticos y cero huecos sin cubrir. ✂️',
        taller:       'Los <b>talleres</b> reciben decenas de llamadas al día preguntando precios, disponibilidad y plazos. Cada llamada no atendida es un cliente que entra en el taller de enfrente.<br><br>La IA atiende cada llamada al instante y te entrega solo los clientes cualificados. 🔧',
        veterinaria:  'Las <b>clínicas veterinarias</b> gestionan urgencias, citas y propietarios preocupados <b>24/7</b>. Cada llamada nocturna es un cliente que decide en ese momento.<br><br>La IA atiende fuera de horario y nunca deja una urgencia sin respuesta. 🐾',
        formacion:    'Los <b>centros de formación</b> que responden al instante captan hasta un <b>50% más de matrículas</b>. El alumno decide en el momento de máximo interés — si no le respondes tú, le responde otro centro.<br><br>La IA convierte ese interés en matrícula automática. 📚',
        podologia:    'Las <b>clínicas de podología</b> reciben la mayoría de llamadas en horario laboral, cuando el equipo está atendiendo consulta. Cada llamada que entra al buzón es un paciente que llama a la clínica de al lado.<br><br>La IA atiende cada consulta y agenda citas mientras tú trabajas. 🦶',
        inmobiliaria: 'El <b>sector inmobiliario</b> capta hasta un <b>80% más de contactos</b> con respuesta automática fuera de horario. El comprador decide en horas — si no le respondes tú, le responde la competencia.<br><br>La IA cualifica leads serios y agenda visitas 24/7. 🏠',
        otro:         'Independientemente del sector, la mayoría de empresas deja sin captar entre <b>20-40% de oportunidades</b> por falta de automatización.<br><br>La auditoría te muestra el ahorro exacto para tu negocio — y el ROI mes a mes. 🤔'
      };

      function flowAuditoria(){
        w.bot(
          'La <b>Auditoría IA de WhiteMoon</b> es un análisis completo de tu negocio donde identificamos:<br><br>'+
          '🔍 Qué procesos puedes automatizar con IA<br>'+
          '💰 ROI estimado por cada automatización<br>'+
          '📊 Si apareces en ChatGPT, Perplexity y Grok<br>'+
          '🏗️ Arquitectura técnica recomendada<br>'+
          '📋 Presupuesto detallado de implementación<br><br>'+
          'Todo en un informe de 5-7 páginas entregado en 7 días laborables.<br>'+
          '💰 <b>899€ pago único</b> · Descontable si contratas después',
          function(){ auditoriaAskTipo({}); }
        );
      }

      function auditoriaAskTipo(data){
        w.bot('¿Para qué tipo de empresa es?', function(){
          w.showOpts(AUDIT_TIPO_OPTS.map(function(s){ return { label:s, value:s }; }), function(o){
            data.tipo = o.value;
            auditoriaAskSector(data);
          });
        });
      }

      function auditoriaAskSector(data){
        w.bot('¿A qué sector pertenece tu empresa?', function(){
          w.showOpts(AUDIT_SECTOR_OPTS, function(o){
            data.sector    = o.label;
            data.sectorKey = o.value;
            auditoriaSectorPreAnalysis(data);
          });
        });
      }

      function auditoriaSectorPreAnalysis(data){
        var msg = AUDIT_SECTOR_MSGS[data.sectorKey] || AUDIT_SECTOR_MSGS.otro;
        w.bot(msg, function(){
          setTimeout(function(){
            w.bot('Esto es exactamente lo que analizamos en la <b>Auditoría IA</b>. Dime…', function(){
              auditoriaAskDolor(data);
            });
          }, 1500);
        });
      }

      function auditoriaAskDolor(data){
        w.bot('¿Cuál es tu mayor reto ahora mismo?', function(){
          w.showOpts(AUDIT_DOLOR_OPTS.map(function(s){ return { label:s, value:s }; }), function(o){
            data.dolor = o.value;
            auditoriaShowROI(data);
          });
        });
      }

      function auditoriaShowROI(data){
        w.bot(
          'Perfecto. Basándonos en empresas similares a la tuya hemos identificado ahorros medios de:<br><br>'+
          '⏱️ <b>15-20 horas/semana</b> en tareas manuales<br>'+
          '📈 <b>30-40% más leads</b> captados automáticamente<br>'+
          '💰 <b>2.000-5.000€/mes</b> de coste operativo reducido<br><br>'+
          'La auditoría te dará los números exactos para <b>TU negocio</b>.',
          function(){
            w.bot('¿Quieres que te llamemos para explicarte cómo funciona el proceso?', function(){
              w.showOpts([
                { label:'✅ Sí, llamadme',     value:'si' },
                { label:'❓ Tengo más dudas', value:'dudas' }
              ], function(o){
                if(o.value === 'dudas'){ flowAuditoriaDudas(data); return; }
                captureAuditoria(data);
              });
            });
          }
        );
      }

      function flowAuditoriaDudas(data){
        w.bot('Claro, ¿qué quieres saber?', function(){
          w.showOpts([
            { label:'¿Qué incluye exactamente?',     value:'incluye' },
            { label:'¿Cuánto tiempo lleva?',         value:'tiempo' },
            { label:'¿Es presencial o online?',      value:'modalidad' },
            { label:'¿Y si luego no contrato nada?', value:'sincontrato' }
          ], function(o){
            var ans;
            if(o.value === 'incluye'){
              ans = 'El informe incluye mapa de oportunidades IA, ROI estimado por proceso, análisis de presencia GEO/AEO en LLMs, arquitectura técnica propuesta y presupuesto detallado. Presentación incluida.';
            } else if(o.value === 'tiempo'){
              ans = '7 días laborables desde que nos facilitas la información. Empezamos en 24-48h tras el pago.';
            } else if(o.value === 'modalidad'){
              ans = 'Totalmente online. La presentación final es por videoconferencia o presencial en Majadahonda.';
            } else {
              ans = 'Sin problema. La auditoría tiene valor por sí sola. Y si contratas en los 90 días siguientes, los 899€ se descuentan del proyecto.';
            }
            w.botText(ans, function(){ captureAuditoria(data); });
          });
        });
      }

      function captureAuditoria(data){
        if(!ctx.sectorLabel) ctx.sectorLabel = data.sector || 'General';
        addDesc('Auditoría IA — ' + (data.tipo || '') + ' · reto: ' + (data.dolor || ''));
        var detalle = 'Sector: ' + (data.sector || 'No especificado') +
                      ' | Tipo: '  + (data.tipo  || '') +
                      ' | Reto: '  + (data.dolor || '');
        doCapture('Auditoría IA', detalle);
      }

      // ─── FLUJO AGENTES IA (conversión · pivote estratégico) ───────────────
      var AGENTES_VISITAS_OPTS = [
        { label:'Menos de 500',  value:'<500'    },
        { label:'500 - 2.000',   value:'500-2k'  },
        { label:'Más de 2.000',  value:'>2k'     },
        { label:'No lo sé',      value:'unknown' }
      ];
      var AGENTES_PROBLEMA_OPTS = [
        { label:'Los leads no convierten',          value:'no_convierten' },
        { label:'Tardamos en responder',            value:'lentos'        },
        { label:'No sabemos qué quiere el cliente', value:'sin_intencion' },
        { label:'Otro',                             value:'otro'          }
      ];
      var AGENTES_SECTOR_OPTS = [
        { label:'Clínica dental',        value:'dental'       },
        { label:'Despacho de abogados',  value:'legal'        },
        { label:'Peluquería / estética', value:'peluqueria'   },
        { label:'Restaurante',           value:'restaurante'  },
        { label:'Taller mecánico',       value:'taller'       },
        { label:'Gestoría / asesoría',   value:'gestoria'     },
        { label:'Clínica veterinaria',   value:'veterinaria'  },
        { label:'Inmobiliaria',          value:'inmobiliaria' },
        { label:'Otro sector',           value:'otro'         }
      ];

      function flowAgentesIA(){
        w.bot(
          '¿Tu web recibe visitas pero pocas se convierten en clientes?<br>'+
          'Nuestros <b>Agentes IA</b> cambian eso.<br><br>'+
          '¿Cuántas visitas mensuales tiene tu web?',
          function(){
            w.showOpts(AGENTES_VISITAS_OPTS, function(v){
              var data = { visitas:v.label };
              w.bot('¿Cuál es tu mayor problema ahora mismo?', function(){
                w.showOpts(AGENTES_PROBLEMA_OPTS, function(p){
                  data.problema = p.label;
                  w.bot(
                    'Entendido. Un <b>Agente IA WhiteMoon</b> en tu sector podría cambiar eso esta semana.<br><br>'+
                    '¿Quieres ver cómo funciona?',
                    function(){
                      w.showOpts([
                        { label:'Sí, quiero verlo',            value:'demo' },
                        { label:'Prefiero hablar con alguien', value:'call' }
                      ], function(o){
                        if(o.value === 'call'){
                          agentesCapture(data, null);
                          return;
                        }
                        w.bot('¿En qué sector opera tu empresa?', function(){
                          w.showOpts(AGENTES_SECTOR_OPTS, function(s){
                            data.sector    = s.label;
                            data.sectorKey = s.value;
                            ctx.sectorKey   = s.value;
                            ctx.sectorLabel = s.label;
                            var emp = VALUE_PROP[s.value];
                            if(emp){
                              w.bot(emp, function(){ agentesCapture(data, s); });
                            } else {
                              w.bot(
                                'Genial. Para <b>'+s.label+'</b> diseñamos un Agente IA que cualifica, convence y agenda 24/7 sin intervención humana.',
                                function(){ agentesCapture(data, s); }
                              );
                            }
                          });
                        });
                      });
                    }
                  );
                });
              });
            });
          }
        );
      }

      function agentesCapture(data, sectorOpt){
        var sectorLabel = sectorOpt ? sectorOpt.label : (ctx.sectorLabel || 'Agencia IA');
        if(!ctx.sectorLabel) ctx.sectorLabel = sectorLabel;
        var tramite = sectorOpt ? ('Agente IA · ' + sectorLabel) : 'Agente IA · conversión';
        addDesc(
          'Agentes IA · sector:' + sectorLabel +
          ' · visitas:' + (data.visitas || '') +
          ' · problema:' + (data.problema || '')
        );
        doCapture(tramite, null, 'chatbot-agentes-ia');
      }

      // ─── FLUJO RAG (sistemas con documentos) ──────────────────────────────
      var RAG_CASE_MSGS = {
        manuales:  'Para <b>manuales y procedimientos</b>, el RAG es un asistente que conoce todo lo que el equipo necesita: protocolos, paso a paso y normas internas — accesible 24/7 sin interrumpir a nadie.',
        legal:     'Para <b>casos y expedientes</b>, el RAG indexa todo el histórico jurídico y responde con jurisprudencia interna, contratos y precedentes — útil para abogados y secretarías.',
        catalogo:  'Para <b>catálogos</b>, el chatbot conoce cada producto/servicio con precio, especificaciones y disponibilidad — y responde a clientes 24/7 sin que tu equipo levante una llamada.',
        tarifas:   'Para <b>tarifas y presupuestos</b>, el RAG cualifica al cliente, calcula el precio aproximado y deriva el lead listo para cerrar — sin que tu equipo dedique tiempo a cotizaciones repetitivas.',
        formativo: 'Para <b>material formativo</b>, el RAG funciona como tutor 24/7 que responde dudas de alumnos sobre el contenido propio del curso — sin que el formador tenga que repetir lo mismo cien veces.',
        otro:      'Sea cual sea tu documentación, el RAG la indexa y la convierte en un asistente que responde con tu información exacta — sin alucinar.'
      };

      function flowRAG(){
        w.bot(
          'El <b>sistema RAG de WhiteMoon</b> convierte tus documentos en un asistente IA que responde con tu información exacta 24/7.<br><br>'+
          'Sin alucinar. Sin inventarse datos. Solo lo que tú le has enseñado. 🧠',
          function(){
            w.bot('¿Para qué tipo de documentación lo necesitas?', function(){
              w.showOpts([
                { label:'📋 Manuales y procedimientos internos', value:'manuales'  },
                { label:'⚖️ Casos, contratos o expedientes',     value:'legal'     },
                { label:'🛍️ Catálogo de productos o servicios',  value:'catalogo'  },
                { label:'📊 Tarifas y presupuestos',             value:'tarifas'   },
                { label:'🎓 Material formativo',                 value:'formativo' },
                { label:'Otro tipo de documentación',            value:'otro'      }
              ], function(o){ ragShowCase(o); });
            });
          }
        );
      }

      function ragShowCase(opt){
        w.bot(RAG_CASE_MSGS[opt.value] || RAG_CASE_MSGS.otro, function(){
          w.bot('¿Cuántos documentos aproximadamente tienes?', function(){
            w.showOpts([
              { label:'Menos de 100',  value:'pocos'  },
              { label:'100-200 docs',  value:'medios' },
              { label:'Más de 200',    value:'muchos' }
            ], function(vol){
              var plan, msg;
              if(vol.value === 'pocos'){
                plan = 'Core RAG';
                msg = 'Para ' + opt.label + ' con menos de 100 documentos, ' +
                      'el Pack Core RAG es perfecto: 3.200€ setup + 349€/mes. ' +
                      'Tu Agente IA entrenado con tus documentos en 5-7 días.';
              } else if(vol.value === 'medios'){
                plan = 'Scale';
                msg = 'Con ' + vol.label + ', el Pack Scale es tu opción: ' +
                      '4.500€ setup + 449€/mes. Hasta 200 documentos indexados.';
              } else {
                plan = 'Elite';
                msg = 'Con más de 200 documentos necesitas el Pack Elite: ' +
                      '8.500€ setup + 799€/mes. Documentos ilimitados.';
              }
              w.bot(msg);
              addDesc('RAG — ' + opt.label + ' · volumen: ' + vol.label);
              setTimeout(function(){
                doCapture('Pack ' + plan + ' — RAG (' + opt.label +
                  ' · ' + vol.label + ')', null, 'chatbot-rag');
              }, 1000);
            });
          });
        });
      }

      // ─── FLUJO DE SOLICITUD DESDE CTA DE PACK ────────────────────────────
      function flowSolicitud(pack){
        ctx.packInteres = pack;
        w.bot('¡Hola! 👋 Veo que te interesa el Pack ' + pack + '.');
        setTimeout(function(){
          w.bot('Para darte toda la información personalizada necesito conocerte un poco. ¿Cómo se llama tu empresa?');
          ctx.state = 'solicitud_empresa';
        }, 800);
      }

      // ─── DETECCIÓN DE DESPEDIDA ───────────────────────────────────────────
      var DESPEDIDAS = [
        'nada','gracias','adios','adiós','bye',
        'no gracias','nada mas','nada más',
        'hasta luego','ok gracias','perfecto gracias',
        'ya está','ya esta','no necesito','no me interesa',
        'no por ahora','otro dia','otro día'
      ];

      function esDespedida(txt){
        var t = txt.toLowerCase().trim();
        return DESPEDIDAS.some(function(d){
          return t === d || t.indexOf(d) >= 0;
        });
      }

      // ─── DETECCIÓN DE INTERÉS ─────────────────────────────────────────────
      var INTERES = [
        'me interesa','interesa','quiero','si quiero',
        'sí quiero','adelante','vamos','empezamos',
        'me apunto','quiero saber mas','quiero saber más',
        'si','sí','claro','por supuesto','dale'
      ];

      function esInteres(txt){
        var t = txt.toLowerCase().trim();
        return INTERES.some(function(d){ return t === d; });
      }

      // ─── ROUTER DE ENTRADA ────────────────────────────────────────────────
      async function route(text){
        text = (text || '').trim();
        if(!text) return;
        w.addUser(text);

        // Si no hay flujo activo → Claude responde
        if (!ctx.state && !ctx.sectorLabel) {
          var reply = await askClaude(text);
          if (reply) {
            w.bot(reply);
            // Detectar si Claude pidió datos de contacto
            if (/nombre|teléfono|tel\.|llamar|contactar/i.test(reply)) {
              setTimeout(function(){
                capturaNatural('Interés via Claude AI · ' + text.slice(0,50));
              }, 1500);
            }
            return;
          }
        }

        // flujo solicitud desde CTA — empresa → nombre → teléfono
        if(ctx.state === 'solicitud_empresa'){
          ctx.empresaNombre = text;
          ctx.state = 'solicitud_nombre';
          w.bot('Perfecto 👍 ¿Y cómo te llamas tú?');
          return;
        }
        if(ctx.state === 'solicitud_nombre'){
          ctx.contactoNombre = text;
          ctx.state = 'solicitud_telefono';
          w.bot('Encantado/a ' + text + ' 😊 ¿A qué número te llamamos? Te contactamos hoy mismo.');
          return;
        }
        if(ctx.state === 'solicitud_telefono'){
          ctx.state = null;
          doCapture(
            'Solicitud Pack ' + (ctx.packInteres || 'General'),
            'Empresa: ' + (ctx.empresaNombre || '—') +
              ' | Contacto: ' + (ctx.contactoNombre || '—'),
            'chatbot-solicitud'
          );
          return;
        }

        // despedida → cerrar con elegancia, sin captura
        if(esDespedida(text)){
          w.bot('¡Hasta pronto! 👋 Cuando quieras más clientes, aquí estaremos. ¡Mucho éxito con tu negocio!');
          return;
        }

        // interés directo → captura inmediata (route() solo corre fuera de captura)
        if(esInteres(text)){
          capturaNatural('Interés directo · ' + (ctx.sectorLabel || 'General'));
          return;
        }

        var t = u.normalize(text);
        var words = t.split(/\s+/).filter(Boolean);

        // saludo "limpio" → reiniciar la apertura
        if(words.length <= 2 && /^(hola|hello|hey|buenas|buenos|saludos)\b/.test(t)){ abrir(); return; }

        // atajos disponibles en cualquier momento
        if(t.indexOf('cuanto') !== -1 || t.indexOf('precio') !== -1 || t.indexOf('cuesta') !== -1 || t.indexOf('coste') !== -1 || t.indexOf('tarifa') !== -1 || t.indexOf('presupuesto') !== -1){ mostrarPrecio(); return; }
        if(t.indexOf('demo') !== -1 || t.indexOf('ejemplo') !== -1 || t.indexOf('como funciona') !== -1 || t.indexOf('muestrame') !== -1 || t.indexOf('enseñame') !== -1 || t.indexOf('enseñ') !== -1){ miniDemo(); return; }
        if(t.indexOf('no entiendo') !== -1 || t === 'no se' || t.indexOf('no se ') === 0 || t.indexOf('ni idea') !== -1 || t.indexOf('ayuda') !== -1 || t.indexOf('no me entero') !== -1){ explicacionSimple(); return; }

        // flujos especializados (jerga inequívoca → enrutar siempre)
        if(/\bagente(s)?\b/.test(t) || t.indexOf('conversion') !== -1 || t.indexOf('convierte') !== -1 || t.indexOf('cualifica') !== -1 || t.indexOf('pipeline') !== -1 || /\bventas?\b/.test(t) || /\bleads?\b/.test(t) || /\bcierra\b/.test(t) || /\bclientes?\b/.test(t)){ flowAgentesIA(); return; }
        if(t.indexOf('auditoria') !== -1 || t.indexOf('analisis ia') !== -1 || /\broi\b/.test(t)){ flowAuditoria(); return; }
        if(/\brag\b/.test(t) || t.indexOf('base de conocimiento') !== -1){ flowRAG(); return; }

        // pasos guiados de la conversación principal
        if(state === 'business'){ onBusinessDescription(text); return; }

        // términos ambiguos → solo fuera de los pasos guiados
        if(t.indexOf('analisis') !== -1 || t.indexOf('auditor') !== -1){ flowAuditoria(); return; }
        if(t.indexOf('documento') !== -1 || t.indexOf('conocimiento') !== -1){ flowRAG(); return; }
        if(t.indexOf('wordpress') !== -1 || /\bpagina\b/.test(t) || /\bweb\b/.test(t)){ flowWeb(); return; }

        fallbackHelp();
      }

      // ─── API PÚBLICA — apertura de chatbot desde CTAs ─────────────────────
      function wmOpenChat(pack){
        var btn = document.getElementById('wm-chat-btn');
        if(btn) btn.click();
        setTimeout(function(){
          if(pack) flowSolicitud(pack);
        }, 600);
      }
      window.wmOpenChat = wmOpenChat;

      w.onOpen(abrir);
      w.onInput(route);
    }
  };
})();
