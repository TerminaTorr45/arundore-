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
    const navToggle = document.getElementById("menuNavToggle");
    if (!menu || !toggle) {
      console.warn("[arundore] menu elements not found", { menu: !!menu, toggle: !!toggle });
      return;
    }
    if (toggle.dataset.bound === "1") return;
    toggle.dataset.bound = "1";
    if (navToggle) navToggle.dataset.bound = "1";

    const open = (mode) => {
      menu.classList.remove("is-nav-only", "is-blog-only");
      if (mode === "nav") menu.classList.add("is-nav-only");
      else if (mode === "blog") menu.classList.add("is-blog-only");

      menu.classList.add("is-open");
      menu.setAttribute("aria-hidden", "false");

      if (mode === "nav" && navToggle) {
        navToggle.classList.add("is-active");
        navToggle.setAttribute("aria-expanded", "true");
      } else {
        toggle.classList.add("is-active");
        toggle.setAttribute("aria-expanded", "true");
      }

      try { if (typeof lenis !== "undefined" && lenis) lenis.stop(); } catch (e) {}
      document.documentElement.style.overflow = "hidden";
    };
    const close = () => {
      menu.classList.remove("is-open", "is-nav-only", "is-blog-only");
      toggle.classList.remove("is-active");
      toggle.setAttribute("aria-expanded", "false");
      if (navToggle) {
        navToggle.classList.remove("is-active");
        navToggle.setAttribute("aria-expanded", "false");
      }
      menu.setAttribute("aria-hidden", "true");
      try { if (typeof lenis !== "undefined" && lenis) lenis.start(); } catch (e) {}
      document.documentElement.style.overflow = "";
    };

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      menu.classList.contains("is-open") ? close() : open("blog");
    });
    if (navToggle) {
      navToggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        menu.classList.contains("is-open") ? close() : open("nav");
      });
    }
    menu.querySelectorAll("[data-menu-close]").forEach((el) => {
      el.addEventListener("click", close);
    });
    menu.querySelectorAll(".side-menu__link, .side-menu__primary-link").forEach((link) => {
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
      // duration + easing keep behavior identical on slow vs fast hardware
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      // normalize across input devices (trackpad / mouse / high-refresh)
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      lerp: 0.1,
      syncTouch: false,
      normalizeWheel: true,
    });
    window.__lenis = lenis;
    if (typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
    }
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    // lagSmoothing(0) disables GSAP's frame-drop catch-up — keeps anim duration
    // constant regardless of 60Hz, 120Hz, 144Hz monitors
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

  gsap.utils.toArray(".intro__title, .solutions__title, .leadership__title, .commit__title, .cta__title").forEach((el) => {
    gsap.from(el, {
      y: 60,
      opacity: 0,
      duration: 1.2,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top bottom", once: true },
    });
  });

  document.querySelectorAll(".metrics__title").forEach((el) => {
    const reveal = () => el.classList.add("is-revealed");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal();
          io.disconnect();
        }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
  });

  document.querySelectorAll(".metric-row").forEach((row) => {
    const cards = row.querySelectorAll(".kpi");
    const revealAll = () => cards.forEach((card, i) => {
      setTimeout(() => card.classList.add("is-revealed"), i * 90);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          revealAll();
          io.disconnect();
        }
      });
    }, { rootMargin: "0px 0px -5% 0px" });
    io.observe(row);
    setTimeout(() => {
      if (!cards[0]?.classList.contains("is-revealed")) {
        revealAll();
        io.disconnect();
      }
    }, 2500);
  });

  gsap.utils.toArray(".intro__label, .metrics__label, .solutions__label, .leadership__label, .commit__label").forEach((el) => {
    gsap.from(el, {
      x: -20, opacity: 0, duration: 0.8, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top bottom", once: true },
    });
  });

  gsap.utils.toArray(".intro__body, .leadership__body, .commit__card").forEach((el, i) => {
    gsap.from(el, {
      y: 40, opacity: 0, duration: 1, ease: "expo.out",
      delay: (i % 3) * 0.08,
      scrollTrigger: { trigger: el, start: "top bottom", once: true },
    });
  });

  gsap.utils.toArray(".sol").forEach((el, i) => {
    gsap.from(el, {
      y: 40, opacity: 0, duration: 0.9, ease: "expo.out",
      delay: i * 0.05,
      scrollTrigger: { trigger: el, start: "top bottom", once: true },
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

/* ---------- INLINE VIDEO PLAY / CLOSE OVERLAY (YouTube iframe) ---------- */
function initVideoPlayer() {
  const section = document.getElementById("video");
  const player = document.getElementById("videoPlayer");
  const embed = document.getElementById("videoEmbed");
  const playBtn = document.getElementById("videoPlayBtn");
  const closeBtn = document.getElementById("videoCloseBtn");
  if (!section || !player || !embed || !playBtn || !closeBtn) return;

  const ytId = player.dataset.ytId;
  const ytStart = player.dataset.ytStart || "0";

  const start = () => {
    if (!embed.querySelector("iframe")) {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&start=${ytStart}&rel=0&modestbranding=1&playsinline=1`;
      iframe.title = "Vidéo Arundo Re";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.frameBorder = "0";
      embed.appendChild(iframe);
    }
    player.classList.add("is-playing");
  };
  const stop = () => {
    embed.innerHTML = "";
    player.classList.remove("is-playing");
  };

  playBtn.addEventListener("click", start);
  closeBtn.addEventListener("click", stop);

  section.addEventListener("click", (e) => {
    if (!player.classList.contains("is-playing")) return;
    if (player.contains(e.target)) return;
    stop();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && player.classList.contains("is-playing")) stop();
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

/* ---------- STORY INTRO REVEAL — "En conversation avec…" ---------- */
function initStoryIntroReveal() {
  if (typeof ScrollTrigger === "undefined") return;
  const intro = document.querySelector(".story-intro");
  const nav = document.querySelector(".nav-sticky");
  // pas de story-intro (profile pages): kill is-gold résiduel + return
  if (!intro) {
    if (nav) nav.classList.remove("is-gold");
    return;
  }

  const goldOn = () => nav && nav.classList.add("is-gold");
  const goldOff = () => nav && nav.classList.remove("is-gold");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    intro.classList.add("is-revealed");
    goldOn();
    return;
  }

  ScrollTrigger.create({
    trigger: intro,
    start: "top 78%",
    once: true,
    onEnter: () => intro.classList.add("is-revealed"),
  });

  ScrollTrigger.create({
    trigger: intro,
    start: "top 60%",
    end: "max",
    onEnter: goldOn,
    onEnterBack: goldOn,
    onLeaveBack: goldOff,
  });
}

/* ---------- STORY SCROLL — sticky + rotation + scroll-jack (1 scroll = 1 section) ---------- */
/* ---------- VIDEO SCROLL REVEAL — scale + radius scrubbed on scroll ---------- */
function initVideoScroll() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  const section = document.querySelector(".video-section--scroll");
  const player  = section && section.querySelector(".video-player");
  if (!section || !player) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (player.dataset.scrollBound === "1") return;
  player.dataset.scrollBound = "1";

  const isMobile = window.matchMedia("(max-width: 900px)").matches;
  const fromRotX   = isMobile ? 3 : 3;
  const fromScale  = isMobile ? 0.96 : 0.95;
  const fromRadius = isMobile ? 20 : 56;
  const persp      = isMobile ? 1100 : 1400;

  gsap.set(player, {
    transformPerspective: persp,
    rotateX: fromRotX,
    scale: fromScale,
    transformOrigin: "center top",
    borderRadius: fromRadius + "px",
  });

  gsap.to(player, {
    rotateX: 0,
    scale: 1,
    ease: "none",
    scrollTrigger: {
      trigger: section,
      start: "top bottom",
      end:   "top top",
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });
}

function initStoryScroll() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  const sections = gsap.utils.toArray("[data-story]");
  const container = document.querySelector(".story-scroll");
  if (!sections.length || !container) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ROT_START = 14;

  sections.forEach((section, i) => {
    gsap.set(section, { zIndex: i + 1 });
    const inner = section.querySelector(".story-inner");
    if (!inner) return;

    if (i > 0 && !reduced) {
      gsap.set(inner, { rotation: ROT_START, transformOrigin: "bottom left" });
      gsap.to(inner, {
        rotation: 0,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "top top",
          scrub: 1,
          invalidateOnRefresh: true,
          onLeave:     (self) => { gsap.set(inner, { rotation: 0 }); },
          onEnterBack: (self) => { if (self.progress >= 1) gsap.set(inner, { rotation: 0 }); },
        },
      });
    }
  });

  ScrollTrigger.refresh();

  // refresh after images load (layout shift fix — cards stuck mid-rotation)
  const imgs = container.querySelectorAll("img");
  let pending = 0;
  imgs.forEach((img) => {
    if (!img.complete) {
      pending++;
      img.addEventListener("load",  () => { if (--pending === 0) ScrollTrigger.refresh(); }, { once: true });
      img.addEventListener("error", () => { if (--pending === 0) ScrollTrigger.refresh(); }, { once: true });
    }
  });
  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });

  // debounced resize refresh
  let _rsST;
  window.addEventListener("resize", () => {
    clearTimeout(_rsST);
    _rsST = setTimeout(() => ScrollTrigger.refresh(), 150);
  });

}

/* ---------- PROFILE SWITCH (tabs + whisper) — used on profile pages ---------- */
function initProfileSwitch() {
  const root = document.querySelector(".profile-switch");
  if (!root) return;
  const tabs = root.querySelectorAll(".profile-switch__tab");
  const pill = root.querySelector(".profile-switch__pill");
  const stage = root.querySelector(".profile-switch__stage");
  const panels = root.querySelectorAll(".profile-switch__panel");
  if (!tabs.length || !pill || !stage) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof gsap !== "undefined";
  const WHISPER_DEFAULT = { delay: 35, duration: 0.5, x: -55, y: 20, blur: 14, ease: "power3.out" };
  const WHISPER_OVERRIDES = { parcours: { delay: 12, duration: 0.4 } };
  function whisperConf(panel) { return Object.assign({}, WHISPER_DEFAULT, WHISPER_OVERRIDES[panel.dataset.panel] || {}); }

  root.querySelectorAll("[data-whisper]").forEach((el) => {
    if (el.dataset.whisperInit === "1") return;
    const raw = el.textContent.replace(/\s+/g, " ").trim();
    el.dataset.original = raw;
    el.innerHTML = raw.split(" ").map((w) => `<span class="whisper-word" data-word>${w}</span>`).join(" ");
    el.dataset.whisperInit = "1";
  });

  function whisperPanel(panel) {
    const words = panel.querySelectorAll("[data-word]");
    if (!words.length) return;
    if (reduceMotion || !hasGsap) {
      words.forEach((w) => { w.style.opacity = 1; w.style.transform = "none"; w.style.filter = "none"; });
      return;
    }
    const conf = whisperConf(panel);
    gsap.killTweensOf(words);
    gsap.set(words, { opacity: 0, x: conf.x, y: conf.y, filter: `blur(${conf.blur}px)` });
    gsap.to(words, {
      opacity: 1, x: 0, y: 0, filter: "blur(0px)",
      duration: conf.duration, ease: conf.ease, stagger: conf.delay / 1000,
      onComplete() { setStageHeight(panel); },
    });
  }
  function placePill(tab) {
    const r = tab.getBoundingClientRect();
    const w = tab.parentElement.getBoundingClientRect();
    pill.style.width = r.width + "px";
    pill.style.transform = `translateX(${r.left - w.left - 5}px)`;
  }
  function setStageHeight(panel) { stage.style.height = panel.scrollHeight + "px"; }

  function activate(target) {
    const nt = root.querySelector(`.profile-switch__tab[data-target="${target}"]`);
    const np = root.querySelector(`.profile-switch__panel[data-panel="${target}"]`);
    if (!nt || !np) return;
    tabs.forEach((t) => {
      const on = t === nt;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    panels.forEach((p) => {
      const on = p === np;
      p.classList.toggle("is-active", on);
      p.setAttribute("aria-hidden", on ? "false" : "true");
    });
    placePill(nt); setStageHeight(np); whisperPanel(np);
  }

  tabs.forEach((tab) => {
    if (tab.dataset.bound === "1") return;
    tab.dataset.bound = "1";
    tab.addEventListener("click", () => activate(tab.dataset.target));
  });

  const it = root.querySelector(".profile-switch__tab.is-active") || tabs[0];
  const ip = root.querySelector(".profile-switch__panel.is-active") || panels[0];
  requestAnimationFrame(() => { placePill(it); setStageHeight(ip); whisperPanel(ip); });

  if (!initProfileSwitch._resizeBound) {
    initProfileSwitch._resizeBound = true;
    let rs;
    window.addEventListener("resize", () => {
      clearTimeout(rs);
      rs = setTimeout(() => {
        const r = document.querySelector(".profile-switch");
        if (!r) return;
        const t = r.querySelector(".profile-switch__tab.is-active");
        const p = r.querySelector(".profile-switch__panel.is-active");
        if (t) {
          const rect = t.getBoundingClientRect();
          const wrap = t.parentElement.getBoundingClientRect();
          const pl = r.querySelector(".profile-switch__pill");
          if (pl) { pl.style.width = rect.width + "px"; pl.style.transform = `translateX(${rect.left - wrap.left - 5}px)`; }
        }
        if (p) {
          const st = r.querySelector(".profile-switch__stage");
          if (st) st.style.height = p.scrollHeight + "px";
        }
      }, 120);
    });
  }
}

/* ---------- ANIMATION RESTART — re-trigger CSS keyframes after Barba nav ---------- */
function restartCssAnimations() {
  const selectors = [
    ".profile-switch__inner",
    ".profile-combo__kpis .profile-kpi--text",
    ".profile-combo__kpis .profile-kpi--outline",
    ".profile-combo__kpis .profile-kpi--quote",
  ];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.style.animation = "none";
      // force reflow so animation restart actually fires
      void el.offsetWidth;
      el.style.animation = "";
    });
  });
}

/* ---------- HERO BRAND MASK OPEN — retire overflow:hidden dès que chaque slide-up finit ---------- */
function initHeroMaskOpen() {
  const brand = document.querySelector(".hero__brand");
  if (!brand) return;
  const wraps = brand.querySelectorAll(".hero__brand-word-wrap, .hero__brand-subtitle-part");
  if (!wraps.length) return;

  const closeMasks = () => wraps.forEach((w) => w.classList.remove("is-mask-open"));

  // ouvre masque de chaque wrap quand SON inner finit son transform
  const armPerWrap = () => {
    wraps.forEach((w) => {
      const inner = w.querySelector(".hero__brand-word, .hero__brand-subtitle-text");
      if (!inner || inner.dataset.maskListener === "1") return;
      inner.dataset.maskListener = "1";
      inner.addEventListener("transitionend", (e) => {
        if (e.propertyName === "transform") w.classList.add("is-mask-open");
      });
    });
  };

  // si déjà révélé (sans transition), ouvre direct
  const openImmediate = () => wraps.forEach((w) => w.classList.add("is-mask-open"));

  armPerWrap();

  if (brand.classList.contains("is-revealed")) {
    // listener catchera la fin de transition; fallback timer si pas de transition
    setTimeout(() => {
      wraps.forEach((w) => {
        if (!w.classList.contains("is-mask-open")) w.classList.add("is-mask-open");
      });
    }, 1700);
  }

  if (brand.dataset.maskObs === "1") return;
  brand.dataset.maskObs = "1";
  const obs = new MutationObserver(() => {
    if (brand.classList.contains("is-revealed")) {
      armPerWrap();
      // fallback safety
      setTimeout(() => wraps.forEach((w) => w.classList.add("is-mask-open")), 1700);
    } else {
      closeMasks();
    }
  });
  obs.observe(brand, { attributes: true, attributeFilter: ["class"] });
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

  const isProfile = document.body.classList.contains("page-profile");

  if (isProfile) {
    // profile pages: nav state fixe (stuck), pas de toggle scroll, reste vert
    nav.classList.add("is-stuck");
    nav.classList.remove("is-gold");
    cleanupNavFallback = () => {
      nav.classList.remove("is-stuck");
    };
    return;
  }

  // main page: toggle is-stuck on scroll
  const STUCK_THRESHOLD = 120;
  const onScroll = () => {
    const y = window.scrollY || window.pageYOffset || 0;
    nav.classList.toggle("is-stuck", y > STUCK_THRESHOLD);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  cleanupNavFallback = () => {
    window.removeEventListener("scroll", onScroll);
    nav.classList.remove("is-stuck");
  };
}

/* ---------- ARRIVAL SCROLL NUDGE ---------- */
function arrivalNudge(delay = 0) {
  if (arrivalNudgeTimer) {
    clearTimeout(arrivalNudgeTimer);
    arrivalNudgeTimer = null;
  }
  return;
  // disabled — no auto scroll on arrival

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
let __pageBooted = false;

/* force état final sur tous les éléments de reveal — utilisé sur nav Barba */
function forceAllReveals() {
  if (typeof gsap === "undefined") return;

  /* sélecteurs des gsap.from() de sectionReveals */
  const fromTargets = [
    ".intro__title", ".solutions__title", ".leadership__title", ".commit__title", ".cta__title",
    ".intro__label", ".metrics__label", ".solutions__label", ".leadership__label", ".commit__label",
    ".intro__body", ".leadership__body", ".commit__card",
    ".sol",
  ].join(",");
  const fromEls = document.querySelectorAll(fromTargets);
  if (fromEls.length) gsap.set(fromEls, { y: 0, x: 0, opacity: 1, clearProps: "transform,opacity" });

  /* class-based reveals: force `is-revealed` */
  document.querySelectorAll(
    ".about, .values, .metrics__title, .kpi, .story-intro, .story-section"
  ).forEach((el) => el.classList.add("is-revealed"));

  /* hero brand: si présent (page home), révèle direct */
  const brand = document.querySelector(".hero__brand");
  if (brand) brand.classList.add("is-revealed");
}

async function initPage() {
  /* kill stale ScrollTriggers from previous page (Barba nav fix) */
  if (typeof ScrollTrigger !== "undefined") {
    ScrollTrigger.getAll().forEach((st) => {
      try { st.kill(true); } catch (e) {}
    });
  }
  /* clear stuck transforms on story-inner from previous page */
  if (typeof gsap !== "undefined") {
    document.querySelectorAll(".story-inner").forEach((el) => {
      try { gsap.set(el, { clearProps: "transform,rotation" }); } catch (e) {}
    });
  }

  stickyNav();
  sectionReveals();
  initHeroMaskOpen();
  counters();
  imageParallax();
  initTilt();
  initVideoPlayer();
  initStoryIntroReveal();
  initStoryScroll();
  initVideoScroll();
  initProfileSwitch();
  restartCssAnimations();

  if (!__pageBooted) {
    /* premier chargement: preloader + reveals scroll-driven normaux */
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

    __pageBooted = true;
  } else {
    /* nav Barba: tout final-state direct, zéro re-anim sous le rideau */
    const intro = document.getElementById("preloader");
    if (intro) intro.remove();
    unlockScroll();
    forceAllReveals();
    heroIntro();
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  }

  setupResponsiveRefresh();
}

/* ---------- RESPONSIVE NORMALIZATION ----------
   Triggers can drift when:
     - viewport resizes
     - fonts finish loading after init
     - images/video load and change layout
     - device pixel ratio differs (retina)
   Force ScrollTrigger to recompute positions on each of these events. */
let _responsiveBound = false;
function setupResponsiveRefresh() {
  if (_responsiveBound || typeof ScrollTrigger === "undefined") return;
  _responsiveBound = true;

  const refresh = () => {
    try {
      ScrollTrigger.refresh();
      if (typeof heroIntro === "function") heroIntro();
    } catch (e) {}
  };

  // debounce resize
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refresh, 220);
  });

  // after every asset finishes loading
  window.addEventListener("load", refresh);

  // after web fonts settle (layout shift from Inter Tight / Montserrat / Fraunces)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refresh).catch(() => {});
  }

  // after images load (img cards, vignette, hero photo)
  document.querySelectorAll("img").forEach((img) => {
    if (!img.complete) img.addEventListener("load", refresh, { once: true });
  });

  // orientation change on tablets / phones
  window.addEventListener("orientationchange", () => setTimeout(refresh, 250));
}

/* ---------- BARBA: page transitions (curtain sweep, prefetch & full warm) ---------- */
function bootstrap() {
  if (typeof barba !== "undefined" && typeof gsap !== "undefined") {

    const getCurtain = () => ({
      top:   document.querySelector(".page-curtain__half--top"),
      bot:   document.querySelector(".page-curtain__half--bot"),
      brand: document.querySelector(".page-curtain__brand"),
      line:  document.querySelector(".page-curtain__line"),
    });

    /* prefetch sur hover: HTML déjà en cache au clic */
    const prefetched = new Set();
    function prefetch(href) {
      if (!href || prefetched.has(href)) return;
      prefetched.add(href);
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = href;
      link.as = "document";
      document.head.appendChild(link);
      fetch(href, { credentials: "same-origin" }).catch(() => {});
    }
    document.addEventListener("mouseover", (e) => {
      const a = e.target.closest('a[href]:not([target="_blank"])');
      if (!a) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return;
      prefetch(url.pathname);
    }, { passive: true });

    /* attend que toutes les images critiques du nouveau container soient décodées */
    function warmContainer(container) {
      const imgs = container.querySelectorAll("img");
      const promises = [];
      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth) return;
        if (img.decode) {
          promises.push(img.decode().catch(() => {}));
        } else {
          promises.push(new Promise((res) => {
            img.addEventListener("load", res, { once: true });
            img.addEventListener("error", res, { once: true });
          }));
        }
      });
      /* fail-safe: 600ms max */
      return Promise.race([
        Promise.all(promises),
        new Promise((res) => setTimeout(res, 600)),
      ]);
    }

    barba.init({
      preventRunning: true,
      transitions: [
        {
          name: "curtain-sweep",
          sync: false,

          before() {
            if (window.__lenis && window.__lenis.stop) window.__lenis.stop();
          },
          after() {
            if (window.__lenis && window.__lenis.start) window.__lenis.start();
          },

          leave({ current }) {
            const { top, bot, brand, line } = getCurtain();
            const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });

            /* container fade rapide */
            tl.to(current.container, {
              opacity: 0, duration: 0.25, ease: "power2.in",
            }, 0);

            /* demi-écrans se rencontrent au centre */
            tl.set([top, bot], { scaleY: 0 }, 0);
            tl.set(brand, { opacity: 0 }, 0);
            tl.set(line, { width: 0 }, 0);

            tl.to([top, bot], { scaleY: 1, duration: 0.45 }, 0);

            /* brand + ligne dorée fade-in pendant rideau plein */
            tl.to(brand, { opacity: 1, duration: 0.22, ease: "power2.out" }, 0.28);
            tl.to(line, { width: 120, duration: 0.35, ease: "power3.out" }, 0.28);

            return tl;
          },

          /* beforeEnter async: init + warm-up images AVANT que rideau s'ouvre */
          async beforeEnter({ next }) {
            window.scrollTo(0, 0);
            /* page prête en DOM: init complet */
            initPage();
            if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
            /* attend images visibles + une frame pour layout */
            await warmContainer(next.container);
            await new Promise(requestAnimationFrame);
            if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
          },

          /* enter: rideau s'ouvre sur page déjà prête */
          enter({ next }) {
            const { top, bot, brand, line } = getCurtain();
            const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });

            /* container visible direct */
            gsap.set(next.container, { opacity: 1, y: 0 });

            /* brand sort vite */
            tl.to(line, { width: 0, duration: 0.2, ease: "power3.in" }, 0);
            tl.to(brand, { opacity: 0, duration: 0.18, ease: "power2.in" }, 0);

            /* demi-écrans se rétractent */
            tl.to([top, bot], { scaleY: 0, duration: 0.5 }, 0.05);

            return tl;
          },
        },
      ],
      views: [
        {
          namespace: "home",
          beforeEnter() {
            document.body.classList.remove("page-profile", "page-experts", "page-presse");
          },
        },
        {
          namespace: "profile",
          beforeEnter() {
            document.body.classList.add("page-profile");
            document.body.classList.remove("page-experts", "page-presse");
          },
        },
        {
          namespace: "experts",
          beforeEnter() {
            document.body.classList.add("page-profile", "page-experts");
            document.body.classList.remove("page-presse");
          },
        },
        {
          namespace: "presse",
          beforeEnter() {
            document.body.classList.add("page-profile", "page-presse");
            document.body.classList.remove("page-experts");
          },
        },
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
