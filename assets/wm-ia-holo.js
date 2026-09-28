/* /inteligencia-artificial/ · capa holográfica. Pone .wmh-on en cada bloque
   mientras está en pantalla: las animaciones de la capa sólo corren con esa
   clase. Sin IntersectionObserver o con movimiento reducido no hace nada y
   todo queda quieto. */
(function(){var els=document.querySelectorAll('.ia-vs,.ia-sector,.ia-steps,.ia-final,.ia-paths,.ia-stage,.ia-hero,.ia-pains,.ia-caps');
if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('wmh-on',e.isIntersecting)})},{rootMargin:'80px'});
els.forEach(function(el){io.observe(el)});})();
