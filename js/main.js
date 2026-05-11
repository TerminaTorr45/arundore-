/* ============================================================
   ARUNDO RE — main.js
   Lenis (smooth scroll) + GSAP + ScrollTrigger + Barba (page transitions)
   ============================================================ */

console.log("[arundore] libs:", {
  gsap:          typeof gsap !== "undefined",
  ScrollTrigger: typeof ScrollTrigger !== "undefined",
  Lenis:         typeof Lenis !== "undefined",
  barba:         typeof barba !== "undefined",
});

document.documentElement.classList.add("js");

/* ---------- SIDE MENU — early standalone init (independent of GSAP/Lenis) ---------- */
(function setupMenuEarly() {
  function bind() {
    const menu = document.getElementById("sideMenu");
    const toggle = document.getElementById("menuToggle");
    if (!menu || !toggle) {
      console.warn("[arundore] menu elements not found", { menu: !!menu, toggle: !!toggle });
      return;
    }
    if (toggle.dataset.bound === "1") return;
    toggle.dataset.bound = "1";

    const open = () => {
      menu.classList.add("is-open");
      toggle.classList.add("is-active");
      toggle.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-hidden", "false");
      try { if (typeof lenis !== "undefined" && lenis) lenis.stop(); } catch (e) {}
      document.documentElement.style.overflow = "hidden";
    };
    const close = () => {
      menu.classList.remove("is-open");
      toggle.classList.remove("is-active");
      toggle.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-hidden", "true");
      try { if (typeof lenis !== "undefined" && lenis) lenis.start(); } catch (e) {}
      document.documentElement.style.overflow = "";
    };

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      menu.classList.contains("is-open") ? close() : open();
    });
    menu.querySelectorAll("[data-menu-close]").forEach((el) => {
      el.addEventListener("click", close);
    });
    menu.querySelectorAll(".side-menu__link").forEach((link) => {
      link.addEventListener("click", () => setTimeout(close, 120));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) close();
    });

    console.log("[arundore] menu bound");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();

if (typeof gsap === "undefined") {
  console.error("[arundore] GSAP failed to load. Animations disabled.");
}

if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ---------- LENIS SMOOTH SCROLL (optional) ---------- */
let lenis = null;
let navRevealTween = null;
let cleanupNavFallback = null;
let arrivalNudgeTimer = null;
let heroBrandTween = null;
let cleanupHeroBrandArm = null;
try {
  if (typeof Lenis !== "undefined") {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });
    if (typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
    }
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    console.warn("[arundore] Lenis not loaded. Falling back to native scroll.");
  }
} catch (err) {
  console.error("[arundore] Lenis init failed:", err);
  lenis = null;
}

const lockScroll = () => {
  if (lenis) lenis.stop();
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
};
const unlockScroll = () => {
  if (lenis) lenis.start();
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
};

// lock scroll until intro done — scoped to whether the preloader element exists
if (document.getElementById("preloader")) {
  lockScroll();
}

/* ---------- SAFETY: force unlock if anything goes wrong after 8s ---------- */
const safetyUnlock = setTimeout(() => {
  const intro = document.getElementById("preloader");
  if (intro) {
    console.warn("[arundore] Intro safety timeout — forcing unlock.");
    intro.remove();
  }
  unlockScroll();
}, 8000);

