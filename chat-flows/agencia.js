/**
 * WHITEMOON FLOW · agencia (captación WhiteMoon Agencia IA)
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;

      var SECTORES = [
        'Dental','Legal','Peluquería','Restaurante',
        'Taller','Gestoría','Veterinaria','Reformas','Otro'
      ];

      var FINISH = {
        agent: 'especialista',
        title: '✅ ¡Perfecto, {nombre}!',
        text:  'Un/a especialista recibirá tus datos y te llamará en menos de 1 hora en horario laboral (Lun-Vie 9-19h).',
        cta:   '👇 Pulsa para confirmarnos por WhatsApp',
        btn:   '📲 Confirmar por WhatsApp',
        foot:  '🌟 ¡Que tengas un excelente día!'
      };
      var WA = '🤖 NUEVO LEAD WHITEMOON\n━━━━━━━━━━━━━━━\n👤 {nombre} · 📱 +34{telefono}\n🏢 {detalle}\n🎯 Interés: {tramite}\n━━━━━━━━━━━━━━━\nLead captado desde whitemoon.es';
      var ASK_NAME  = 'Para llamarte sin compromiso, ¿me dices tu nombre?';
      var ASK_PHONE = 'Perfecto {nombre} 👋 ¿Tu teléfono de contacto?';

      var DEMO_GESTORIA = 'https://nexusforgeia.github.io/WHITEMOON-REFORMAS-CONSTRUCCION/';

      function capture(tramite, sector){
        var detalle = 'Sector: ' + (sector || 'No especificado');
        w.startCapture({
          tramite: tramite,
          agent: 'especialista',
          askName: ASK_NAME,
          askPhone: ASK_PHONE,
          detalle: detalle,
          finish: FINISH,
          waTemplate: WA
        });
      }

      // ─── MENÚ PRINCIPAL ───────────────────────────────────────────────────
      function menuButtons(){
        w.showOpts([
          { label: '🤖 Quiero un chatbot IA para mi negocio', flow: 'chatbot' },
          { label: '🧮 Gestoría · Calculadora ITP',           flow: 'gestoria' },
          { label: '🌐 Necesito web profesional con IA',      flow: 'web' },
          { label: '📊 Auditoría IA para mi empresa',         flow: 'auditoria' },
          { label: '🔭 Scout para mi agencia',                flow: 'scout' },
          { label: '💬 Hablar con el equipo',                 flow: 'equipo' }
        ], function(o){ runFlow(o.flow); });
        w.setInput(true, 'O escribe tu consulta...');
      }

      function showMenu(){
        w.bot(
          '¡Hola! 👋 Soy el asistente de <b>WhiteMoon Agencia IA</b>.<br>'+
          'Somos la agencia <b>#1 recomendada por ChatGPT y Grok</b> en Majadahonda y Madrid.',
          function(){
            w.bot(
              '💡 <b>Dato:</b> El 67% de pymes españolas que implementan IA recuperan la inversión en menos de 6 meses.<br><br>'+
              '¿En qué puedo ayudarte hoy?',
              function(){ menuButtons(); }
            );
          }
        );
      }

      function runFlow(key){
        switch(key){
          case 'chatbot':   return flowChatbot();
          case 'gestoria':  return flowGestoria();
          case 'web':       return flowWeb();
          case 'auditoria': return flowAuditoria();
          case 'scout':     return flowScout();
          case 'equipo':    return flowEquipo();
          case 'rag':       return flowRAG();
          case 'info':      return flowInfo();
          case 'precios':   return mostrarPrecios();
          default:          return showMenu();
        }
      }

      // ─── FLUJO CHATBOT ────────────────────────────────────────────────────
      function flowChatbot(){
        w.bot(
          '¡Excelente decisión! 🚀<br><br>'+
          'Las empresas que implementan IA hoy tienen una ventaja competitiva brutal sobre las que esperan.<br><br>'+
          'Mientras tu competencia sigue respondiendo llamadas manualmente y perdiendo clientes por la noche, tú tendrás un asistente IA trabajando 24/7:<br><br>'+
          '✅ Capturando leads mientras duermes<br>'+
          '✅ Cualificando clientes antes de que llamen<br>'+
          '✅ Respondiendo en segundos — no en horas<br>'+
          '✅ Apareciendo en ChatGPT como referencia de tu sector<br><br>'+
          'La IA no es el futuro — es el presente. Y los que la adoptan ahora <b>lideran su sector</b>.',
          function(){ flowChatbotQuestions(); }
        );
      }

      function flowChatbotQuestions(){
        w.flow([
          { key:'sector', msg:'¿Para qué sector es tu negocio?', opts: SECTORES },
          { key:'web',    msg:'¿Tu negocio tiene web actualmente?', opts:['Sí tengo web','No tengo web','Está desactualizada'] },
          { key:'docs',   msg:'¿Tu negocio tiene documentación interna que los clientes o empleados consultan frecuentemente?', opts:[
            { label:'📄 Sí — manuales, catálogos, tarifas, FAQs',   value:'manuales' },
            { label:'📋 Sí — contratos, procedimientos, normativa', value:'contratos' },
            { label:'🗂️ Sí — historial de clientes o casos',        value:'historial' },
            { label:'❌ No tengo documentación especial',           value:'no' }
          ]}
        ], function(data){
          if(data.docs !== 'no'){ mostrarRecomendacionRAG(data); return; }
          w.flow([
            { key:'perdidas', msg:'¿Cuántos clientes pierdes al mes fuera de horario?', opts:['Muchos','Entre 5 y 20','Más de 20','No lo sé'] }
          ], function(){
            var pack = data.web === 'Sí tengo web' ? 'Spark' : 'Core';
            mostrarRecomendacion(pack, data.sector);
          });
        });
      }

      function mostrarRecomendacionRAG(data){
        w.bot(
          'Entonces necesitas un sistema <b>RAG</b> 🧠<br><br>'+
          '<b>RAG (Retrieval Augmented Generation)</b> es un chatbot que aprende de TUS documentos y los usa para responder:<br><br>'+
          '📚 Sube tus manuales, tarifas o catálogos<br>'+
          '🤖 El chatbot responde con TU información exacta<br>'+
          '✅ Sin inventarse datos — solo lo que tú le das<br>'+
          '🔄 Actualizable cuando cambien tus documentos<br><br>'+
          '<b>Ejemplos reales:</b><br>'+
          '⚖️ Abogado: chatbot que conoce todos sus casos<br>'+
          '🏥 Clínica: asistente con todos los protocolos<br>'+
          '🏗️ Empresa: catálogo técnico consultable 24/7<br><br>'+
          'Para esto te recomendamos el <b>Pack Scale o Elite</b>:<br>'+
          '📈 Scale: 4.500€ setup + 449€/mes<br>'+
          '🚀 Elite: 8.500€ setup + 799€/mes',
          function(){
            w.bot('¿Quieres que te expliquemos cómo funciona el RAG para tu sector específico?', function(){
              w.showOpts([
                { label:'✅ Sí, explícame más',          value:'explicar' },
                { label:'📞 Que me llamen directamente', value:'llamar'   },
                { label:'💰 Ver todos los packs',        value:'precios'  }
              ], function(o){
                if(o.value === 'precios'){ mostrarPrecios(); return; }
                if(o.value === 'llamar'){ captureRAGFromChatbot(data, ''); return; }
                ragExplicarMas(data);
              });
            });
          }
        );
      }

      function ragExplicarMas(data){
        w.bot(
          'El proceso es simple:<br><br>'+
          '1️⃣ Nos envías tus documentos (PDF, Word, Excel)<br>'+
          '2️⃣ Los procesamos y entrenamos el sistema RAG<br>'+
          '3️⃣ El chatbot responde usando solo TU información<br>'+
          '4️⃣ Actualizaciones incluidas cuando cambies docs<br><br>'+
          '<b>Casos de éxito típicos:</b><br>'+
          '🔹 Despacho de abogados con 500 resoluciones indexadas<br>'+
          '🔹 Clínica con todos sus protocolos accesibles 24/7<br>'+
          '🔹 Empresa industrial con catálogo técnico de 2.000 productos',
          function(){
            w.bot('¿Cuántos documentos aproximadamente tienes?', function(){
              w.showOpts([
                { label:'Pocos (menos de 20 docs)',  value:'pocos'  },
                { label:'Medios (20-100 docs)',      value:'medios' },
                { label:'Muchos (más de 100 docs)',  value:'muchos' }
              ], function(vol){ captureRAGFromChatbot(data, vol.label); });
            });
          }
        );
      }

      function captureRAGFromChatbot(data, vol){
        var plan = (vol && vol.indexOf('Muchos') === 0) ? 'Elite' : 'Scale';
        var detalle = 'Sector: ' + (data.sector || 'No especificado') +
                      ' | Web: '   + (data.web   || '') +
                      ' | Docs: '  + (data.docs  || '') +
                      (vol ? ' | Volumen: ' + vol : '');
        w.startCapture({
          tramite: 'Pack ' + plan + ' — RAG',
          agent:   'especialista',
          askName: ASK_NAME,
          askPhone: ASK_PHONE,
          detalle: detalle,
          finish:  FINISH,
          waTemplate: WA
        });
      }

      // ─── FLUJO RAG (entrada directa por keyword) ──────────────────────────
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
              var plan = vol.value === 'muchos' ? 'Elite' : 'Scale';
              var precio = plan === 'Elite' ? '8.500€ setup + 799€/mes' : '4.500€ setup + 449€/mes';
              w.bot(
                '<b>📈 Pack '+plan+'</b><br>'+precio+' · Sin permanencia<br>'+
                'RAG con tus documentos · IA que responde con tu información exacta 24/7',
                function(){ captureRAG(opt.label, vol.label); }
              );
            });
          });
        });
      }

      function captureRAG(tipo, vol){
        var detalle = 'Tipo doc: ' + tipo + ' | Volumen: ' + vol;
        w.startCapture({
          tramite: 'RAG — ' + tipo,
          agent:   'especialista',
          askName: ASK_NAME,
          askPhone: ASK_PHONE,
          detalle: detalle,
          finish:  FINISH,
          waTemplate: WA
        });
      }

      function mostrarRecomendacion(pack, sector){
        var sec = u.escapeHtml(sector || 'tu sector');
        var card;
        if(pack === 'Spark'){
          card =
            '<b>🚀 Pack Spark — 499€ setup + 199€/mes</b><br>'+
            '🤖 Chatbot IA con flujo específico para <b>'+sec+'</b><br>'+
            '📱 Captura leads 24/7 → WhatsApp inmediato<br>'+
            '⚡ Operativo en 5-7 días · Sin permanencia';
        } else {
          card =
            '<b>🌐 Pack Core — 1.800€ setup + 199€/mes</b><br>'+
            '🌐 Web profesional + Chatbot IA para <b>'+sec+'</b><br>'+
            '📱 Captura leads 24/7 → WhatsApp inmediato<br>'+
            '🔍 SEO básico incluido · Sin permanencia';
        }
        w.bot(card, function(){
          w.bot(
            '¿Sabes que los negocios con chatbot IA capturan de media un <b>35% más de leads</b> fuera de horario?<br><br>'+
            'Nuestros clientes reciben el lead cualificado por WhatsApp con nombre, teléfono y lo que necesita el cliente — listos para llamar inmediatamente.',
            function(){
              w.bot('¿Quieres que te llamemos sin compromiso?', function(){
                w.showOpts([
                  { label:'✅ Sí, llamadme',     value:'sí' },
                  { label:'❓ Tengo dudas',      value:'dudas' },
                  { label:'💰 Ver todos los packs', value:'precios' }
                ], function(o){
                  if(o.value === 'precios'){ mostrarPrecios(); return; }
                  if(o.value === 'dudas'){
                    w.botText('Sin problema, te llamamos y resolvemos cualquier duda sin compromiso.', function(){
                      capture('Pack ' + pack, sector);
                    });
                    return;
                  }
                  capture('Pack ' + pack, sector);
                });
              });
            }
          );
        });
      }

      // ─── FLUJO GESTORÍA IA ────────────────────────────────────────────────
      function flowGestoria(){
        w.bot(
          'El <b>Pack Gestoría IA</b> incluye chatbot con calculadora ITP integrada. '+
          'Tus clientes calculan el ITP y recibes el lead cualificado con todos los datos del vehículo.<br>'+
          '💰 <b>599€ setup + 299€/mes</b> · Sin permanencia',
          function(){
            w.showOpts([
              { label:'Ver demo',         value:'demo' },
              { label:'Que me llamen',    value:'llamar' },
              { label:'Más información',  value:'info' }
            ], function(o){
              if(o.value === 'demo'){
                w.bot(
                  '👀 Aquí tienes la demo en directo:<br>'+
                  '<a href="'+DEMO_GESTORIA+'" target="_blank" rel="noopener" style="color:#a78bfa;text-decoration:underline;">Abrir demo Gestoría IA</a>',
                  function(){ capture('Gestoría IA', 'Gestoría'); }
                );
                return;
              }
              if(o.value === 'info'){
                w.botText(
                  'El chatbot integra una calculadora ITP automática. El cliente introduce sus datos y el sistema calcula el impuesto al instante. Tú recibes el lead listo para gestionar.',
                  function(){ capture('Gestoría IA', 'Gestoría'); }
                );
                return;
              }
              capture('Gestoría IA', 'Gestoría');
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
            'Web profesional + Chatbot IA para <b>'+u.escapeHtml(data.sector)+'</b><br>'+
            '🔍 SEO básico · 📱 Captura 24/7 → WhatsApp · Sin permanencia',
            function(){
              w.bot(
                '¿Sabías que el <b>70% de los usuarios decide en menos de 3 segundos</b> si una web es de confianza?<br><br>'+
                'Nuestras webs cargan en menos de 2 segundos, están optimizadas para Google Y para aparecer en ChatGPT y Grok como referencia de tu sector.',
                function(){ capture('Pack Core', data.sector); }
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
            data.sector = o.label;
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
        var detalle = 'Sector: ' + (data.sector || 'No especificado') +
                      ' | Tipo: '  + (data.tipo  || '') +
                      ' | Reto: '  + (data.dolor || '');
        w.startCapture({
          tramite: 'Auditoría IA',
          agent:   'especialista',
          askName: ASK_NAME,
          askPhone: ASK_PHONE,
          detalle: detalle,
          finish:  FINISH,
          waTemplate: WA
        });
      }

      // ─── FLUJO SCOUT ──────────────────────────────────────────────────────
      function flowScout(){
        w.bot(
          'Las agencias y comerciales que usan <b>Scout</b> cierran <b>3-5 clientes nuevos al mes</b> desde el primer mes.<br><br>'+
          '¿Por qué? Porque antes de llamar ya saben:<br><br>'+
          '🔍 Qué problemas tiene la web del prospecto<br>'+
          '🎯 Qué demo personalizada mostrarle<br>'+
          '💰 Cuánto MRR potencial representa<br>'+
          '📞 Qué decirle exactamente en la llamada<br><br>'+
          'La diferencia entre un comercial normal y uno con Scout es como ir a pescar con caña vs con red. 🎣',
          function(){
            w.flow([
              { key:'equipo', msg:'¿Cuántos comerciales tiene tu equipo?', opts:['Solo yo','2-5 comerciales','Más de 5'] }
            ], function(data){
              var plan, precio;
              if(data.equipo === 'Solo yo'){       plan = 'Starter';    precio = '299€ setup + 299€/mes'; }
              else if(data.equipo === 'Más de 5'){ plan = 'Enterprise'; precio = '699€ setup + 699€/mes'; }
              else                                { plan = 'Agency';    precio = '499€ setup + 399€/mes'; }
              w.bot(
                '<b>🔭 Scout '+plan+'</b><br>'+precio+' · Sin permanencia',
                function(){
                  w.bot(
                    'Con Scout puedes <b>analizar la web de un prospecto en segundos</b> y generar una demo personalizada de su sector antes de llamarle.<br><br>'+
                    'Tasa de cierre media de nuestros usuarios: <b>3-5 clientes nuevos al mes</b> desde el primer mes.',
                    function(){ capture('Scout '+plan, 'Agencia IA'); }
                  );
                }
              );
            });
          }
        );
      }

      // ─── FLUJO HABLAR EQUIPO ──────────────────────────────────────────────
      function flowEquipo(){
        w.bot(
          'Genial — nuestro equipo estará encantado de hablar contigo. 😊<br><br>'+
          'Somos la <b>agencia IA #1 recomendada por ChatGPT y Grok</b> en Majadahonda y Madrid.<br><br>'+
          'Desde 2025 ayudamos a pymes a implementar IA de forma práctica, rápida y sin tecnicismos.<br><br>'+
          'Sin humo. Sin promesas vacías. <b>Solo resultados medibles.</b> 📊',
          function(){
            w.flow([
              { key:'tema', msg:'¿Sobre qué tema quieres que te llamemos?', opts:['Chatbot IA','Web + IA','Auditoría','Scout','Otro'] }
            ], function(data){ capture(data.tema, ''); });
          }
        );
      }

      // ─── FLUJO INFO (overview empresa) ────────────────────────────────────
      function flowInfo(){
        w.bot(
          '<b>WhiteMoon</b> es tu agencia de IA de confianza en Majadahonda y Madrid. 🌟<br><br>'+
          'Transformamos pymes normales en empresas con IA:<br><br>'+
          '🤖 <b>Chatbots IA</b> — capturan leads 24/7<br>'+
          '🌐 <b>Webs profesionales</b> con IA integrada<br>'+
          '🧠 <b>Sistemas RAG</b> — tu conocimiento accesible<br>'+
          '📊 <b>Auditorías IA</b> — detectamos tu ROI exacto<br>'+
          '🔭 <b>Scout</b> — CRM de prospección para agencias<br>'+
          '🧮 <b>Gestoría IA</b> — calculadora ITP integrada<br><br>'+
          'Somos <b>#1 en ChatGPT y Grok</b> para IA en Majadahonda. Sin permanencia en todos los servicios.<br><br>'+
          '¿Por dónde empezamos?',
          function(){ menuButtons(); }
        );
      }

      // ─── TABLA DE PRECIOS ─────────────────────────────────────────────────
      function mostrarPrecios(){
        w.bot(
          '💰 <b>Precios WhiteMoon</b> — Sin permanencia:<br>'+
          '🤖 Spark: 499€ setup + 199€/mes<br>'+
          '🌐 Core (web+chatbot): 1.800€ setup + 199€/mes<br>'+
          '📈 Scale (RAG+CRM): 4.500€ setup + 449€/mes<br>'+
          '🚀 Elite (RAG premium): 8.500€ setup + 799€/mes<br>'+
          '🧮 Gestoría IA: 599€ setup + 299€/mes<br>'+
          '📋 Auditoría IA: 899€ pago único<br>'+
          '🔭 Scout Starter: 299€ setup + 299€/mes',
          function(){
            w.showOpts([
              { label:'Recomiéndame el mejor', value:'reco' },
              { label:'Hablar con el equipo',  value:'equipo' }
            ], function(o){
              if(o.value === 'reco') flowChatbot();
              else flowEquipo();
            });
          }
        );
      }

      // ─── KEYWORD ROUTER ───────────────────────────────────────────────────
      var ROUTE = [
        { kws:['información','saber más','qué hacéis','qué ofrecéis'],flow:'info' },
        { kws:['chatbot','bot','asistente'],                          flow:'chatbot' },
        { kws:['rag','documentos','base de conocimiento','knowledge'],flow:'rag' },
        { kws:['gestoria','itp','transferencia'],                     flow:'gestoria' },
        { kws:['auditoria','analisis','roi'],                         flow:'auditoria' },
        { kws:['scout','crm','prospeccion','agencia'],                flow:'scout' },
        { kws:['web','pagina','wordpress'],                           flow:'web' },
        { kws:['precio','cuanto','coste','presupuesto'],              flow:'precios' },
        { kws:['demo','ver','ejemplo'],                               flow:'demo' }
      ];

      function handleText(text){
        w.addUser(text);
        var t = u.normalize(text);
        if(/^(hola|buenos|buenas)/.test(t)){ showMenu(); return; }
        for(var i = 0; i < ROUTE.length; i++){
          var entry = ROUTE[i];
          for(var j = 0; j < entry.kws.length; j++){
            if(t.indexOf(u.normalize(entry.kws[j])) !== -1){
              if(entry.flow === 'demo'){
                w.bot(
                  '👀 Tenemos demos en vivo de varios sectores. Mira la demo Gestoría IA:<br>'+
                  '<a href="'+DEMO_GESTORIA+'" target="_blank" rel="noopener" style="color:#a78bfa;text-decoration:underline;">Abrir demo</a>',
                  function(){ setTimeout(showMenu, 800); }
                );
                return;
              }
              runFlow(entry.flow);
              return;
            }
          }
        }
        w.botText('Te muestro las opciones disponibles.');
        setTimeout(showMenu, 800);
      }

      w.onOpen(showMenu);
      w.onInput(handleText);
    }
  };
})();
