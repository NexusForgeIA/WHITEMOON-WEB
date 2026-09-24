/* Motor de ITP de vehículos · FUENTE ÚNICA
 *
 * Lo usan /calculadora-itp/ (canónica), /calculadora-transferencia-vehiculo/,
 * /calculadora-cambio-titularidad-vehiculo/ y /calculadora-gastos-compra-coche-segunda-mano/.
 * Tablas y reglas copiadas literalmente de /calculadora-itp/: si cambia un tipo, una
 * cuota fija o la depreciación, se cambia AQUÍ y lo heredan las cuatro.
 *
 * Base imponible = Precio Anexo I × % depreciación (Anexo IV) [× 70% uso especial];
 * si el precio del contrato es mayor, la base es el precio del contrato.
 * Fuente: Orden HAC/1501/2025 (precios medios de venta 2026).
 */
(function () {
'use strict';

const tablaTurismos = [
  [0, 1.00, "Hasta 1 año"], [1, 0.84, "Más de 1 año, hasta 2"],
  [2, 0.67, "Más de 2 años, hasta 3"], [3, 0.56, "Más de 3 años, hasta 4"],
  [4, 0.47, "Más de 4 años, hasta 5"], [5, 0.39, "Más de 5 años, hasta 6"],
  [6, 0.34, "Más de 6 años, hasta 7"], [7, 0.28, "Más de 7 años, hasta 8"],
  [8, 0.24, "Más de 8 años, hasta 9"], [9, 0.19, "Más de 9 años, hasta 10"],
  [10, 0.17, "Más de 10 años, hasta 11"], [11, 0.13, "Más de 11 años, hasta 12"],
  [12, 0.10, "Más de 12 años"]
];

const ccaaData = {
  "Andalucía":          { tg: 0.04, t15: 0.08, t0: 0.01, teco: -1, exA: 0, exV: 0, cA: 0, cf: null },
  "Aragón":             { tg: 0.04, t15: -1, t0: -1, teco: -1, exA: 0, exV: 0, cA: 10, cf: [[1000,0],[1500,20],[2000,30],[Infinity,30]] },
  "Asturias":           { tg: 0.04, t15: 0.08, t0: -1, teco: -1, exA: 0, exV: 0, cA: 0, cf: null },
  "Baleares":           { tg: 0.04, t15: 0.08, t0: 0, teco: 0.02, exA: 0, exV: 0, cA: 0, cf: null },
  "Canarias (IGIC)":    { tg: 0.055, t15: -1, t0: -1, teco: -1, exA: 0, exV: 0, cA: 10, cf: [[1000,40],[1500,70],[2000,115],[Infinity,115]] },
  "Cantabria":          { tg: 0.06, t15: -1, t0: -1, teco: -1, exA: 0, exV: 0, cA: 10, cf: [[999,45],[1499,60],[1999,90],[Infinity,90]] },
  "Castilla-La Mancha": { tg: 0.06, t15: -1, t0: -1, teco: -1, exA: 0, exV: 0, cA: 0, cf: null },
  "Castilla y León":    { tg: 0.05, t15: 0.08, t0: -1, teco: -1, exA: 0, exV: 0, cA: 0, cf: null },
  "Cataluña":           { tg: 0.05, t15: -1, t0: 0, teco: -1, exA: 10, exV: 40000, cA: 0, cf: null },
  "Ceuta":              { tg: 0.04, t15: -1, t0: -1, teco: -1, exA: 0, exV: 0, cA: 0, cf: null },
  "Comunidad de Madrid":{ tg: 0.04, t15: -1, t0: -1, teco: -1, exA: 0, exV: 0, cA: 0, cf: null },
  "Comunidad Valenciana":{ tg: 0.06, t15: -1, t0: -1, teco: -1, exA: 0, exV: 0, cA: 0, cf: null },
  "Extremadura":        { tg: 0.06, t15: -1, t0: -1, teco: -1, exA: 0, exV: 0, cA: 0, cf: null },
  "Galicia":            { tg: 0.03, t15: -1, t0: 0, teco: -1, exA: 0, exV: 0, cA: 14, cf: [[1199,22],[1599,38],[Infinity,38],[Infinity,38]] },
  "La Rioja":           { tg: 0.04, t15: -1, t0: -1, teco: -1, exA: 0, exV: 0, cA: 0, cf: null },
  "Melilla":            { tg: 0.04, t15: -1, t0: -1, teco: -1, exA: 0, exV: 0, cA: 0, cf: null },
  "Murcia":             { tg: 0.04, t15: -1, t0: -1, teco: -1, exA: 0, exV: 0, cA: 12, cf: [[1000,0],[1500,30],[2000,50],[Infinity,75]] },
  "Navarra":            { tg: 0.04, t15: -1, t0: -1, teco: -1, exA: 10, exV: 40000, cA: 0, cf: null },
  "País Vasco":         { tg: 0.04, t15: -1, t0: -1, teco: -1, exA: 0, exV: 0, cA: 0, cf: null }
};

const valencianaCuotas = {
  motos: { ">12": [[250, 10], [550, 20], [750, 35], [Infinity, 55]],
           "5-12": [[250, 30], [550, 60], [750, 90], [Infinity, 140]] },
  coches: { ">12": [[1500, 40], [2000, 60], [Infinity, 140]],
            "5-12": [[1500, 120], [2000, 180], [Infinity, 280]] }
};

function cuotaFijaValenciana(anos, cilindrada, valor, esMoto) {
  if (valor >= 20000) return null;
  if (anos == null || cilindrada == null || !cilindrada) return null;
  let tramoAnt = null;
  if (anos > 12) tramoAnt = '>12';
  else if (anos > 5 && anos <= 12) tramoAnt = '5-12';
  else return null;
  const tabla = esMoto ? valencianaCuotas.motos[tramoAnt] : valencianaCuotas.coches[tramoAnt];
  for (const [maxCc, cuota] of tabla) {
    if (cilindrada <= maxCc) return { cuota, tramoAnt, esMoto };
  }
  return null;
}

function cuotaFijaEstandar(ccaaParam, anos, cilindrada) {
  if (!ccaaParam.cf || !cilindrada) return null;
  if (ccaaParam.cA === 0 || anos === null || anos < ccaaParam.cA) return null;
  for (const [maxCc, cuota] of ccaaParam.cf) {
    if (cilindrada <= maxCc) return cuota;
  }
  return null;
}

function calcularTipoNormal(ccaaParam, etiqueta, cvf, base) {
  let tipo = ccaaParam.tg;
  if (etiqueta === '0' && ccaaParam.t0 >= 0) tipo = ccaaParam.t0;
  else if (etiqueta === 'ECO' && ccaaParam.teco >= 0) tipo = ccaaParam.teco;
  else if (cvf > 15 && ccaaParam.t15 >= 0) tipo = ccaaParam.t15;
  return { tipo, itp: base * tipo };
}

function pctTurismo(anos) {
  if (anos === null || anos === undefined || isNaN(anos) || anos < 0) return null;
  return tablaTurismos.find(r => r[0] === Math.min(anos, 12)) || null;
}

/* Mismo cálculo que calcular() de /calculadora-itp/ en modo BOE para coches y motos.
 * o = { ccaa, precioAnexo, anos, cilindrada, cvf, etiqueta, precioContrato, usoEspecial, moto }
 * ccaa = nombre exacto de ccaaData ("Comunidad de Madrid", "Galicia"...). */
function turismo(o) {
  const ccaaParam = ccaaData[o.ccaa];
  const pct = pctTurismo(o.anos);
  if (!o.precioAnexo || !pct || !ccaaParam) return null;
  const coefUso = o.usoEspecial ? 0.7 : 1;
  const valorFiscal = o.precioAnexo * pct[1] * coefUso;
  let base = valorFiscal, usaContrato = false;
  if (o.precioContrato > 0 && o.precioContrato > valorFiscal) { base = o.precioContrato; usaContrato = true; }
  const r = { pct: pct[1], tramo: pct[2], valorFiscal, base, usaContrato, itp: 0, tipo: null, modo: 'tipo', ccaaParam };
  const cil = o.cilindrada || 0;
  if (ccaaParam.exA > 0 && o.anos >= ccaaParam.exA && o.precioAnexo < ccaaParam.exV) {
    r.modo = 'exento';
    return r;
  }
  if (o.ccaa === 'Comunidad Valenciana') {
    const cf = cuotaFijaValenciana(o.anos, cil, base, !!o.moto);
    if (cf) { r.modo = 'cuota-fija'; r.itp = cf.cuota; return r; }
  } else if (ccaaParam.cA > 0 && o.anos >= ccaaParam.cA) {
    const cuota = cuotaFijaEstandar(ccaaParam, o.anos, cil);
    if (cuota !== null) { r.modo = 'cuota-fija'; r.itp = cuota; return r; }
  }
  const t = calcularTipoNormal(ccaaParam, o.etiqueta, o.cvf || 0, base);
  r.itp = t.itp; r.tipo = t.tipo;
  return r;
}


function fmtEur(n) {
  if (typeof n !== 'number' || isNaN(n)) return '— €';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function fmtPct(n) {
  if (typeof n !== 'number' || isNaN(n)) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 1 }).format(n);
}
/* Explicación del ITP para las calculadoras derivadas (texto de resultado). */
function describe(r, o) {
  if (!r) return 'Introduce el precio del Anexo I, la antigüedad y la comunidad autónoma para calcular el ITP.';
  let t = 'Valor fiscal: precio Anexo I ' + fmtEur(o.precioAnexo) + ' × ' + fmtPct(r.pct) + ' (' + r.tramo.toLowerCase() + ')' +
          (o.usoEspecial ? ' × 70% (uso especial)' : '') + ' = ' + fmtEur(r.valorFiscal) + '. ';
  if (r.modo === 'exento') {
    return t + 'ITP: exento en ' + o.ccaa + ' (antigüedad de ' + r.ccaaParam.exA + ' años o más y precio Anexo I inferior a ' + fmtEur(r.ccaaParam.exV) + ').';
  }
  if (r.modo === 'cuota-fija') {
    return t + 'ITP: cuota fija de ' + fmtEur(r.itp) + ' en ' + o.ccaa + ' (' + o.cilindrada + ' cc).';
  }
  if (r.usaContrato) t += 'Base imponible: el precio del contrato (' + fmtEur(r.base) + '), porque es mayor que el valor fiscal. ';
  return t + 'ITP ' + o.ccaa + ' ' + fmtPct(r.tipo) + ' × ' + fmtEur(r.base) + ' = ' + fmtEur(r.itp) + '.';
}

window.WM_ITP = {
  tablaTurismos, ccaaData, valencianaCuotas,
  cuotaFijaValenciana, cuotaFijaEstandar, calcularTipoNormal,
  pctTurismo, turismo,
  fmtEur, fmtPct, describe,
  TASA_DGT: 55.70
};
})();