/* ---------- INTRO / PRELOADER ANIMATION ---------- */
function runIntro() {
  const intro = document.getElementById("preloader");
  if (!intro) return Promise.resolve();
  if (typeof gsap === "undefined") {
    intro.remove();
    unlockScroll();
    return Promise.resolve();
  }

  const nameInner = intro.querySelector(".preloader__name-inner");
  const tag       = intro.querySelector(".preloader__tag");
  const paris     = intro.querySelector(".preloader__paris");

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      defaults: { ease: "expo.out" },
      onComplete: () => {
        clearTimeout(safetyUnlock);
        intro.classList.add("is-done");
        intro.remove();
        unlockScroll();
        resolve();
      },
    });

    // initial state
    gsap.set(nameInner, { yPercent: 110, opacity: 0 });
    gsap.set(tag,   { y: -16, opacity: 0, xPercent: 0 });
    gsap.set(paris, { y: 16,  opacity: 0, xPercent: -50, letterSpacing: "1.2em" });

    // 1. name slides up
    tl.to(nameInner, {
      yPercent: 0,
      opacity: 1,
      duration: 0.7,
    }, 0.1);

    // 2. tagline fades in from top
    tl.to(tag, {
      y: -16,
      opacity: 1,
      duration: 0.4,
    }, 0.4);

    // 3. paris reveals at bottom — letter-spacing expand
    tl.to(paris, {
      y: 16,
      opacity: 1,
      letterSpacing: ".42em",
      duration: 0.8,
      ease: "expo.out",
    }, 0.55);

    // 4. hold
    tl.to({}, { duration: 0.4 }, ">");

    // 5. exit: full name container fade up
    tl.to(intro.querySelector(".preloader__name"), {
      y: -30,
      opacity: 0,
      duration: 0.5,
      ease: "expo.in",
    }, ">");

    // 6. center square spawns and grows — 4 edge panels scale to 0, square expands
    const topP    = intro.querySelector(".preloader__panel--t");
    const botP    = intro.querySelector(".preloader__panel--b");
    const leftP   = intro.querySelector(".preloader__panel--l");
    const rightP  = intro.querySelector(".preloader__panel--r");

    // single smooth open — square grows from 0 to full viewport in one motion
    tl.to(topP,   { scaleY: 0, duration: 0.9, ease: "expo.inOut" }, ">-0.1")
      .to(botP,   { scaleY: 0, duration: 0.9, ease: "expo.inOut" }, "<")
      .to(leftP,  { scaleX: 0, duration: 0.9, ease: "expo.inOut" }, "<")
      .to(rightP, { scaleX: 0, duration: 0.9, ease: "expo.inOut" }, "<");
  });
}

/* ---------- HERO TEXT REVEAL ---------- */
function heroIntro() {
  const brand = document.querySelector(".hero__brand");
  const arundoWrap = document.querySelector(".hero__brand-word-wrap");
  const arundoWord = arundoWrap?.querySelector(".hero__brand-word");
  const subtitle = document.querySelector(".hero__brand-subtitle");
  const subtitleLeft = document.querySelector(".hero__brand-subtitle-part--left");
  const subtitleRight = document.querySelector(".hero__brand-subtitle-part--right");
  const subtitleLeftText = subtitleLeft?.querySelector(".hero__brand-subtitle-text");
  const subtitleRightText = subtitleRight?.querySelector(".hero__brand-subtitle-text");

  if (!brand || !arundoWrap || !arundoWord || !subtitle || !subtitleLeft || !subtitleRight || !subtitleLeftText || !subtitleRightText || typeof gsap === "undefined") return;

  if (heroBrandTween) {
    if (heroBrandTween.scrollTrigger) heroBrandTween.scrollTrigger.kill();
    heroBrandTween.kill();
    heroBrandTween = null;
  }

  if (cleanupHeroBrandArm) {
    cleanupHeroBrandArm();
    cleanupHeroBrandArm = null;
  }

  const targetWidth = Math.ceil(Math.max(arundoWord.getBoundingClientRect().width, arundoWord.scrollWidth)) + 28;
  const targetGap = window.innerWidth <= 900 ? -10 : -18;
  const subtitleLeftWidth = Math.ceil(Math.max(subtitleLeftText.getBoundingClientRect().width, subtitleLeftText.scrollWidth)) + 8;
  const subtitleRightWidth = Math.ceil(Math.max(subtitleRightText.getBoundingClientRect().width, subtitleRightText.scrollWidth)) + 8;
  const subtitleGap = window.innerWidth <= 900 ? 3 : 5;

  if (typeof ScrollTrigger === "undefined") {
    gsap.set(arundoWrap, {
      width: targetWidth,
      marginRight: targetGap,
    });
    gsap.set(subtitle, { columnGap: subtitleGap });
    gsap.set(subtitleLeft, { width: subtitleLeftWidth, opacity: 1 });
    gsap.set(subtitleRight, { width: subtitleRightWidth, opacity: 1 });
    gsap.set(subtitleLeftText, { x: 0, opacity: 1 });
    gsap.set(subtitleRightText, { x: 0, opacity: 1 });
    return;
  }

  // initial hidden state is handled by CSS (.hero__brand default classes)
  brand.classList.remove("is-revealed");

  const activateReveal = () => {
    if (heroBrandTween) return;

    heroBrandTween = ScrollTrigger.create({
      trigger: brand,
      start: "top 75%",
      end: "top 50%",
      onEnter: () => brand.classList.add("is-revealed"),
      onLeaveBack: () => brand.classList.remove("is-revealed"),
    });

    // expose computed targets to CSS for transitions
    brand.style.setProperty("--arundo-w", targetWidth + "px");
    brand.style.setProperty("--arundo-mr", targetGap + "px");
    brand.style.setProperty("--sub-left-w", subtitleLeftWidth + "px");
    brand.style.setProperty("--sub-right-w", subtitleRightWidth + "px");
    brand.style.setProperty("--sub-gap", subtitleGap + "px");

    if (cleanupHeroBrandArm) {
      cleanupHeroBrandArm();
      cleanupHeroBrandArm = null;
    }

    ScrollTrigger.refresh();
  };

  const navKeys = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Spacebar"]);
  const onWheel = () => activateReveal();
  const onTouchMove = () => activateReveal();
  const onKeyDown = (event) => {
    if (navKeys.has(event.key)) activateReveal();
  };

  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("keydown", onKeyDown);

  cleanupHeroBrandArm = () => {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("keydown", onKeyDown);
  };
}

