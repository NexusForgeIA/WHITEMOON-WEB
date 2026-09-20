/* Form de captura de lead para las 5 calculadoras gratuitas.
 * Patrón:
 *   <form onsubmit="return wmCalcLeadSubmit(event,this,'calculadora-X','Nómina')">
 *     <input name="nombre"> <input name="telefono"> <button>...</button>
 *     <div class="calc-lead-ok"></div>
 *   </form>
 *
 * POST a Supabase REST /leads_web con payload completo según regla CLAUDE.md:
 *   nombre, telefono, sector, interes, mensaje, preferencia, origen, fecha
 * Si el envío falla → console.warn, NUNCA se interrumpe el flujo del usuario.
 *
 * GA4: `lead_form_submit` y `lead_captured` se emiten SOLO con respuesta 2xx
 * de Supabase (INSERT confirmado). `lead_captured` exige además un teléfono
 * de 9+ dígitos. Un fallo de red o un 4xx no se miden.
 */
(function(){
  var SUPABASE_URL = 'https://mlaqtniujnvfxcvcourm.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYXF0bml1am52ZnhjdmNvdXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzUyMzIsImV4cCI6MjA5MzQxMTIzMn0.Neh7VUS8ADsxf0DPab0JoJyGXOAXnLIaXzXbKzj2BGs';

  // Un teléfono utilizable tiene al menos 9 dígitos (mismo criterio que
  // wm-agente.js). Solo decide si el lead SE MIDE: el envío a leads_web no
  // cambia, para no perder un lead con un formato raro.
  function digitos(s){ return ((s || '').match(/\d/g) || []).length; }

  function showSuccess(form, nombre){
    var ok = form.querySelector('.calc-lead-ok');
    if(ok){
      ok.textContent = '¡Perfecto, ' + nombre + '! Te llamamos en menos de 24h.';
      ok.style.display = 'block';
    }
    form.querySelectorAll('input, button').forEach(function(el){
      el.style.display = 'none';
    });
  }

  window.wmCalcLeadSubmit = function(event, form, source, label){
    if(event && event.preventDefault) event.preventDefault();
    var nombre = (form.querySelector('input[name="nombre"]') || {}).value;
    var telefono = (form.querySelector('input[name="telefono"]') || {}).value;
    nombre = (nombre || '').trim();
    telefono = (telefono || '').trim();
    if(!nombre || !telefono){ return false; }

    var btn = form.querySelector('button[type="submit"]');
    if(btn){ btn.disabled = true; btn.textContent = 'Enviando...'; }
    form.querySelectorAll('input').forEach(function(i){ i.disabled = true; });

    var payload = {
      nombre: nombre,
      telefono: telefono,
      sector: 'calculadora',
      interes: 'Lead desde calculadora ' + label,
      mensaje: 'Lead desde calculadora ' + label,
      preferencia: 'telefono',
      origen: source,
      fecha: new Date().toISOString()
    };

    fetch(SUPABASE_URL + '/rest/v1/leads_web', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    })
    .then(function(r){
      // El acuse de recibo al usuario NO depende de la medición: se muestra
      // siempre, igual que antes (regla CLAUDE.md: nunca interrumpir el flujo).
      showSuccess(form, nombre);
      // Un 4xx/5xx de Supabase significa que el lead NO entró. Antes se medía
      // igual y los envíos fallidos se contaban como leads buenos.
      if(!r.ok){ console.warn('lead_form HTTP ' + r.status); return; }
      if(typeof window.wmTrack !== 'function') return;
      window.wmTrack('lead_form_submit', { source: source });
      // Lead real: confirmado por el servidor y con un teléfono utilizable.
      if(digitos(telefono) >= 9){
        window.wmTrack('lead_captured', { method: 'calc', wm_source: source });
      }
    })
    .catch(function(err){
      // Regla CLAUDE.md: fallo Supabase → console.warn, NUNCA interrumpe flujo.
      // Sin respuesta del servidor no hay confirmación de INSERT: no se mide.
      console.warn('lead_form error:', err);
      showSuccess(form, nombre);
    });

    return false;
  };

  // -------------------------------------------------------------
  // Captura de email OPCIONAL tras el resultado de la calculadora.
  //   <form class="calc-email-form"
  //         onsubmit="return wmCalcEmailSubmit(event,this,'calculadora-X','Nómina')">
  //     <input type="email" name="email"> <button>Enviar</button>
  //     <div class="calc-email-ok"></div>
  //   </form>
  // No bloquea el resultado. El email se guarda en la columna dedicada
  // `email` de leads_web. Best-effort: si falla -> console.warn.
  // -------------------------------------------------------------
  function showEmailOk(form){
    var ok = form.querySelector('.calc-email-ok');
    if(ok){
      ok.textContent = '✅ Enviado. Te contactaremos si tienes dudas.';
      ok.style.display = 'block';
    }
    form.querySelectorAll('input, button').forEach(function(el){ el.style.display = 'none'; });
  }

  window.wmCalcEmailSubmit = function(event, form, source, label){
    if(event && event.preventDefault) event.preventDefault();
    var email = (form.querySelector('input[name="email"]') || {}).value;
    email = (email || '').trim();
    if(!email){ return false; }

    var btn = form.querySelector('button[type="submit"]');
    if(btn){ btn.disabled = true; btn.textContent = 'Enviando...'; }
    form.querySelectorAll('input').forEach(function(i){ i.disabled = true; });

    if(typeof window.wmTrack === 'function'){
      var slug = source.replace(/^calculadora-/, '').replace(/-/g, '_');
      window.wmTrack('click_calculadora_email_' + slug, { source: source });
    }

    var payload = {
      nombre: 'Solicitud por email',
      telefono: '',
      email: email,
      sector: 'calculadora',
      interes: 'Resultado calculadora ' + label,
      mensaje: 'Solicitó resultado de calculadora ' + label,
      preferencia: 'email',
      origen: source,
      fecha: new Date().toISOString()
    };

    fetch(SUPABASE_URL + '/rest/v1/leads_web', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    })
    .then(function(r){ if(!r.ok){ console.warn('calc_email HTTP ' + r.status); } showEmailOk(form); })
    .catch(function(err){ console.warn('calc_email error:', err); showEmailOk(form); });

    return false;
  };
})();
