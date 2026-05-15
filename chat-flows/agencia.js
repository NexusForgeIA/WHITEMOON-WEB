/**
 * WHITEMOON FLOW · agencia — conversación inteligente por sector
 * Detección de sector por texto libre · diagnóstico · agitación · mini-demo · captura natural
 */
(function(){
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

      // ─── PROPUESTA DE VALOR POR SECTOR (dolor + resultado concreto) ───────
      var VALUE_PROP = {
        dental:      '🦷 Cada paciente que no responde a tiempo se va a la clínica de enfrente. Nuestros clientes dentales captan un 40% más de pacientes nuevos desde que tienen su Agente IA. ¿Quieres verlo funcionando?',
        legal:       '⚖️ Un lead que no responde en menos de 5 minutos elige otro despacho. Con IA respondemos al instante, cualificamos el caso y tú solo recibes clientes listos para contratar.',
        peluqueria:  '✂️ Las peluquerías que usan nuestro Agente IA llenan agenda sin coger el teléfono. Cero llamadas perdidas, cero huecos vacíos. ¿Cuánto te cuesta cada hueco sin cubrir?',
        restaurante: '🍽️ Mesas vacías = dinero perdido. Nuestros restaurantes han aumentado las reservas un 35% con respuesta automática 24/7. ¿Quieres ver cómo funciona en el tuyo?',
        automocion:  '🚗 El 70% de compradores de coches contacta con 3 concesionarios a la vez. El que responde primero gana la venta. ¿Quieres ser siempre el primero?',
        taller:      '🔧 Mientras estás debajo de un coche tu competencia está captando tus clientes online. Nuestro Agente IA capta, agenda y confirma citas solo. ¿Cuántas llamas pierdes al día?',
        gestoria:    '📋 Cada consulta sin responder es un cliente que va a otra gestoría. Con IA respondes al instante, filtras casos rentables y llenas tu agenda de reuniones cualificadas.',
        veterinaria: '🐾 Las urgencias no esperan. Las clínicas veterinarias con nuestro Agente IA no pierden ni una llamada de noche o fin de semana. ¿Cuántas urgencias pierdes fuera de horario?',
        reformas:    '🏗️ El 80% de presupuestos de reforma los piden a 3 empresas. El que responde más rápido con mejor propuesta se lleva el trabajo. ¿Quieres ganar más presupuestos?',
        formacion:   '📚 Un alumno que no recibe respuesta en 10 minutos se apunta a otro centro. Nuestros clientes de formación han multiplicado sus matrículas sin contratar más personal.',
        podologia:   '🦶 Las ausencias y los huecos vacíos te cuestan dinero cada día. Con recordatorios automáticos y agenda online nuestros podólogos han reducido ausencias un 60%.',
        inmobiliaria:'🏠 Cada lead inmobiliario vale miles de euros. Con nuestro Agente IA cualificas compradores serios 24/7 y nunca pierdes una oportunidad por no responder a tiempo.',
        salud:       '🏥 Los pacientes eligen clínica en menos de 2 minutos online. Con respuesta inmediata y agenda automática captamos nuevos pacientes mientras tú atiendes los actuales.',
        gimnasio:    '💪 El 90% de personas que buscan gimnasio online se apuntan al que responde más rápido. Nuestros gimnasios captan socios nuevos cada día sin mover un dedo.',
        empresas:    '🏢 Cada visita a tu web que no convierte es dinero que se va. Nuestro Agente IA convierte visitantes en clientes cualificados 24/7. ¿Cuántas visitas recibes al mes?'
      };

      // ─── 1. APERTURA ──────────────────────────────────────────────────────
      function abrir(){
        ctx   = { sectorKey:null, sectorLabel:null, descripcion:null, sistema:null, retries:0 };
        state = 'business';
        w.bot('¿Tu negocio podría facturar más este mes? 💰', function(){
          setTimeout(function(){
            w.bot(
              'La mayoría de empresas pierden clientes cada día porque no responden a tiempo. Nosotros lo arreglamos con IA. ¿A qué te dedicas?',
              function(){ w.setInput(true, 'Ej: tengo una clínica dental...'); }
            );
          }, 800);
        });
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
        legal:        'Los <b>despachos de abogados</b> pierden de media el <b>40% de consultas iniciales</b> por no responder a tiempo. Además el <b>60% de clientes</b> busca abogados en Google y ChatGPT antes de llamar — ¿apareces tú?<br><br>Identificamos exactamente dónde estás perdiendo clientes sin saberlo. 🔍',
        salud:        'Las <b>clínicas</b> gestionan hasta <b>80 llamadas repetitivas al día</b> — citas, precios, horarios. Cada llamada son 5 minutos de tu equipo. Eso es 400 minutos al día en tareas automatizables.<br><br>¿Cuánto te está costando eso al mes? 💰',
        reformas:     'Las <b>empresas de reformas</b> pierden el <b>70% de presupuestos</b> solicitados fuera de horario. El cliente pide 3 presupuestos — el primero en responder tiene <b>5x más probabilidad de cerrar</b>.<br><br>¿Cuántos presupuestos pierdes cada semana? 🏗️',
        hosteleria:   'Los <b>restaurantes</b> sin respuesta online pierden hasta <b>20 mesas por semana</b>. El <b>45% de clientes</b> pregunta en ChatGPT antes de reservar — ¿apareces tú o tu competencia?<br><br>¿Tu restaurante aparece cuando buscan en IA? 🍽️',
        retail:       'El <b>comercio local</b> pierde el <b>65% de ventas potenciales</b> por no tener atención fuera de horario. Los clientes comparan precios en ChatGPT antes de entrar a la tienda.<br><br>¿Apareces tú o aparece Amazon? 🛒',
        industria:    'Las <b>empresas industriales</b> tardan 3-5 días en responder solicitudes de presupuesto. La IA cualifica y responde en <b>menos de 2 minutos — 24/7</b>.<br><br>¿Cuántos pedidos pierdes por lentitud de respuesta? 🏭',
        servicios:    'Las <b>consultoras</b> dedican el <b>30% de su tiempo</b> a tareas administrativas repetitivas. La IA puede gestionar propuestas, seguimientos y onboarding automáticamente.<br><br>¿Cuántas horas semanales pierdes en admin? 💼',
        gestoria:     'Las <b>gestorías</b> reciben las mismas preguntas <b>100 veces al día</b> — ITP, plazos, documentación. Cada consulta respondida manualmente son 10 minutos perdidos de un gestor cualificado.<br><br>¿Cuántas consultas repetitivas gestionas al día? 📋',
        peluqueria:   'Los <b>salones</b> pierden hasta el <b>30% de citas</b> por no confirmar reservas automáticamente. Cada hueco vacío son 30-60€ perdidos.<br><br>¿Cuántas citas no confirmadas tienes cada semana? ✂️',
        taller:       'Los <b>talleres</b> reciben decenas de llamadas preguntando precios, disponibilidad y plazos. Cada llamada que no se atiende es un cliente que llama al taller de enfrente.<br><br>¿Cuántas llamadas pierdes al día? 🔧',
        veterinaria:  'Las <b>clínicas veterinarias</b> gestionan urgencias, citas y preguntas de propietarios preocupados <b>24/7</b>. Cada llamada no atendida fuera de horario es un cliente que busca otra clínica en Google.<br><br>¿Cuántas consultas urgentes pierdes por la noche? 🐾',
        formacion:    'Los <b>centros de formación</b> pierden el <b>50% de matrículas potenciales</b> por no responder en el momento de máximo interés del alumno.<br><br>¿Cuántas consultas de matrícula quedan sin respuesta cada día fuera de horario? 📚',
        podologia:    'Las <b>clínicas de podología</b> dependen de citas y la mayoría de pacientes llama en horario laboral cuando el equipo está ocupado atendiendo. Cada llamada perdida es un paciente que llama a la clínica de al lado.<br><br>¿Cuántas llamadas sin respuesta tienes al día? 🦶',
        inmobiliaria: 'El <b>sector inmobiliario</b> pierde el <b>80% de contactos</b> que llegan fuera de horario. Un comprador interesado toma decisiones en horas — si no le respondes tú, le responde tu competencia.<br><br>¿Cuántos leads inmobiliarios pierdes cada semana? 🏠',
        otro:         'Independientemente del sector, la mayoría de empresas pierde entre <b>20-40% de oportunidades</b> por falta de automatización.<br><br>La pregunta no es si la IA puede ayudarte — es cuánto te está costando no tenerla hoy. 🤔'
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
              { label:'Pocos (menos de 20 docs)',  value:'pocos'  },
              { label:'Medios (20-100 docs)',      value:'medios' },
              { label:'Muchos (más de 100 docs)',  value:'muchos' }
            ], function(vol){
              var plan   = vol.value === 'muchos' ? 'Elite' : 'Scale';
              var precio = plan === 'Elite' ? '8.500€ setup + 799€/mes' : '4.500€ setup + 449€/mes';
              w.bot(
                '<b>📈 Pack '+plan+'</b><br>'+precio+' · Sin permanencia<br>'+
                'RAG con tus documentos · IA que responde con tu información exacta 24/7',
                function(){
                  addDesc('RAG — ' + opt.label + ' · volumen: ' + vol.label);
                  capture('Pack ' + plan + ' — RAG (' + opt.label + ')', null);
                }
              );
            });
          });
        });
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

      // ─── ROUTER DE ENTRADA ────────────────────────────────────────────────
      function route(text){
        text = (text || '').trim();
        if(!text) return;
        w.addUser(text);

        // despedida → cerrar con elegancia, sin captura
        if(esDespedida(text)){
          w.bot('¡Hasta pronto! 👋 Cuando quieras más clientes, aquí estaremos. ¡Mucho éxito con tu negocio!');
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

      w.onOpen(abrir);
      w.onInput(route);
    }
  };
})();