/* ---------- SECTION TITLE / LABEL REVEAL ---------- */
function sectionReveals() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

  gsap.utils.toArray(".intro__title, .metrics__title, .solutions__title, .leadership__title, .commit__title, .cta__title").forEach((el) => {
    gsap.from(el, {
      y: 60,
      opacity: 0,
      duration: 1.2,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  gsap.utils.toArray(".intro__label, .metrics__label, .solutions__label, .leadership__label, .commit__label").forEach((el) => {
    gsap.from(el, {
      x: -20, opacity: 0, duration: 0.8, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
    });
  });

  gsap.utils.toArray(".intro__body, .leadership__body, .commit__card").forEach((el, i) => {
    gsap.from(el, {
      y: 40, opacity: 0, duration: 1, ease: "expo.out",
      delay: (i % 3) * 0.08,
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  gsap.utils.toArray(".sol").forEach((el, i) => {
    gsap.from(el, {
      y: 40, opacity: 0, duration: 0.9, ease: "expo.out",
      delay: i * 0.05,
      scrollTrigger: { trigger: el, start: "top 92%" },
    });
  });

  // about card progressive reveal
  gsap.utils.toArray(".about").forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top 78%",
      once: true,
      onEnter: () => el.classList.add("is-revealed"),
    });
  });

  // values cards stagger reveal — class-based via ScrollTrigger
  gsap.utils.toArray(".values").forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: "top 88%",
      once: true,
      onEnter: () => section.classList.add("is-revealed"),
    });
  });

}

/* ---------- VIDEO THUMBNAIL → MODAL ---------- */
function initVideoPlayer() {
  const trigger = document.getElementById("videoPlayer");
  const modal = document.getElementById("videoModal");
  const closeBtn = document.getElementById("videoModalClose");
  const video = document.getElementById("videoModalEl");
  if (!trigger || !modal || !closeBtn || !video) return;

  const open = () => {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    lockScroll();
    video.currentTime = 0;
    video.play().catch(() => {});
  };
  const close = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    video.pause();
    unlockScroll();
  };

  trigger.addEventListener("click", open);
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });
}

