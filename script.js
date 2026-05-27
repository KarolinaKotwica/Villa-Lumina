/**
 * VILLA LUMINA — Immersive Property Website
 * script.js
 *
 * Stack:
 *  - Lenis      → ultra-smooth scroll
 *  - GSAP       → animation engine
 *  - ScrollTrigger (GSAP plugin) → scroll-driven triggers
 *  - Canvas API → image sequence (scroll → klatka po klatce)
 *
 * ══════════════════════════════════════════════════════════
 * JAK PODMIENIĆ NA WŁASNE KLATKI (po pobraniu wideo z Pexels):
 *
 *  1. Pobierz wideo z drona, zapisz jako drone.mp4
 *  2. W terminalu: ffmpeg -i drone.mp4 -vf "fps=12,scale=1920:1080" assets/frames-drone/frame_%03d.jpg
 *  3. Zmień DRONE_USE_FRAMES = true  (linia ~60)
 *  4. Zaktualizuj DRONE_FRAME_COUNT na rzeczywistą liczbę klatek
 *  5. Tak samo dla garden (GARDEN_USE_FRAMES)
 * ══════════════════════════════════════════════════════════
 */

'use strict';

/* ──────────────────────────────────────────────
   KONFIGURACJA — zmień tutaj swoje ustawienia
─────────────────────────────────────────────── */

// Tryb demo: false = używa zdjęć Unsplash (crossfade)
// Tryb produkcja: true = używa Twoich klatek JPG z assets/frames-*
const DRONE_USE_FRAMES  = false;
const GARDEN_USE_FRAMES = false;

// Liczba klatek (ważne gdy USE_FRAMES = true)
const DRONE_FRAME_COUNT  = 120;
const GARDEN_FRAME_COUNT = 80;

// ═══════════════════════════════════════════════════════
//  ZDJĘCIA — spójny zestaw, jedna narracja:
//  🚁 przelot → 🏠 willa → 🌊 plaża → 🌅 wieczór → 🛋️ wnętrze
// ═══════════════════════════════════════════════════════

// DRONE SEQUENCE: podejście z powietrza → lądowanie przy willi
const DRONE_DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1920&q=80', // 1 — szeroki lot ptaka (daleko)
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1920&q=80', // 2 — bliżej, widać basen
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80', // 3 — taras i basen willi
  'https://images.unsplash.com/photo-1549439602-43ebca2327af?w=1920&q=80', // 4 — krawędź infinity pool
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=80', // 5 — willa o zmierzchu
];

// GARDEN ARRIVAL: podejście na piechotę → wejście → wnętrze
const GARDEN_DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=80', // 1 — willa z zewnątrz (podejście)
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80', // 2 — taras z basenem (wejście)
  'https://images.unsplash.com/photo-1549439602-43ebca2327af?w=1920&q=80', // 3 — basen z bliska
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80', // 4 — wnętrze (w środku)
];

/* ──────────────────────────────────────────────
   HELPERS
─────────────────────────────────────────────── */

/** Rysuje obraz na canvas z efektem cover (jak object-fit: cover) + opcjonalny zoom */
function drawCover(ctx, img, canvas, zoom = 1.0) {
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const cw = canvas.width;
  const ch = canvas.height;

  const imgRatio    = iw / ih;
  const canvasRatio = cw / ch;

  let drawW, drawH;
  if (imgRatio > canvasRatio) {
    // Obraz szerszy — dopasuj do wysokości
    drawH = ch * zoom;
    drawW = drawH * imgRatio;
  } else {
    // Obraz wyższy — dopasuj do szerokości
    drawW = cw * zoom;
    drawH = drawW / imgRatio;
  }

  const x = (cw - drawW) / 2;
  const y = (ch - drawH) / 2;

  ctx.drawImage(img, x, y, drawW, drawH);
}

/** Wczytuje tablicę URL-i → zwraca Promise<Image[]> */
function preloadImages(urls) {
  return Promise.all(
    urls.map(url => new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => resolve(img);
      img.onerror = () => {
        // Fallback: zwróć pusty obiekt — canvas pokaże gradient
        console.warn('Image failed to load:', url);
        resolve(null);
      };
      img.src = url;
    }))
  );
}

/** Wczytuje sekwencję klatek JPG z folderu */
function preloadFrames(folder, count) {
  const urls = [];
  for (let i = 1; i <= count; i++) {
    urls.push(`assets/${folder}/frame_${String(i).padStart(3, '0')}.jpg`);
  }
  return preloadImages(urls);
}

