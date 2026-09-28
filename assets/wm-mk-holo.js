/* /marketing/: activa las animaciones holográficas solo mientras cada bloque está en pantalla. */
(function(){
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var els=document.querySelectorAll('.hero,#problema,.pack,.steps,.mech__cols,.band,.final');
  var io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('mkh-on',e.isIntersecting)})},{rootMargin:'80px'});
  els.forEach(function(el){io.observe(el)});
})();
