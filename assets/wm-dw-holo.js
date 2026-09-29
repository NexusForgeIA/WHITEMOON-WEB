/* /diseno-web/ · capa holográfica. Pone .dwh-on en cada bloque mientras está
   en pantalla: las animaciones de la capa solo corren con esa clase. Sin
   IntersectionObserver o con movimiento reducido no hace nada y todo queda quieto. */
(function(){var els=document.querySelectorAll('.hero,.strip,#opciones,#incluye,#no-incluye,#ia,#contacto');
if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('dwh-on',e.isIntersecting)})},{rootMargin:'80px'});
els.forEach(function(el){io.observe(el)});})();
