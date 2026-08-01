/* ReformasMadrid — chatbot de presupuesto y FAQ de las páginas de zona.
 * El municipio sale de <body data-zona="...">, así el mismo fichero sirve
 * para todas las páginas sin duplicar el flujo en cada una.
 * El lead viaja a la Edge Function reformas-notify; si falla, el usuario no
 * se entera y el flujo no se rompe (regla WhiteMoon).
 */
(function () {
  "use strict";

  var ZONA = document.body.getAttribute("data-zona") || "Madrid";
  var CS = null;

  function el(id) { return document.getElementById(id); }

  function reset() {
    CS = { step: 0, tipo: "", metros: "", nombre: "", telefono: "" };
  }

  window.openChat = function () {
    reset();
    el("cbModal").classList.add("open");
    el("cbMsgs").innerHTML = "";
    el("cbOpts").innerHTML = "";
    el("cbInpWrap").style.display = "none";
    setTimeout(start, 200);
  };

  window.closeChat = function () {
    el("cbModal").classList.remove("open");
  };

  function start() {
    addMsg("bot", "Hola. Soy el asistente de Reformas Madrid en " + ZONA +
                  ". Dime qué necesitas y te preparo un presupuesto orientativo al momento.");
    showOpts(["Reforma de cocina", "Reforma de baño", "Pintura interior", "Reforma integral"]);
  }

  function addMsg(type, text) {
    var c = el("cbMsgs");
    var d = document.createElement("div");
    d.className = "msg msg-" + type;
    d.textContent = text;
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
  }

  function showTyping() {
    var c = el("cbMsgs");
    var d = document.createElement("div");
    d.className = "msg msg-bot msg-typing";
    d.id = "typing";
    d.innerHTML = "<span></span><span></span><span></span>";
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
  }

  function removeTyping() {
    var t = el("typing");
    if (t) t.remove();
  }

  function showOpts(opts) {
    var c = el("cbOpts");
    c.innerHTML = "";
    opts.forEach(function (o) {
      var b = document.createElement("button");
      b.className = "cb-opt";
      b.type = "button";
      b.textContent = o;
      b.onclick = function () { handleOpt(o); };
      c.appendChild(b);
    });
    el("cbInpWrap").style.display = "none";
  }

  function showInput(ph) {
    el("cbOpts").innerHTML = "";
    var w = el("cbInpWrap");
    w.style.display = "flex";
    var i = el("cbInp");
    i.placeholder = ph || "Escribe aquí...";
    i.value = "";
    setTimeout(function () { i.focus(); }, 100);
  }

  window.sendMsg = function () {
    var v = el("cbInp").value.trim();
    if (!v) return;
    addMsg("user", v);
    el("cbInp").value = "";
    showTyping();
    setTimeout(function () { removeTyping(); step(v); }, 600);
  };

  function handleOpt(opt) {
    addMsg("user", opt);
    el("cbOpts").innerHTML = "";
    showTyping();
    setTimeout(function () { removeTyping(); step(opt); }, 600);
  }

  function step(val) {
    if (CS.step === 0) {
      CS.tipo = val; CS.step = 1;
      addMsg("bot", "Perfecto. ¿Cuántos metros cuadrados tiene aproximadamente?");
      showInput("Ej: 10 m²");
    } else if (CS.step === 1) {
      CS.metros = val; CS.step = 2;
      addMsg("bot", "¿Cuál es tu nombre?");
      showInput("Tu nombre...");
    } else if (CS.step === 2) {
      CS.nombre = val; CS.step = 3;
      addMsg("bot", "Y un teléfono para llamarte y cerrar la visita gratuita.");
      showInput("Tu teléfono...");
    } else if (CS.step === 3) {
      CS.telefono = val; CS.step = 4;
      enviar();
    }
  }

  function enviar() {
    addMsg("bot", "Gracias " + CS.nombre + ". Te llamamos en menos de 24 horas para " +
                  "concretar la visita gratuita en " + ZONA + " y darte el precio cerrado.");
    try {
      fetch("https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/reformas-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: CS.nombre,
          telefono: CS.telefono,
          tipo: CS.tipo,
          metros: CS.metros,
          zona: ZONA
        })
      }).catch(function () { /* nunca interrumpe el flujo del usuario */ });
    } catch (e) { /* idem */ }
    if (typeof window.wmTrack === "function") {
      window.wmTrack("lead_form_submit", { source: "reformas-" + ZONA.toLowerCase(), tipo: CS.tipo });
    }
    el("cbOpts").innerHTML = "";
    el("cbInpWrap").style.display = "none";
  }

  window.toggleFaq = function (btn) {
    var item = btn.closest(".faq-item");
    var isOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item.open").forEach(function (i) { i.classList.remove("open"); });
    if (!isOpen) item.classList.add("open");
    btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
  };

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") window.closeChat();
  });
})();