/** Renderuje crossfade między obrazami na podstawie progress 0→1 */
function renderCrossfade(ctx, canvas, images, progress, zoom = 1.0) {
  const validImages = images.filter(Boolean);
  if (validImages.length === 0) {
    // Fallback: gradient
    const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, '#1a2a1a');
    grd.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  if (validImages.length === 1) {
    drawCover(ctx, validImages[0], canvas, zoom);
    return;
  }

  const totalTransitions = validImages.length - 1;
  const scaled  = progress * totalTransitions;
  const current = Math.min(Math.floor(scaled), totalTransitions - 1);
  const next    = current + 1;
  const blend   = scaled - current;

  // Rysuj bieżący obraz
  ctx.globalAlpha = 1;
  drawCover(ctx, validImages[current], canvas, zoom);

  // Nałóż następny z alpha = blend (crossfade)
  if (blend > 0 && validImages[next]) {
    ctx.globalAlpha = blend;
    drawCover(ctx, validImages[next], canvas, zoom);
  }

  ctx.globalAlpha = 1;
}

/** Renderuje konkretną klatkę z sekwencji */
function renderFrame(ctx, canvas, frames, progress) {
  const validFrames = frames.filter(Boolean);
  if (validFrames.length === 0) return;

  const index = Math.min(
    Math.floor(progress * validFrames.length),
    validFrames.length - 1
  );

  ctx.globalAlpha = 1;
  drawCover(ctx, validFrames[index], canvas, 1.0);
}

/* ──────────────────────────────────────────────
   RESIZE CANVAS
─────────────────────────────────────────────── */
function resizeCanvas(canvas) {
  canvas.width  = window.innerWidth  * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width  = '100%';
  canvas.style.height = '100%';
}

/* ──────────────────────────────────────────────
   INICJALIZACJA LENIS (smooth scroll)
─────────────────────────────────────────────── */
function initLenis() {
  const lenis = new Lenis({
    lerp: 0.08,
    smoothWheel: true,
    syncTouch: false,
  });

  // Łączymy Lenis z GSAP ticker (synchronizacja)
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

/* ──────────────────────────────────────────────
   SEKCJA HERO — animacje wejścia
─────────────────────────────────────────────── */
function initHero() {
  // Animacja tekstu przy załadowaniu
  const heroLabel = document.querySelector('.hero-label');
  const heroTitle = document.querySelector('.hero-title');
  const heroSub   = document.querySelector('.hero-sub');

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.to(heroLabel, { opacity: 1, y: 0, duration: 1.0, delay: 0.3 })
    .to(heroTitle,  { opacity: 1, y: 0, duration: 1.2 }, '-=0.7')
    .to(heroSub,    { opacity: 1, y: 0, duration: 1.0 }, '-=0.8');

  // Parallax na hero-bg przy scrollu
  gsap.to('#hero-bg', {
    yPercent: 25,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    }
  });
}

/* ──────────────────────────────────────────────
   CANVAS SEQUENCE — DRONE
─────────────────────────────────────────────── */
async function initDroneSequence() {
  const canvas  = document.getElementById('drone-canvas');
  const loading = document.getElementById('drone-loading');
  const progBar = document.getElementById('drone-progress-bar');
  const ctx     = canvas.getContext('2d');

  if (!canvas || !ctx) return;

  resizeCanvas(canvas);
  window.addEventListener('resize', () => resizeCanvas(canvas));

  // Wczytaj obrazy/klatki
  let images;
  if (DRONE_USE_FRAMES) {
    images = await preloadFrames('frames-drone', DRONE_FRAME_COUNT);
  } else {
    images = await preloadImages(DRONE_DEMO_IMAGES);
  }

  // Ukryj loading indicator
  loading.classList.add('hidden');

  // Rysuj pierwszą klatkę od razu
  renderCrossfade(ctx, canvas, images, 0, 1.0);

  // Tekst sekcji (zmienia się przy scrollu)
  const seqTexts = document.querySelectorAll('#drone-section .seq-text');

  // ScrollTrigger — sync canvas z scrollem
  ScrollTrigger.create({
    trigger: '#drone-section',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.5,
    onUpdate: (self) => {
      const p = self.progress; // 0 → 1

      // Delikatny zoom (1.0 → 1.25) w miarę scrollowania
      const zoom = 1.0 + (p * 0.25);

      if (DRONE_USE_FRAMES) {
        renderFrame(ctx, canvas, images, p);
      } else {
        renderCrossfade(ctx, canvas, images, p, zoom);
      }

      // Pasek postępu
      if (progBar) progBar.style.width = (p * 100) + '%';

      // Zmiana tekstu przy różnych etapach
      if (seqTexts.length >= 3) {
        if (p < 0.33) {
          showSeqText(seqTexts, 0);
        } else if (p < 0.66) {
          showSeqText(seqTexts, 1);
        } else {
          showSeqText(seqTexts, 2);
        }
      }
    }
  });
}

