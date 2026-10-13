/* /calculadora-donaciones/: activa las animaciones holográficas solo mientras cada bloque está en pantalla. */
(function(){
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var els=document.querySelectorAll('.dnh > section');
  var io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('dnh-on',e.isIntersecting)})},{rootMargin:'80px'});
  els.forEach(function(el){io.observe(el)});
})();
