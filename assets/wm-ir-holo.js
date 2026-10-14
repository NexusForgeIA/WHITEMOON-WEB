/* /calculadora-irpf/: activa las animaciones holográficas solo mientras cada bloque está en pantalla.
   Añade además el escáner decorativo a la calculadora. Sin IntersectionObserver o con movimiento
   reducido no hace nada y todo queda quieto. */
(function(){
  var card=document.querySelector('.irh .calc-card');
  if(card&&!card.querySelector('.irh-scan')){var s=document.createElement('span');s.className='irh-scan';s.setAttribute('aria-hidden','true');card.insertBefore(s,card.firstChild)}
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var els=document.querySelectorAll('.irh main > section');
  var io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('irh-on',e.isIntersecting)})},{rootMargin:'80px'});
  els.forEach(function(el){io.observe(el)});
})();