/** Pokazuje tekst [index] i ukrywa pozostałe */
function showSeqText(texts, activeIndex) {
  texts.forEach((el, i) => {
    if (i === activeIndex) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

/* ──────────────────────────────────────────────
   SEKCJA OVERHEAD — SVG Adnotacje
─────────────────────────────────────────────── */
function initOverheadSection() {
  const section = document.getElementById('overhead-section');
  if (!section) return;

  // Pobierz wszystkie linie SVG
  const lines  = section.querySelectorAll('.annotation-line');
  const labels = section.querySelectorAll('.ann-label');

  // Ustaw stroke-dasharray/offset na każdej linii
  lines.forEach(line => {
    const len = line.getTotalLength ? line.getTotalLength() : 150;
    line.style.strokeDasharray  = len;
    line.style.strokeDashoffset = len;
  });

  // ScrollTrigger: animuj linie gdy sekcja wchodzi na ekran
  ScrollTrigger.create({
    trigger: '#overhead-section',
    start: 'top 70%',
    once: true,
    onEnter: () => {
      // Linie rysują się jedna po drugiej
      gsap.to(lines, {
        strokeDashoffset: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power2.out',
      });

      // Etykiety pojawiają się po liniach
      setTimeout(() => {
        labels.forEach((label, i) => {
          setTimeout(() => {
            label.classList.add('visible');
          }, i * 120);
        });
      }, 600);
    }
  });

  // Animacja elementów tekstowych po lewej
  animateOnScroll('.overhead-copy .anim-item', '#overhead-section');
  animateOnScroll('.overhead-tabs .anim-item', '#overhead-section');

  // Inicjalizacja tabów BEACH / VILLA / CENOTE
  initOverheadTabs();
}

/* ──────────────────────────────────────────────
   OVERHEAD TABS — klikalne zakładki ze zmianą zdjęcia
─────────────────────────────────────────────── */
function initOverheadTabs() {
  const tabs   = document.querySelectorAll('.overhead-tab');
  const images = document.querySelectorAll('.map-img');

  if (!tabs.length || !images.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab; // 'beach' | 'villa' | 'cenote'

      // ─ Zakładki: usuń active ze wszystkich, dodaj do klikniętej
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // ─ Zdjęcia: ukryj wszystkie, pokaż odpowiednie
      images.forEach(img => {
        if (img.dataset.img === target) {
          img.classList.add('active');
        } else {
          img.classList.remove('active');
        }
      });
    });
  });
}

/* ──────────────────────────────────────────────
   CANVAS SEQUENCE — GARDEN
─────────────────────────────────────────────── */
async function initGardenSequence() {
  const canvas  = document.getElementById('garden-canvas');
  const loading = document.getElementById('garden-loading');
  const progBar = document.getElementById('garden-progress-bar');
  const ctx     = canvas ? canvas.getContext('2d') : null;

  if (!canvas || !ctx) return;

  resizeCanvas(canvas);
  window.addEventListener('resize', () => resizeCanvas(canvas));

  let images;
  if (GARDEN_USE_FRAMES) {
    images = await preloadFrames('frames-garden', GARDEN_FRAME_COUNT);
  } else {
    images = await preloadImages(GARDEN_DEMO_IMAGES);
  }

  loading.classList.add('hidden');
  renderCrossfade(ctx, canvas, images, 0, 1.0);

  ScrollTrigger.create({
    trigger: '#garden-section',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.5,
    onUpdate: (self) => {
      const p = self.progress;
      const zoom = 1.0 + (p * 0.2);

      if (GARDEN_USE_FRAMES) {
        renderFrame(ctx, canvas, images, p);
      } else {
        renderCrossfade(ctx, canvas, images, p, zoom);
      }

      if (progBar) progBar.style.width = (p * 100) + '%';

      // Tekst stopniowo zanika przy końcu sekwencji
      const gardenHeading = document.getElementById('garden-heading');
      const gardenLabel   = document.getElementById('garden-label');
      const gardenDesc    = document.getElementById('garden-desc');

      if (gardenHeading && gardenLabel) {
        const opacity = p < 0.7 ? 1 : 1 - ((p - 0.7) / 0.3);
        gardenHeading.style.opacity = opacity;
        gardenLabel.style.opacity   = opacity;
        if (gardenDesc) gardenDesc.style.opacity = opacity;
      }
    }
  });
}

