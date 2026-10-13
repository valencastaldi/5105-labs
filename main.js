/* 5105 Labs - entrada de secciones al hacer scroll.
   Unico script de la pagina. Sin dependencias.

   Regla: nada de trabajo pesado en listeners de scroll. Las entradas usan
   IntersectionObserver. La unica excepcion es la nav que se esconde (abajo):
   listener pasivo que hace como mucho una lectura y un toggle de clase por frame. */

(function () {
  "use strict";

  // Le avisa al inline del <head> que este archivo llego. Si no se setea, aquel
  // saca la clase "js" a los 2 segundos y las secciones quedan visibles.
  window.__cyrListo = true;

  var raiz = document.documentElement;

  if (raiz.classList.contains("intro")) intro(arrancarReveals);
  else arrancarReveals();

  function arrancarReveals() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Sin soporte o con movimiento reducido: se muestra todo de una.
    if (quieto || !("IntersectionObserver" in window)) {
      for (var i = 0; i < items.length; i++) items[i].classList.add("is-in");
      return;
    }

    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        obs.unobserve(e.target);          // una sola vez por elemento
      });
    }, {
      threshold: 0.12,
      rootMargin: "0px 0px -40px 0px"
    });

    items.forEach(function (el) { obs.observe(el); });
  }

  /* Intro de carga. La barra avanza sola hasta 90% mientras la pagina carga y
     completa cuando llegaron el load y las fuentes. Dura como minimo MIN para
     que se llegue a ver el dibujo, y como maximo MAX para no retener nunca a
     alguien con conexion lenta: pasado ese tiempo sale igual. */
  function intro(alTerminar) {
    var MIN = 3000, MAX = 6000;
    var barra = document.querySelector(".intro-ol__barra");
    var t0 = Date.now();
    var p = 0;
    var cargo = false;
    var termino = false;

    try { sessionStorage.setItem("intro5105", "1"); } catch (e) {}

    function pintar(v) { if (barra) barra.style.setProperty("--intro-p", v + "%"); }

    // Avance por tiempo: llega a 90% justo al cumplirse MIN, frenando al final.
    var tick = setInterval(function () {
      var t = Math.min(1, (Date.now() - t0) / MIN);
      p = 90 * (1 - Math.pow(1 - t, 2));
      pintar(p.toFixed(1));
    }, 100);

    function listo() {
      if (cargo) return;
      cargo = true;
      var espera = Math.max(0, MIN - (Date.now() - t0));
      setTimeout(salir, espera);
    }

    function salir() {
      if (termino) return;
      termino = true;
      clearInterval(tick);
      pintar(100);
      setTimeout(function () { raiz.classList.add("intro-listo"); }, 300);
      setTimeout(function () {
        raiz.classList.add("intro-sale");
        alTerminar();
      }, 1300);
      setTimeout(function () {
        raiz.classList.remove("intro", "intro-listo", "intro-sale");
      }, 2100);
    }

    var cargaPagina = new Promise(function (ok) {
      if (document.readyState === "complete") ok();
      else window.addEventListener("load", ok, { once: true });
    });
    var fuentes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.all([cargaPagina, fuentes]).then(listo, listo);

    setTimeout(salir, MAX);
  }
})();

/* Nav que se esconde al bajar y vuelve al subir, para que el contenido tenga
   toda la pantalla mientras se lee. Arriba de todo siempre se ve, y tambien
   si tiene el foco del teclado adentro. UMBRAL evita que tiemble con
   movimientos minimos del trackpad. */

(function () {
  "use strict";

  var nav = document.querySelector(".nav");
  if (!nav) return;

  var UMBRAL = 8;
  var TOPE = 90;           // por debajo de esto la nav nunca se esconde
  var ultimo = window.scrollY;
  var pendiente = false;

  function revisar() {
    pendiente = false;
    var y = window.scrollY;
    var delta = y - ultimo;
    if (Math.abs(delta) < UMBRAL) return;

    var ocultar = delta > 0 && y > TOPE && !nav.contains(document.activeElement);
    nav.classList.toggle("nav--oculta", ocultar);
    ultimo = y;
  }

  window.addEventListener("scroll", function () {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(revisar);
  }, { passive: true });

  nav.addEventListener("focusin", function () { nav.classList.remove("nav--oculta"); });
})();