/* ---------- 3D TILT (vignette) ---------- */
function initTilt() {
  if (!matchMedia("(hover:hover) and (pointer:fine)").matches) return;

  document.querySelectorAll("[data-tilt]").forEach((card) => {
    const inner = card.querySelector(".vignette__inner");
    if (!inner) return;

    const maxTilt = 14;
    let raf = null;

    const onMove = (e) => {
      const rect = inner.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotY = (x - 0.5) * maxTilt * 2;
      const rotX = (0.5 - y) * maxTilt * 2;

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        inner.style.transform =
          `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(20px)`;
      });
    };

    const onLeave = () => {
      if (raf) cancelAnimationFrame(raf);
      inner.style.transform = "rotateX(0deg) rotateY(0deg) translateZ(0)";
    };

    inner.addEventListener("mousemove", onMove);
    inner.addEventListener("mouseleave", onLeave);
  });
}

/* ---------- METRIC COUNTERS ---------- */
function counters() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    const obj = { val: 0 };

    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: target,
          duration: 2,
          ease: "expo.out",
          onUpdate: () => {
            const v = Math.round(obj.val);
            el.textContent = v >= 1000
              ? v.toLocaleString("fr-FR").replace(/ /g, " ")
              : v;
          },
        });
      },
    });
  });
}

/* ---------- LEADERSHIP IMAGE PARALLAX ---------- */
function imageParallax() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  const img = document.querySelector(".leadership__media img");
  if (!img) return;
  gsap.to(img, {
    yPercent: -8,
    ease: "none",
    scrollTrigger: {
      trigger: ".leadership__media",
      start: "top bottom",
      end: "bottom top",
      scrub: true,
    },
  });
}

/* ---------- STICKY NAV REVEAL ---------- */
function stickyNav() {
  const nav = document.querySelector(".nav-sticky");
  if (!nav) return;

  // always visible — kill any previous tweens/listeners
  if (navRevealTween) {
    if (navRevealTween.scrollTrigger) navRevealTween.scrollTrigger.kill();
    navRevealTween.kill();
    navRevealTween = null;
  }
  if (cleanupNavFallback) {
    cleanupNavFallback();
    cleanupNavFallback = null;
  }

  nav.classList.add("is-visible");
  if (typeof gsap !== "undefined") {
    gsap.set(nav, { autoAlpha: 1, y: 0, scale: 1 });
  } else {
    nav.style.opacity = "1";
    nav.style.visibility = "visible";
    nav.style.transform = "none";
  }
}

/* ---------- ARRIVAL SCROLL NUDGE ---------- */
function arrivalNudge(delay = 0) {
  if (arrivalNudgeTimer) {
    clearTimeout(arrivalNudgeTimer);
    arrivalNudgeTimer = null;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if ((window.scrollY || window.pageYOffset || 0) > 12) return;

  const targetY = Math.min(window.innerHeight * 0.08, 72);

  arrivalNudgeTimer = window.setTimeout(() => {
    if (lenis && typeof lenis.scrollTo === "function") {
      lenis.scrollTo(targetY, { duration: 1.1 });
      return;
    }

    window.scrollTo({
      top: targetY,
      behavior: "smooth",
    });
  }, delay);
}

/* ---------- INIT EVERYTHING ON A PAGE LOAD ---------- */
async function initPage() {
  stickyNav();
  sectionReveals();
  counters();
  imageParallax();
  initTilt();
  initVideoPlayer();
  if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();

  try {
    await runIntro();
  } catch (err) {
    console.error("[arundore] Intro failed:", err);
    const intro = document.getElementById("preloader");
    if (intro) intro.remove();
    unlockScroll();
  }

  heroIntro();
  if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  arrivalNudge(420);
}

/* ---------- BARBA: page transitions (ready for multi-page) ---------- */
function bootstrap() {
  if (typeof barba !== "undefined" && typeof gsap !== "undefined") {
    barba.init({
      transitions: [
        {
          name: "fade",
          leave({ current }) {
            return gsap.to(current.container, {
              opacity: 0, duration: 0.5, ease: "expo.in",
            });
          },
          enter({ next }) {
            window.scrollTo(0, 0);
            return gsap.from(next.container, {
              opacity: 0, duration: 0.6, ease: "expo.out",
            });
          },
        },
      ],
      views: [
        { namespace: "home", afterEnter() { initPage(); } },
      ],
    });
  }
  initPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
