/* 5105 Labs - entrada de secciones, nav, tema, mail y chat de preguntas.
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

/* Tema claro / oscuro.

   El <head> ya dejo puesto data-theme antes de pintar: lo guardado o, si no
   hay nada guardado, lo del sistema. Aca vive el boton sol/luna, y mientras el
   visitante no haya elegido, la pagina sigue al sistema en vivo (el celu que
   pasa solo a oscuro a la noche).

   El cambio abre el tema nuevo como un circulo que crece desde el boton, con
   View Transitions. Sin soporte o con movimiento reducido, cambia de una. */

(function () {
  "use strict";

  var raiz = document.documentElement;
  var boton = document.querySelector(".tema");
  var sistema = window.matchMedia("(prefers-color-scheme: dark)");
  var metas = document.querySelectorAll('meta[name="theme-color"]');
  // los mismos colores de las <meta theme-color> del <head>
  var BARRA = { light: "#ad5714", dark: "#0f1113" };
  var CLAVE = "tema5105";

  function elegido() {
    try { return localStorage.getItem(CLAVE); } catch (e) { return null; }
  }

  function actual() {
    return raiz.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function poner(t) {
    raiz.setAttribute("data-theme", t);
    // Las dos <meta> tienen media=: hay que pisar ambas, si no la del sistema
    // le gana a la eleccion y la barra del navegador queda del otro color.
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", BARRA[t]);
    if (boton) {
      var otro = t === "dark" ? "claro" : "oscuro";
      boton.setAttribute("aria-label", "Pasar a modo " + otro);
      boton.title = "Modo " + otro;
    }
  }

  poner(actual());

  function alCambiarSistema(e) {
    if (!elegido()) poner(e.matches ? "dark" : "light");
  }
  if (sistema.addEventListener) sistema.addEventListener("change", alCambiarSistema);
  else if (sistema.addListener) sistema.addListener(alCambiarSistema);   // Safari < 14

  if (!boton) return;

  boton.addEventListener("click", function () {
    var nuevo = actual() === "dark" ? "light" : "dark";
    try { localStorage.setItem(CLAVE, nuevo); } catch (e) {}

    var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (quieto || !document.startViewTransition) { poner(nuevo); return; }

    var r = boton.getBoundingClientRect();
    var x = r.left + r.width / 2;
    var y = r.top + r.height / 2;
    var radio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    var vt = document.startViewTransition(function () { poner(nuevo); });
    vt.ready.then(function () {
      raiz.animate(
        { clipPath: ["circle(0px at " + x + "px " + y + "px)",
                     "circle(" + radio + "px at " + x + "px " + y + "px)"] },
        { duration: 650, easing: "cubic-bezier(.16, 1, .3, 1)",
          pseudoElement: "::view-transition-new(root)" }
      );
    }, function () {});
  });
})();

/* Preguntas frecuentes como mini chat.

   Las respuestas estan en el HTML, en los <details> de .faq__lista: eso es lo
   que indexa Google y lo que ve quien no tiene JS. Aca se leen, se esconde la
   lista y cada pregunta pasa a ser un boton. Al tocarlo aparece como mensaje
   propio y enseguida la respuesta.

   Del otro lado no hay nadie en vivo y el chat no lo finge: no hay
   "escribiendo...", y lo que se escribe en el campo no se contesta aca, abre
   WhatsApp con la pregunta. */

(function () {
  "use strict";

  var chat = document.querySelector(".chat");
  if (!chat) return;

  var cuerpo = chat.querySelector(".chat__cuerpo");
  var log = chat.querySelector(".chat__log");
  var lista = chat.querySelector(".faq__lista");
  var form = chat.querySelector(".chat__form");
  var campo = form.querySelector("input");
  var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var WA = "https://wa.me/5493512700909?text=";
  var CIERRE = "Esas son las que más nos hacen. Si te quedó otra, escribila acá abajo y seguimos por WhatsApp.";
  var ENVIADO = "Te abrimos WhatsApp con tu pregunta. Mandala desde ahí y te respondemos el mismo día.";

  var sug = document.createElement("div");
  sug.className = "chat__sug";
  sug.setAttribute("role", "group");
  sug.setAttribute("aria-label", "Preguntas frecuentes");

  Array.prototype.forEach.call(lista.querySelectorAll("details"), function (d) {
    var pregunta = d.querySelector("summary").textContent.trim();
    var respuesta = d.querySelector("p").textContent.trim().replace(/\s+/g, " ");
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = pregunta;
    b.addEventListener("click", function () { tocar(b, pregunta, respuesta); });
    sug.appendChild(b);
  });

  lista.hidden = true;
  cuerpo.appendChild(sug);
  chat.classList.add("is-vivo");

  // Pares [lo que dice el visitante, lo que contestamos], de a uno por vez:
  // si toca tres preguntas seguidas, cada respuesta queda pegada a la suya.
  var cola = [];
  var ocupado = false;

  function mensaje(texto, mia) {
    var p = document.createElement("p");
    p.className = "burbuja" + (mia ? " burbuja--mia" : "");
    p.textContent = texto;
    log.appendChild(p);
    return p;
  }

  // Scrollea solo la caja del chat, nunca la pagina. No va al fondo: deja la
  // pregunta recien hecha arriba de todo, asi la respuesta se lee entera aunque
  // abajo queden varias preguntas por tocar (en celular ocupan medio chat).
  function mostrar(desde) {
    var max = cuerpo.scrollHeight - cuerpo.clientHeight;
    cuerpo.scrollTo({ top: Math.min(max, desde.offsetTop - 14), behavior: quieto ? "auto" : "smooth" });
  }

  function tocar(boton, pregunta, respuesta) {
    // Con teclado, el foco pasa a la pregunta vecina para poder seguir.
    var tenia = document.activeElement === boton;
    var vecino = boton.nextElementSibling || boton.previousElementSibling;
    sug.removeChild(boton);
    if (tenia) (vecino || cuerpo).focus({ preventScroll: true });

    cola.push([pregunta, respuesta]);
    if (!ocupado) seguir();
  }

  function seguir() {
    var par = cola.shift();
    if (!par) {
      ocupado = false;
      if (!sug.children.length && sug.parentNode) {
        sug.parentNode.removeChild(sug);
        mostrar(mensaje(CIERRE, false));
      }
      return;
    }
    ocupado = true;
    var pregunta = mensaje(par[0], true);
    mostrar(pregunta);

    // la respuesta entra apenas termina de entrar la pregunta
    setTimeout(function () {
      mensaje(par[1], false);
      mostrar(pregunta);
      setTimeout(seguir, quieto ? 0 : 250);
    }, quieto ? 0 : 380);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var texto = campo.value.trim();
    if (!texto) { campo.focus(); return; }

    var url = WA + encodeURIComponent("Hola! Tengo una consulta: " + texto);
    var w = window.open(url, "_blank");
    if (w) w.opener = null;
    else location.href = url;           // si el navegador bloqueo la pestana nueva

    campo.value = "";
    cola.push([texto, ENVIADO]);
    if (!ocupado) seguir();
  });
})();
