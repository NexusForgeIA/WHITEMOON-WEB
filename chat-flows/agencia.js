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
        title: '✅ ¡Listo, {nombre}!',
        text:  '{cierreLargo}',
        cta:   '👇 Confirma por WhatsApp si quieres',
        btn:   '📲 Confirmar cita',
        foot:  '{cierreFoot}'
      };

      // ─── ESTADO DE LA CONVERSACIÓN ────────────────────────────────────────
      var state = 'business';   // 'business' | 'sector_q' | 'idle'
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
        w.bot('Perfecto 💪', function(){ doCapture(tramite); });
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

      // ─── MENSAJES EMPÁTICOS POR SECTOR ────────────────────────────────────
      var EMPATHY = {
        dental:
          'Perfecto 🦷 Una clínica dental — uno de los negocios donde más leads se pierden fuera de horario.<br><br>'+
          'Los pacientes buscan dentista cuando les duele — y eso no entiende de horarios de oficina.<br><br>'+
          '¿Cuántas veces a la semana crees que alguien intenta contactarte y no puede porque estás atendiendo o está cerrado?',
        legal:
          'Entendido ⚖️ Un despacho de abogados — donde cada consulta que no se atiende puede ser un caso importante perdido.<br><br>'+
          'Los clientes buscan abogado en momentos de estrés — necesitan respuesta rápida.<br><br>'+
          '¿Tu despacho recibe consultas fuera de tu horario de atención?',
        peluqueria:
          'Genial ✂️ Una peluquería o centro de estética — donde las citas son el corazón del negocio.<br><br>'+
          '¿Cuántas veces al día recibes llamadas para pedir cita mientras estás cortando el pelo y no puedes atender el teléfono?',
        restaurante:
          'Perfecto 🍽️ Un restaurante — donde cada mesa vacía es dinero perdido y cada reserva que no llega duele.<br><br>'+
          '¿Cómo gestionas ahora mismo las reservas y consultas que llegan por la noche?',
        taller:
          'Entendido 🔧 Un taller mecánico — donde los clientes llaman cuando el coche falla y necesitan respuesta inmediata.<br><br>'+
          '¿Qué pasa ahora cuando alguien llama a tu taller y estás debajo de un coche?',
        automocion:
          'Perfecto 🚗 El sector de automoción es uno donde la IA marca una diferencia brutal.<br><br>'+
          '¿Cuántos leads pierdes cuando un comprador visita tu web a las 23h y no encuentra a nadie que le responda?<br><br>'+
          'Nuestro agente IA cualifica al comprador:<br>'+
          '✅ Presupuesto disponible<br>'+
          '✅ Financiación o contado<br>'+
          '✅ Modelo de interés<br>'+
          '✅ Urgencia de compra<br><br>'+
          'Y te envía el lead cualificado por WhatsApp listo para que tu comercial lo llame.<br><br>'+
          '¿Quieres ver cómo quedaría en tu web?',
        gestoria:
          'Perfecto 📋 Una gestoría o asesoría — donde los clientes siempre tienen dudas urgentes y necesitan respuesta antes de tomar decisiones.<br><br>'+
          '¿Cuántas consultas repetitivas recibes cada día sobre los mismos temas?',
        veterinaria:
          'Entendido 🐾 Una clínica veterinaria — donde los dueños de mascotas llaman con urgencia y la ansiedad no entiende de horarios.<br><br>'+
          '¿Cómo gestionas las consultas urgentes que llegan cuando la clínica está cerrada?',
        reformas:
          'Perfecto 🏗️ Una empresa de reformas — donde el primer presupuesto en responder tiene 5 veces más posibilidades de cerrar.<br><br>'+
          '¿Cuántos presupuestos crees que pierdes porque tardas en responder o estás en obra?',
        formacion:
          'Genial 📚 Un centro de formación — donde el interés del alumno dura poco y si no respondes rápido se apunta a otro.<br><br>'+
          '¿Cuántas consultas de matrícula quedan sin respuesta fuera de tu horario de oficina?',
        podologia:
          'Entendido 🦶 Una clínica de podología — donde los pacientes buscan cuando tienen dolor y no pueden esperar al día siguiente.<br><br>'+
          '¿Pierdes pacientes porque no puedes atender el teléfono mientras estás en consulta?',
        inmobiliaria:
          'Perfecto 🏠 Una inmobiliaria — donde el comprador interesado toma decisiones en horas y si no respondes tú responde tu competencia.<br><br>'+
          '¿Cuántos contactos de pisos pierdes fuera de tu horario de atención?',
        salud:
          'Entendido 🏥 Una clínica de salud — donde los pacientes necesitan sentir que alguien les atiende cuando más lo necesitan.<br><br>'+
          '¿Cómo gestionas las consultas que llegan cuando tu equipo está ocupado en consulta?',
        gimnasio:
          'Genial 💪 Un gimnasio o centro deportivo — donde los socios preguntan horarios, clases y precios a cualquier hora del día.<br><br>'+
          '¿Tu equipo dedica tiempo a responder las mismas preguntas una y otra vez?'
      };

      // ─── 1. APERTURA ──────────────────────────────────────────────────────
      function abrir(){
        ctx   = { sectorKey:null, sectorLabel:null, descripcion:null, sistema:null, retries:0 };
        state = 'business';
        w.bot(
          '¡Hola! 👋 Dime a qué te dedicas y te muestro en 30 segundos cómo quedaría el chatbot en tu negocio.<br>'+
          '¿Cuál es tu sector?',
          function(){ w.setInput(true, 'Ej: tengo una clínica dental...'); }
        );
      }

      // ─── 2. DESCRIPCIÓN DEL NEGOCIO → DETECCIÓN DE SECTOR ─────────────────
      function onBusinessDescription(text){
        addDesc(text);
        var s = detectarSector(text);
        if(s){
          ctx.sectorKey   = s.key;
          ctx.sectorLabel = s.label;
          state = 'sector_q';
          if(s.key === 'automocion'){
            w.bot(EMPATHY.automocion, function(){
              opts([
                { label:'✅ Ver demo',              value:'demo'   },
                { label:'💰 Ver precios',           value:'precio' },
                { label:'📞 Hablar con un experto', value:'llamar' }
              ], function(o){
                state = 'idle';
                if(o.value === 'demo')   return miniDemo();
                if(o.value === 'precio') return mostrarPrecio();
                capturaNatural('Automoción — pidió llamada');
              });
            });
            return;
          }
          w.bot(EMPATHY[s.key], function(){ w.setInput(true, 'Cuéntame...'); });
          return;
        }
        ctx.retries++;
        if(ctx.retries >= 2){
          if(!ctx.sectorLabel) ctx.sectorLabel = 'General';
          state = 'idle';
          w.bot(
            'Genial 👍 Sea cual sea tu sector, el reto suele ser el mismo: contactos que llegan, nadie los atiende a tiempo y se acaban perdiendo.',
            function(){ preguntaDiagnostico(); }
          );
          return;
        }
        state = 'business';
        w.bot(
          'Interesante 👍 Cuéntame un poco más sobre tu negocio — ¿qué tipo de clientes atiendes y cómo te suelen contactar?',
          function(){ w.setInput(true, 'Cuéntame un poco más...'); }
        );
      }

      // ─── 3. RESPUESTA A LA PREGUNTA SECTORIAL ─────────────────────────────
      function onSectorAnswer(text){
        addDesc(text);
        state = 'idle';
        w.bot('Entiendo perfectamente.', function(){ preguntaDiagnostico(); });
      }

      // ─── 4. PREGUNTA DE DIAGNÓSTICO ───────────────────────────────────────
      function preguntaDiagnostico(){
        w.setInput(false);
        w.bot(
          'Déjame preguntarte algo importante —<br>'+
          '¿tienes algún sistema ahora mismo que capture <b>automáticamente</b> esos contactos que se pierden?',
          function(){
            opts([
              { label:'No, todo es manual',                    value:'manual' },
              { label:'Tengo formulario pero nadie lo usa',    value:'form'   },
              { label:'Solo WhatsApp pero tardo en responder', value:'wa'     },
              { label:'No tengo nada',                         value:'nada'   }
            ], function(o){ ctx.sistema = o.value; agitarDolor(); });
          }
        );
      }

      // ─── 5. AGITAR EL DOLOR ───────────────────────────────────────────────
      function agitarDolor(){
        w.setInput(false);
        w.bot(
          'Eso es exactamente lo que pasa en la mayoría de negocios. Y el problema real no es que no tengas sistema — es <b>lo que cuesta cada día que pasa sin tenerlo</b>.<br><br>'+
          'Cada consulta sin respuesta es un cliente que llama al siguiente de la lista.<br><br>'+
          '¿Quieres ver cómo lo resolvemos?',
          function(){
            opts([
              { label:'✅ Sí, muéstrame',          value:'demo'   },
              { label:'💰 ¿Cuánto cuesta?',        value:'precio' },
              { label:'📞 Prefiero que me llamen', value:'llamar' }
            ], function(o){
              if(o.value === 'demo')   return miniDemo();
              if(o.value === 'precio') return mostrarPrecio();
              capturaNatural('Spark — pidió llamada');
            });
          }
        );
      }

      // ─── 6. MINI-DEMO INLINE ──────────────────────────────────────────────
      function miniDemo(){
        w.setInput(false);
        var servicio = (ctx.sectorLabel && ctx.sectorLabel !== 'General')
          ? u.escapeHtml('tu ' + ctx.sectorLabel.toLowerCase())
          : 'tus servicios';
        w.bot('Te muestro cómo funciona ahora mismo 👇', function(){
          setTimeout(function(){
            w.bot('Imagina que soy tu asistente IA trabajando en tu negocio ahora mismo...', function(){
              setTimeout(function(){
                w.bot(
                  '¡Hola! 👋 Gracias por contactarnos.<br>Estamos encantados de atenderte.<br>¿En qué puedo ayudarte hoy?',
                  function(){
                    setTimeout(function(){
                      w.bot(
                        'Así de simple. Tu cliente recibe respuesta inmediata — aunque sean las 3 de la madrugada.<br><br>'+
                        'Y tú recibes esto por WhatsApp al despertar:<br>'+
                        '📱 <i>«Nuevo lead: María García · 612 345 678 · interesada en '+servicio+' · Hora: 02:34»</i>',
                        function(){
                          setTimeout(function(){
                            w.bot('¿Lo montamos así para tu negocio?', function(){
                              opts([
                                { label:'✅ Sí, quiero esto',      value:'si'     },
                                { label:'❓ Tengo alguna duda',    value:'duda'   },
                                { label:'💰 ¿Cuánto me costaría?', value:'precio' }
                              ], function(o){
                                if(o.value === 'si')     return capturaNatural('Spark — vio demo inline');
                                if(o.value === 'precio') return mostrarPrecio();
                                w.bot('Sin problema 👍 Te llamamos y resolvemos cualquier duda — sin compromiso.', function(){
                                  capturaNatural('Spark — vio demo · tiene dudas');
                                });
                              });
                            });
                          }, 1500);
                        }
                      );
                    }, 2000);
                  }
                );
              }, 1500);
            });
          }, 1500);
        });
      }

      // ─── 7. PRECIO ────────────────────────────────────────────────────────
      function mostrarPrecio(){
        w.setInput(false);
        w.bot(
          'Sin letra pequeña ni sorpresas:<br><br>'+
          'El pack más popular para tu tipo de negocio:<br>'+
          '🤖 <b>499€ setup + 199€/mes</b> · Sin permanencia<br><br>'+
          'Operativo en 5-7 días.<br>'+
          'Y si en 30 días no estás satisfecho, lo ajustamos hasta que funcione perfecto.<br><br>'+
          '¿Te llamo para explicarte todo en 10 minutos?',
          function(){
            opts([
              { label:'✅ Sí, llámame',        value:'si'   },
              { label:'❓ Antes una pregunta', value:'duda' }
            ], function(o){
              if(o.value === 'si') return capturaNatural('Spark — consultó precio');
              w.bot('Claro 👍 Te llamamos sin compromiso y resolvemos lo que necesites antes de decidir nada.', function(){
                capturaNatural('Spark — consultó precio · dudas');
              });
            });
          }
        );
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
                            var emp = EMPATHY[s.value];
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

      // ─── ROUTER DE ENTRADA ────────────────────────────────────────────────
      function route(text){
        text = (text || '').trim();
        if(!text) return;
        w.addUser(text);
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
        if(state === 'sector_q'){ onSectorAnswer(text); return; }

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
