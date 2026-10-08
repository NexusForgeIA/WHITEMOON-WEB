/* /agencia-ia-madrid/ · capa holográfica. Pone .wmm-on en cada bloque
   mientras está en pantalla: las animaciones de la capa solo corren con esa
   clase. Sin IntersectionObserver o con movimiento reducido no hace nada y
   todo queda quieto. */
(function(){var els=document.querySelectorAll('.wmm-hero,.wmm-cards,.wmm-mock,.wmm-steps,.wmm-entrada,.wmm-cta');
if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('wmm-on',e.isIntersecting)})},{rootMargin:'80px'});
els.forEach(function(el){io.observe(el)});})();
