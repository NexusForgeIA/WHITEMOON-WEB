/* WhiteMoon — WebMCP (API imperativa)
 * -------------------------------------------------------------------------
 * Expone herramientas a los agentes que naveguen la web (Chrome/Gemini y
 * cualquier cliente que implemente WebMCP).
 *
 * Progressive enhancement ESTRICTO: todo cuelga de un feature-detect. Si el
 * navegador no trae document.modelContext, este fichero no hace absolutamente
 * nada — ni una petición, ni un timer, ni un listener. Coste para un usuario
 * normal: parsear ~4 KB y salir por el `return`.
 *
 * API verificada en developer.chrome.com/docs/ai/webmcp (agosto 2026):
 *   · El objeto es document.modelContext. navigator.modelContext quedó
 *     DEPRECADO en Chrome 150.
 *   · document.modelContext.registerTool({name, description, inputSchema,
 *     execute}, {signal}) — el segundo argumento es opcional.
 *   · execute() devuelve una CADENA de texto, que es lo que lee el agente.
 *   · Ambas APIs están gateadas por la Permissions Policy `tools`, que por
 *     defecto vale `self`. Mismo origen funciona sin cabecera; solo haría
 *     falta allow="tools" para exponerlo desde un iframe de otro origen.
 *
 * El lead va por el MISMO camino que los formularios del sitio: insert REST
 * en leads_web + Edge Function de aviso. No hay endpoint nuevo. Se marca con
 * origen='webmcp-agent' para poder separarlo en Supabase.
 */
(function () {
  'use strict';

  // ── Feature detection: sin esto, no se ejecuta nada más ────────────────
  if (!document.modelContext || typeof document.modelContext.registerTool !== 'function') return;

  var SUPABASE_URL = 'https://mlaqtniujnvfxcvcourm.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYXF0bml1am52ZnhjdmNvdXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzUyMzIsImV4cCI6MjA5MzQxMTIzMn0.Neh7VUS8ADsxf0DPab0JoJyGXOAXnLIaXzXbKzj2BGs';
  var NOTIFY_FN = SUPABASE_URL + '/functions/v1/auditoria-geo-notify';
  var ORIGEN = 'webmcp-agent';

  // ── Herramienta 1 · captar el contacto ────────────────────────────────
  // Mismo insert + mismo aviso que /mini-core/ y /mas-info/.
  function guardarLead(nombre, telefono, interes, sector) {
    var mensaje = 'Lead solicitado por un agente IA vía WebMCP'
      + (interes ? ' — interés: ' + interes : '');
    var payload = {
      nombre: nombre,
      telefono: telefono,
      sector: sector || 'sin especificar',
      interes: interes || 'contacto general',
      mensaje: mensaje,
      origen: ORIGEN,
      fecha: new Date().toISOString(),
      atendido: false
    };

    return fetch(SUPABASE_URL + '/rest/v1/leads_web', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error('Supabase HTTP ' + r.status);
      // Aviso al móvil, fire-and-forget: si falla, el lead ya está guardado.
      try {
        fetch(NOTIFY_FN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: nombre, telefono: telefono,
            sector: payload.sector, origen: ORIGEN, mensaje: mensaje
          })
        }).catch(function (e) { console.warn('[webmcp] aviso falló', e); });
      } catch (e) { console.warn('[webmcp] aviso error', e); }

      if (typeof window.wmTrack === 'function') {
        window.wmTrack('lead_captured', { source: ORIGEN });
      }
      return true;
    });
  }

  document.modelContext.registerTool({
    name: 'solicitar_contacto',
    description: 'Deja los datos de contacto de una persona interesada en los '
      + 'servicios de IA de WhiteMoon (agentes de voz y chat para la web, '
      + 'automatización, webs con IA). El equipo comercial le llama después. '
      + 'Pide siempre el consentimiento de la persona antes de usar esta herramienta.',
    inputSchema: {
      type: 'object',
      properties: {
        nombre: {
          type: 'string',
          description: 'Nombre de la persona de contacto.'
        },
        telefono: {
          type: 'string',
          description: 'Teléfono al que llamarle. Móvil español de 9 cifras, con o sin prefijo +34.'
        },
        interes: {
          type: 'string',
          description: 'Qué producto o servicio le interesa, si lo ha dicho. '
            + 'Por ejemplo: agente de voz en la web, chatbot, web nueva, '
            + 'agente entrenado con documentos propios, o publicidad.'
        },
        sector: {
          type: 'string',
          description: 'Sector del negocio, si lo ha dicho. Por ejemplo: '
            + 'clínica dental, taller, gestoría, restaurante, inmobiliaria.'
        }
      },
      required: ['nombre', 'telefono']
    },
    execute: async function (args) {
      var nombre = String((args && args.nombre) || '').trim();
      var telefono = String((args && args.telefono) || '').trim();
      if (!nombre || !telefono) {
        return 'No se ha enviado nada: hacen falta el nombre y un teléfono de contacto.';
      }
      try {
        await guardarLead(
          nombre,
          telefono,
          String((args && args.interes) || '').trim(),
          String((args && args.sector) || '').trim()
        );
        return 'Contacto registrado a nombre de ' + nombre + '. El Departamento '
          + 'Comercial de WhiteMoon le llamará al ' + telefono + ' en menos de '
          + '24 horas laborables.';
      } catch (err) {
        console.warn('[webmcp] solicitar_contacto falló', err);
        return 'No se ha podido registrar el contacto en este momento. '
          + 'Puede escribir a comercial@whitemoon.es o por WhatsApp al 643 199 580.';
      }
    }
  });

  // ── Herramienta 2 · consultar el precio de entrada ────────────────────
  // Solo dato verificable: el punto de entrada. La tarifa completa vive en
  // /precios/ y no se duplica aquí para que no envejezca.
  document.modelContext.registerTool({
    name: 'consultar_planes',
    description: 'Devuelve el precio de entrada de los servicios de IA de '
      + 'WhiteMoon y el enlace a la tarifa completa y actualizada.',
    inputSchema: { type: 'object', properties: {} },
    execute: async function () {
      return 'El precio de entrada de WhiteMoon son 499 € de puesta en marcha '
        + 'más 99 € al mes con el pack Spark: un agente de IA conversacional '
        + 'embebido en la web que el cliente ya tiene. A partir de ahí sube '
        + 'según el agente hable por voz, incluya una web nueva o se entrene '
        + 'con los documentos propios del negocio. Ningún pack tiene '
        + 'permanencia y la puesta en marcha es de 5 a 7 días laborables. '
        + 'La tarifa completa y actualizada de los diez productos está en '
        + 'https://whitemoon.es/precios/';
    }
  });
})();
