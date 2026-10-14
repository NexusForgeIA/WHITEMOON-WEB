/* /calculadora-nomina/: activa las animaciones holográficas solo mientras cada bloque está en pantalla.
   Sin IntersectionObserver o con movimiento reducido no hace nada y todo queda quieto. */
(function(){
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var els=document.querySelectorAll('.nmh .hero,.nmh .calc-section,.nmh .info-section');
  var io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('nmh-on',e.isIntersecting)})},{rootMargin:'80px'});
  els.forEach(function(el){io.observe(el)});
})();