/* ──────────────────────────────────────────────
   GALERIA — animacje przy scrollu
─────────────────────────────────────────────── */
function initGallery() {
  animateOnScroll('#gallery .anim-item', '#gallery');
  animateOnScroll('#gallery .gallery-item', '#gallery');
}

/* ──────────────────────────────────────────────
   KONTAKT — animacje
─────────────────────────────────────────────── */
function initContact() {
  animateOnScroll('#contact .anim-item', '#contact');
}

/* ──────────────────────────────────────────────
   HELPER: animuj elementy gdy wchodzą w viewport
─────────────────────────────────────────────── */
function animateOnScroll(selector, triggerSelector) {
  const elements = document.querySelectorAll(selector);
  if (!elements.length) return;

  elements.forEach((el, i) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        setTimeout(() => {
          el.classList.add('visible');
        }, i * 80);
      }
    });
  });
}

/* ──────────────────────────────────────────────
   NAWIGACJA — scroll behavior
─────────────────────────────────────────────── */
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  ScrollTrigger.create({
    start: 'top -80px',
    end: 'max',
    onUpdate: (self) => {
      if (self.scroll() > 80) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }
  });

  // Smooth scroll dla linków nawigacji
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/* ──────────────────────────────────────────────
   FORM — submit handler
─────────────────────────────────────────────── */
function initForm() {
  const form = document.querySelector('.contact-form');
  const btn  = document.querySelector('.submit-btn');
  if (!form || !btn) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    btn.querySelector('span').textContent = 'INQUIRY SENT ✓';
    btn.style.borderColor = 'rgba(200,169,122,0.8)';
    btn.style.color = 'rgba(200,169,122,0.9)';
    setTimeout(() => {
      btn.querySelector('span').textContent = 'SEND INQUIRY';
      btn.style.borderColor = '';
      btn.style.color = '';
    }, 4000);
  });
}

/* ──────────────────────────────────────────────
   CURSOR PERSONALIZZATO (sottile punto)
─────────────────────────────────────────────── */
function initCustomCursor() {
  // Solo su desktop
  if ('ontouchstart' in window) return;

  const cursor = document.createElement('div');
  cursor.id = 'custom-cursor';
  cursor.style.cssText = `
    position: fixed;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(240,235,228,0.9);
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: transform 0.15s, width 0.3s, height 0.3s, opacity 0.3s;
    mix-blend-mode: difference;
  `;
  document.body.appendChild(cursor);

  const ring = document.createElement('div');
  ring.id = 'cursor-ring';
  ring.style.cssText = `
    position: fixed;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid rgba(240,235,228,0.4);
    pointer-events: none;
    z-index: 9998;
    transform: translate(-50%, -50%);
    transition: transform 0.4s cubic-bezier(0.16,1,0.3,1),
                width 0.3s, height 0.3s, opacity 0.3s;
  `;
  document.body.appendChild(ring);

  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top  = mouseY + 'px';
  });

  // Ring con ritardo
  function animateRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';
    requestAnimationFrame(animateRing);
  }
  animateRing();

  // Hover links/buttons
  document.querySelectorAll('a, button, .gallery-item').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(2.5)';
      ring.style.width  = '48px';
      ring.style.height = '48px';
      ring.style.borderColor = 'rgba(240,235,228,0.7)';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(1)';
      ring.style.width  = '32px';
      ring.style.height = '32px';
      ring.style.borderColor = 'rgba(240,235,228,0.4)';
    });
  });
}

/* ──────────────────────────────────────────────
   SEKCJA OVERHEAD — animacje generyczne
─────────────────────────────────────────────── */
function initSectionAnimations() {
  // Tutti gli .anim-item nel sito
  document.querySelectorAll('.anim-item').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => el.classList.add('visible'),
    });
  });
}

/* ──────────────────────────────────────────────
   MAIN — wszystko startuje tutaj
─────────────────────────────────────────────── */
async function main() {
  // Zarejestruj ScrollTrigger plugin
  gsap.registerPlugin(ScrollTrigger);

  // Smooth scroll (Lenis)
  initLenis();

  // Nawigacja
  initNav();

  // Hero
  initHero();

  // Canvas sequences (asynchroniczne — ładowanie obrazów)
  initDroneSequence();   // nie await — żeby nie blokować reszty
  initGardenSequence();  // nie await

  // Overhead annotations
  initOverheadSection();

  // Galeria + kontakt
  initSectionAnimations();
  initForm();

  // Rok w stopce — zawsze aktualny
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Kursor (opcjonalne, tylko desktop)
  initCustomCursor();

  // Odśwież ScrollTrigger po załadowaniu całej strony
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });
}

// Uruchom gdy DOM gotowy
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