/* Plan B para los links de mail.

   mailto: es la unica forma de abrir la app de correo predeterminada del
   visitante, asi que los links lo siguen usando. Pero si no hay ninguna app
   configurada (pasa mucho en compus que usan Gmail desde la web, o en el
   navegador interno de WhatsApp e Instagram), el clic no hace nada y el
   visitante queda trabado.

   Deteccion: cuando se abre una app, la ventana pierde el foco. Si pasados
   ~900 ms seguimos con foco, asumimos que no se abrio nada y ofrecemos
   Gmail, Outlook o copiar la direccion. Sin JS, el link funciona igual. */

(function () {
  "use strict";

  var links = document.querySelectorAll('a[href^="mailto:"]');
  if (!links.length) return;

  var aviso = null;
  var cerrarTimer = null;

  function datos(href) {
    var partes = href.replace(/^mailto:/, "").split("?");
    var to = decodeURIComponent(partes[0]);
    var asunto = "";
    if (partes[1]) {
      var m = partes[1].match(/(?:^|&)subject=([^&]*)/);
      if (m) asunto = decodeURIComponent(m[1]);
    }
    return { to: to, asunto: asunto };
  }

  function copiar(texto, boton) {
    function listo() {
      boton.textContent = "¡Copiada!";
      setTimeout(function () { boton.textContent = "Copiar dirección"; }, 2000);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).then(listo, function () { manual(); });
    } else {
      manual();
    }
    function manual() {
      var t = document.createElement("textarea");
      t.value = texto;
      t.setAttribute("readonly", "");
      t.style.position = "absolute";
      t.style.left = "-9999px";
      document.body.appendChild(t);
      t.select();
      try { document.execCommand("copy"); listo(); } catch (e) {}
      document.body.removeChild(t);
    }
  }

  function cerrar() {
    if (!aviso) return;
    aviso.classList.remove("is-open");
    clearTimeout(cerrarTimer);
  }

  function mostrar(d) {
    var q = encodeURIComponent;
    var gmail = "https://mail.google.com/mail/?view=cm&fs=1&to=" + q(d.to) +
                (d.asunto ? "&su=" + q(d.asunto) : "");
    var outlook = "https://outlook.live.com/mail/0/deeplink/compose?to=" + q(d.to) +
                  (d.asunto ? "&subject=" + q(d.asunto) : "");

    if (!aviso) {
      aviso = document.createElement("div");
      aviso.className = "mail-aviso";
      aviso.setAttribute("role", "dialog");
      aviso.setAttribute("aria-label", "Otras formas de escribirnos por mail");
      aviso.innerHTML =
        '<p class="mail-aviso__txt">¿No se abrió tu correo? Escribinos desde acá:</p>' +
        '<div class="mail-aviso__acciones">' +
          '<a class="mail-aviso__btn" data-k="gmail" target="_blank" rel="noopener">Abrir en Gmail</a>' +
          '<a class="mail-aviso__btn" data-k="outlook" target="_blank" rel="noopener">Abrir en Outlook</a>' +
          '<button type="button" class="mail-aviso__btn" data-k="copiar">Copiar dirección</button>' +
        '</div>' +
        '<p class="mail-aviso__dir"></p>' +
        '<button type="button" class="mail-aviso__x" aria-label="Cerrar">×</button>';
      document.body.appendChild(aviso);
      aviso.querySelector(".mail-aviso__x").addEventListener("click", cerrar);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrar(); });
    }

    aviso.querySelector('[data-k="gmail"]').href = gmail;
    aviso.querySelector('[data-k="outlook"]').href = outlook;
    aviso.querySelector(".mail-aviso__dir").textContent = d.to;
    var btnCopiar = aviso.querySelector('[data-k="copiar"]');
    btnCopiar.onclick = function () { copiar(d.to, btnCopiar); };

    // Leer offsetWidth fuerza a que el nodo recien insertado se pinte en su
    // estado inicial, asi la transicion arranca. No se usa requestAnimationFrame
    // porque no corre si la pestana no se esta dibujando, y el aviso no saldria.
    void aviso.offsetWidth;
    aviso.classList.add("is-open");
    clearTimeout(cerrarTimer);
    cerrarTimer = setTimeout(cerrar, 15000);
  }

  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener("click", function () {
      var d = datos(a.getAttribute("href"));
      var seAbrio = false;
      function salio() { seAbrio = true; }
      window.addEventListener("blur", salio, { once: true });
      document.addEventListener("visibilitychange", salio, { once: true });

      setTimeout(function () {
        window.removeEventListener("blur", salio);
        document.removeEventListener("visibilitychange", salio);
        if (!seAbrio && document.hasFocus()) mostrar(d);
      }, 900);
      // no se hace preventDefault: el mailto sigue su camino normal
    });
  });
})();
