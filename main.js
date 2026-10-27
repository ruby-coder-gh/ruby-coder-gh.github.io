const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const html = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const EMAIL = 'nikunjpatel23703@gmail.com';
const LINKS = {
  github: 'https://github.com/ruby-coder-gh',
  linkedin: 'https://www.linkedin.com/in/nikunj-vaghasiya-9b84a5290',
  email: `mailto:${EMAIL}`,
  live: 'https://iso27001-readiness.vercel.app',
};

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v === '1'; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value ? '1' : '0'); } catch {}
  },
};

/* ---------- sound: every effect is synthesized with Web Audio, no audio files ---------- */
const sfx = (() => {
  let ctx, master, noiseBuf, bgm = null, lastHover = 0;
  let on = store.get('nv-sfx', true);
  let bgmOn = store.get('nv-bgm', true);

  function unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      document.addEventListener('visibilitychange', () => (document.hidden ? ctx.suspend() : ctx.resume()));
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function env(g, t, vol, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(dest, { type = 'sine', f = 880, f2, dur = 0.08, vol = 0.2, at = 0 }) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, vol, dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function hiss(dest, { dur = 0.1, vol = 0.2, type = 'bandpass', f = 2000, f2, q = 1, at = 0 }) {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    fl.type = type;
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, vol, dur);
    s.connect(fl).connect(g).connect(dest);
    s.start(t, Math.random() * 0.4);
    s.stop(t + dur + 0.05);
  }

  const sounds = {
    hover: () => tone(master, { type: 'square', f: 1900, f2: 2600, dur: 0.035, vol: 0.025 }),
    click: () => {
      tone(master, { type: 'square', f: 950, f2: 260, dur: 0.07, vol: 0.07 });
      hiss(master, { dur: 0.03, vol: 0.12, f: 4200, q: 0.7 });
    },
    key: () => hiss(master, { dur: 0.022, vol: 0.09, f: 2600 + Math.random() * 2400, q: 2 }),
    glitch: () => {
      for (let i = 0; i < 6; i++) tone(master, { type: 'square', f: 180 + Math.random() * 1900, dur: 0.024, vol: 0.045, at: i * 0.022 });
      hiss(master, { dur: 0.14, vol: 0.05, type: 'highpass', f: 3200 });
    },
    whoosh: () => hiss(master, { dur: 0.6, vol: 0.38, f: 260, f2: 3400, q: 0.8 }),
    slash: () => {
      hiss(master, { dur: 0.2, vol: 0.45, type: 'highpass', f: 7000, f2: 1400, q: 0.6 });
      tone(master, { type: 'sine', f: 3300, f2: 2500, dur: 0.55, vol: 0.06, at: 0.02 });
      tone(master, { type: 'triangle', f: 4400, dur: 0.35, vol: 0.03, at: 0.02 });
    },
    dock: () => {
      tone(master, { type: 'sine', f: 150, f2: 55, dur: 0.28, vol: 0.45 });
      hiss(master, { dur: 0.05, vol: 0.2, f: 1300 });
      tone(master, { type: 'square', f: 1250, dur: 0.04, vol: 0.05, at: 0.07 });
    },
    granted: () => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(master, { type: 'triangle', f, dur: 0.24, vol: 0.12, at: i * 0.09 }));
      tone(master, { type: 'sine', f: 95, f2: 42, dur: 0.7, vol: 0.38 });
    },
    error: () => tone(master, { type: 'sawtooth', f: 180, f2: 90, dur: 0.22, vol: 0.08 }),
    open: () => hiss(master, { dur: 0.32, vol: 0.2, f: 500, f2: 4200, q: 1.2 }),
    close: () => hiss(master, { dur: 0.26, vol: 0.16, f: 4200, f2: 450, q: 1.2 }),
  };

  // ambient synthwave loop: detuned saw drone + triangle arpeggio + soft kick and hat
  function startBgm() {
    if (bgm || !ctx || !bgmOn) return;
    const out = ctx.createGain(), now = ctx.currentTime;
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(0.2, now + 3);
    out.connect(master);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    lp.Q.value = 4;
    lp.connect(out);
    const pad = [55, 55.3, 82.41].map(f => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      g.gain.value = 0.18;
      o.connect(g).connect(lp);
      o.start();
      return o;
    });
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 0.07;
    depth.gain.value = 220;
    lfo.connect(depth).connect(lp.frequency);
    lfo.start();
    const A = [220, 0, 261.63, 329.63, 0, 392, 329.63, 0, 220, 0, 261.63, 329.63, 0, 440, 392, 0];
    const F = [174.61, 0, 220, 261.63, 0, 349.23, 261.63, 0, 196, 0, 246.94, 293.66, 0, 392, 293.66, 0];
    const STEP = 0.2;
    let step = 0, next = ctx.currentTime + 0.2;
    const timer = setInterval(() => {
      while (next < ctx.currentTime + 0.4) {
        const at = Math.max(0, next - ctx.currentTime);
        const f = (step % 32 < 16 ? A : F)[step % 16];
        if (f) tone(out, { type: 'triangle', f, dur: 0.18, vol: 0.09, at });
        if (step % 8 === 0) tone(out, { type: 'sine', f: 110, f2: 40, dur: 0.35, vol: 0.5, at });
        if (step % 8 === 4) hiss(out, { dur: 0.05, vol: 0.05, type: 'highpass', f: 7000, at });
        next += STEP;
        step++;
      }
    }, 100);
    bgm = {
      stop() {
        clearInterval(timer);
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(out.gain.value, t);
        out.gain.linearRampToValueAtTime(0, t + 0.6);
        setTimeout(() => { pad.forEach(o => o.stop()); lfo.stop(); out.disconnect(); }, 700);
      },
    };
  }

  return {
    unlock,
    startBgm,
    get on() { return on; },
    get bgmOn() { return bgmOn; },
    play(name) {
      if (!on || !ctx) return;
      if (name === 'hover') {
        const n = performance.now();
        if (n - lastHover < 60) return;
        lastHover = n;
      }
      sounds[name]?.();
    },
    setSfx(v) { on = v; store.set('nv-sfx', v); },
    setBgm(v) {
      bgmOn = v;
      store.set('nv-bgm', v);
      if (v) { unlock(); startBgm(); } else if (bgm) { bgm.stop(); bgm = null; }
    },
  };
})();

const sfxBtn = $('#sfx-btn'), bgmBtn = $('#bgm-btn');
function syncAudioButtons() {
  sfxBtn.setAttribute('aria-pressed', sfx.on);
  bgmBtn.setAttribute('aria-pressed', sfx.bgmOn);
}
syncAudioButtons();
sfxBtn.addEventListener('click', () => { sfx.setSfx(!sfx.on); syncAudioButtons(); });
bgmBtn.addEventListener('click', () => { sfx.setBgm(!sfx.bgmOn); syncAudioButtons(); });

/* ---------- clock (India time, to match the location tag) ---------- */
const clock = $('#clock');
const tick = () => (clock.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }));
tick();
setInterval(tick, 1000);

/* ---------- enter gate ---------- */
const gate = $('#gate'), main = $('#main'), nav = $('#nav');
let entered = false;
main.inert = nav.inert = true;

function enter() {
  if (entered) return;
  entered = true;
  sfx.unlock();
  sfx.play('click');
  gate.classList.add('booting');
  const lines = ['> handshake ......... ok', '> neural kernel ..... loaded', '> honeypots ......... armed', '> soc agents ........ 3/3 online', '> identity .......... verified', '', 'ACCESS GRANTED'];
  const log = $('#gate-log');
  let i = 0;
  const step = () => {
    if (i < lines.length) {
      log.textContent += lines[i++] + '\n';
      sfx.play('key');
      setTimeout(step, reduce ? 0 : 120);
      return;
    }
    sfx.play('granted');
    setTimeout(leave, reduce ? 0 : 500);
  };
  step();
}

function leave() {
  gate.classList.add('leaving');
  setTimeout(() => {
    gate.remove();
    main.inert = nav.inert = false;
    html.classList.add('entered');
    sfx.startBgm();
    setTimeout(slash, reduce ? 0 : 1200);
  }, reduce ? 0 : 750);
}

gate.addEventListener('click', enter);
addEventListener('keydown', e => {
  if (!entered && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); enter(); }
});
$('#enter-btn').focus();

/* ---------- chakri: flies in, slashes the name, docks by the logo ---------- */
const heroName = $('#hero-name'), dock = $('#dock'), chakri = $('#chakri');
let slashing = false;

function slash() {
  if (slashing) return;
  const r = heroName.getBoundingClientRect(), d = dock.getBoundingClientRect();
  // no flight when motion is reduced or the name is off-screen (e.g. landing on #contact)
  if (reduce || r.bottom < 0 || r.top > innerHeight) { heroName.classList.add('sliced'); dock.classList.add('on'); return; }
  slashing = true;
  heroName.classList.remove('sliced');
  dock.classList.remove('on');
  const y = r.top + r.height * 0.515;
  const pos = (x, py, s = 1) => `translate(${x}px, ${py}px) scale(${s})`;
  chakri.style.opacity = 1;
  sfx.play('whoosh');
  const anim = chakri.animate([
    { transform: pos(-90, r.top - 200, 0.6), offset: 0, easing: 'ease-in' },
    { transform: pos(r.left - 40, y + r.height * 0.06), offset: 0.34, easing: 'linear' },
    { transform: pos(r.right + 40, y - r.height * 0.06), offset: 0.54, easing: 'ease-out' },
    { transform: pos(r.right + 140, r.top - 80, 0.8), offset: 0.72, easing: 'ease-in-out' },
    { transform: pos(d.left + d.width / 2, d.top + d.height / 2, 0.4), offset: 1 },
  ], { duration: 1700, fill: 'forwards' });

  const trail = setInterval(() => {
    const m = new DOMMatrix(getComputedStyle(chakri).transform);
    const dot = document.createElement('i');
    dot.className = 'trail';
    dot.style.transform = `translate(${m.e}px, ${m.f}px)`;
    document.body.append(dot);
    setTimeout(() => dot.remove(), 560);
  }, 22);
  setTimeout(() => { sfx.play('slash'); heroName.classList.add('sliced'); }, 1700 * 0.36);

  anim.finished.then(() => {
    clearInterval(trail);
    chakri.style.opacity = 0;
    anim.cancel();
    dock.classList.add('on');
    sfx.play('dock');
    slashing = false;
  });
}
heroName.addEventListener('click', () => { sfx.play('glitch'); slash(); });

/* ---------- custom cursor + hover/click sounds ---------- */
const ring = $('.cursor-ring'), cdot = $('.cursor-dot');
if (finePointer) {
  html.classList.add('has-cursor');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  addEventListener('pointermove', e => {
    x = e.clientX;
    y = e.clientY;
    cdot.style.transform = `translate(${x}px, ${y}px)`;
  });
  (function follow() {
    rx += (x - rx) * (reduce ? 1 : 0.18);
    ry += (y - ry) * (reduce ? 1 : 0.18);
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(follow);
  })();
}
const HOT = 'a, button, input, .hero-name, .hero-photo, .skill-card, .proj';
let lastHot = null;
document.addEventListener('pointerover', e => {
  const hot = e.target.closest(HOT);
  if (hot === lastHot) return;
  lastHot = hot;
  ring.classList.toggle('hot', !!hot);
  if (hot && e.pointerType === 'mouse') sfx.play(hot.matches('.hero-name, .hero-photo, .classified') ? 'glitch' : 'hover');
});
document.addEventListener('click', e => {
  if (entered && e.target.closest('a, button')) sfx.play('click');
});

/* hero photo drifts slightly against the mouse */
const photo = $('#hero-photo');
if (finePointer && !reduce) {
  $('.hero').addEventListener('pointermove', e => {
    const px = e.clientX / innerWidth - 0.5, py = e.clientY / innerHeight - 0.5;
    photo.style.transform = `translate(${px * -16}px, ${py * -10}px)`;
  });
}

/* ---------- fullscreen menu ---------- */
const menu = $('#menu'), menuBtn = $('#menu-btn');
menu.inert = true;
function setMenu(open) {
  menu.classList.toggle('open', open);
  menu.inert = !open;
  menuBtn.setAttribute('aria-expanded', open);
  document.body.style.overflow = open ? 'hidden' : '';
  sfx.play(open ? 'open' : 'close');
  if (open) $('.menu-links a', menu).focus();
  else menuBtn.focus({ preventScroll: true });
}
menuBtn.addEventListener('click', () => setMenu(true));
$('#menu-close').addEventListener('click', () => setMenu(false));
menu.addEventListener('click', e => { if (e.target.closest('a[href^="#"]')) setMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });

/* ---------- nav turns black over lime sections ---------- */
const overLime = new Set();
const limeObserver = new IntersectionObserver(entries => {
  for (const e of entries) e.isIntersecting ? overLime.add(e.target) : overLime.delete(e.target);
  nav.classList.toggle('on-lime', overLime.size > 0);
}, { rootMargin: '0px 0px -92% 0px' });
$$('.lime-sec').forEach(s => limeObserver.observe(s));

/* ---------- manifesto: words light up as you scroll ---------- */
const reveal = $('#reveal'), manifesto = $('.manifesto'), words = [];
for (const node of [...reveal.childNodes]) {
  const highlight = node.nodeType === 1;
  const frag = document.createDocumentFragment();
  for (const part of node.textContent.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) { frag.append(part); continue; }
    const w = document.createElement('span');
    w.className = highlight ? 'w hl' : 'w';
    w.textContent = part;
    frag.append(w);
    words.push(w);
  }
  node.replaceWith(frag);
}
let litCount = -1;
function updateWords() {
  if (reduce) return;
  const r = manifesto.getBoundingClientRect(), vh = innerHeight;
  const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / (r.height - vh * 0.4)));
  const n = Math.round(p * 1.1 * words.length);
  if (n === litCount) return;
  litCount = n;
  words.forEach((w, i) => w.classList.toggle('lit', i < n));
}

/* ---------- scroll rail, car and speedometer ---------- */
const rail = $('.rail'), fill = $('#rail-fill'), car = $('#rail-car'), speedo = $('#speedo'), kmh = $('#kmh'), drs = $('#drs');
let lastY = scrollY, lastT = performance.now(), speed = 0, shownKmh = -1;
function frame(now) {
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(1, scrollY / max) : 0;
  fill.style.transform = `scaleY(${p})`;
  const carY = p * (rail.clientHeight - car.offsetHeight);
  car.style.transform = `translateY(${carY}px)`;
  // readout rides under the car, flipping above it near the bottom of the rail
  const below = carY + car.offsetHeight + 6;
  speedo.style.transform = `translateY(${below + speedo.offsetHeight < rail.clientHeight ? below : carY - speedo.offsetHeight - 6}px)`;
  const dt = now - lastT;
  if (dt > 0) speed += ((Math.abs(scrollY - lastY) / dt) * 1000 - speed) * 0.12;
  lastY = scrollY;
  lastT = now;
  const k = Math.round(speed * 0.1); // px per second, scaled to a believable km/h
  if (k !== shownKmh) {
    shownKmh = k;
    kmh.textContent = k;
    drs.classList.toggle('on', k > 200);
  }
  updateWords();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- reveal on scroll, identity scan, stat counters ---------- */
function scan() {
  const s = $('.scanner'), match = $('#match'), clearance = $('#clearance');
  if (s.classList.contains('scanning')) return;
  s.classList.remove('scanned');
  s.classList.add('scanning');
  clearance.textContent = 'PENDING';
  const dur = reduce ? 0 : 2200, start = performance.now();
  const step = now => {
    const k = dur ? Math.min(1, (now - start) / dur) : 1;
    match.textContent = (99.7 * k).toFixed(1) + '%';
    if (k < 1) return requestAnimationFrame(step);
    s.classList.replace('scanning', 'scanned');
    clearance.textContent = 'GRANTED';
    sfx.play('granted');
  };
  requestAnimationFrame(step);
}

function countUp(el) {
  for (const dd of $$('dd[data-n]', el)) {
    const target = +dd.dataset.n, start = performance.now();
    const step = now => {
      const k = reduce ? 1 : Math.min(1, (now - start) / 1200);
      dd.textContent = String(Math.round(target * k)).padStart(2, '0');
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

const revealObserver = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const el = e.target;
    el.classList.add('in');
    revealObserver.unobserve(el);
    if (el.matches('.scanner')) scan();
    if (el.matches('.stats, .xp')) countUp(el);
  }
}, { threshold: 0.15 });
$$('[data-reveal], .skill-card, .proj, .stats').forEach(el => revealObserver.observe(el));

/* ---------- copy email ---------- */
$('#copy-email').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(EMAIL); b.textContent = 'COPIED ✓'; }
  catch { b.textContent = 'COPY FAILED'; }
  setTimeout(() => (b.textContent = 'COPY EMAIL'), 1800);
});

/* ---------- terminal ---------- */
const out = $('#term-out'), input = $('#term-in');
const hist = [];
let hp = 0;

// project + stack data come from the page itself, so cards and terminal never drift apart
const projects = $$('.proj:not(.archive)').map(el => ({
  name: $('h3', el).textContent,
  tag: el.dataset.tag,
  desc: $('.proj-desc', el).textContent,
  repo: el.dataset.repo, // private builds have none
}));
const skills = $$('.skill-card').map(el => `${$('h3', el).textContent.padEnd(11)}${$('.badge', el).textContent}`);

function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}
const print = (text = '', className = '') => out.appendChild(el('div', { className, textContent: text }));
const cmdBtn = cmd => el('button', { type: 'button', className: 'cmd', textContent: cmd, onclick: () => { run(cmd); input.focus({ preventScroll: true }); } });
const ext = (label, href) => el('a', { href, textContent: label, target: '_blank', rel: 'noopener' });

const ABOUT = "I'm Nikunj Vaghasiya, an AI First Engineer at Groovy Web leading product for a US clinical-research platform, and an AI evaluation contributor at Snorkel AI. After hours I build where AI meets security: local-first RAG that never leaks a document, agent swarms that triage incidents, and traps that watch attackers work.";
const HELP = [
  ['whoami', 'who runs this machine'],
  ['about', 'the short version'],
  ['experience', 'where I work'],
  ['projects', 'best work, ranked'],
  ['open <n>', 'open project n on GitHub'],
  ['rag', 'the flagship RAG project'],
  ['skills', 'the arsenal'],
  ['contact', 'ways to reach me'],
  ['neofetch', 'system info'],
  ['slash', 'throw the chakri again'],
  ['sfx', 'toggle sound effects'],
  ['music', 'toggle background music'],
  ['clear', 'wipe the screen'],
];
const LOGO = `███╗   ██╗██╗   ██╗
████╗  ██║██║   ██║
██╔██╗ ██║██║   ██║
██║╚██╗██║╚██╗ ██╔╝
██║ ╚████║ ╚████╔╝
╚═╝  ╚═══╝  ╚═══╝`;

const cmds = {
  help() {
    print('available commands:', 'dim');
    for (const [c, d] of HELP) {
      const name = c.includes('<') ? el('span', { className: 'ok', textContent: c }) : cmdBtn(c);
      out.append(el('div', { className: 'help-row' }, name, el('span', { className: 'dim', textContent: d })));
    }
    print('tab completes, ↑ and ↓ walk history. a few commands are hidden.', 'dim');
  },
  whoami: () => print('guest. this machine belongs to Nikunj Vaghasiya, AI First Engineer at Groovy Web.'),
  about: () => print(ABOUT),
  projects() {
    projects.forEach((p, i) => {
      out.append(el('div', {},
        el('span', { className: 'warn', textContent: `[${i + 1}] ` }),
        el('b', { textContent: p.name }),
        el('span', { className: 'dim', textContent: `  ${p.tag}` }),
        p.repo ? '' : el('span', { className: 'err', textContent: '  [classified]' })));
      print(p.desc, 'dim indent');
    });
    out.append(el('div', {}, 'type ', cmdBtn('open 1'), ' to read the flagship source.'));
  },
  rag() {
    const p = projects[0];
    print(`${p.name}  ${p.tag}`, 'ok');
    print(p.desc);
    print('query → retrieve (bm25 + vectors) → generate (ollama) → evaluate → cited answer', 'dim');
    out.append(el('div', {}, 'source: ', ext(p.repo.replace('https://', ''), p.repo)));
  },
  open([arg = '']) {
    const a = arg.toLowerCase();
    const p = projects[Number(a) - 1] || (a && projects.find(p => p.name.toLowerCase().startsWith(a)));
    if (p && !p.repo) {
      sfx.play('error');
      return print(`open: ${p.name} is classified. the source is private, ask me for a walkthrough.`, 'err');
    }
    const url = p ? p.repo : LINKS[a];
    if (!url) {
      sfx.play('error');
      return print(arg ? `open: nothing called "${arg}". try projects.` : 'usage: open <n>  (see projects)', 'err');
    }
    print(`opening ${url}`, 'ok');
    window.open(url, '_blank', 'noopener');
  },
  experience() {
    for (const x of $$('.xp')) {
      out.append(el('div', {},
        el('span', { className: 'warn', textContent: $('.xp-when b', x).textContent.padEnd(17) }),
        el('b', { textContent: $('h3', x).textContent })));
      print($('.xp-role', x).textContent, 'dim indent');
    }
    for (const c of $$('.edu-card')) print(`${$('h3', c).textContent}, ${$('p', c).textContent}`, 'ok');
  },
  skills() {
    skills.forEach(s => print(s));
    print('also: ' + $$('.marquee-track span:not([aria-hidden])').map(s => s.textContent.toLowerCase()).join(', '), 'dim');
  },
  contact() {
    out.append(el('div', {}, 'email     ', ext(EMAIL, LINKS.email)));
    out.append(el('div', {}, 'github    ', ext('github.com/ruby-coder-gh', LINKS.github)));
    out.append(el('div', {}, 'linkedin  ', ext('in/nikunj-vaghasiya', LINKS.linkedin)));
  },
  github: () => cmds.open(['github']),
  linkedin: () => cmds.open(['linkedin']),
  email: () => cmds.open(['email']),
  neofetch() {
    const info = [
      ['', 'guest@nikunj'],
      ['os', 'NV-OS 2.6 cyberdeck'],
      ['host', 'Nikunj Vaghasiya'],
      ['role', 'AI First Engineer, Groovy Web'],
      ['evals', '82 accepted tasks, Snorkel AI'],
      ['shell', 'python, typescript'],
      ['agents', 'watcher, analyst, enforcer'],
      ['models', 'local via ollama'],
      ['audio', `sfx ${sfx.on ? 'on' : 'off'}, music ${sfx.bgmOn ? 'on' : 'off'}`],
    ];
    const box = el('div');
    for (const [k, v] of info) box.append(el('div', { className: 'fetch-row' }, el('span', { className: 'warn', textContent: k ? k.padEnd(8) : '' }), v));
    out.append(el('div', { className: 'fetch' }, el('pre', { textContent: LOGO, ariaHidden: 'true' }), box));
  },
  slash() {
    print('launching chakri…', 'ok');
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(slash, reduce ? 0 : 700);
  },
  sfx() {
    sfx.setSfx(!sfx.on);
    syncAudioButtons();
    print(`sound effects ${sfx.on ? 'on' : 'off'}`, 'ok');
  },
  music() {
    sfx.setBgm(!sfx.bgmOn);
    syncAudioButtons();
    print(`background music ${sfx.bgmOn ? 'on' : 'off'}`, 'ok');
  },
  menu: () => setMenu(true),
  ls: () => print('about.txt  contact.txt  experience.txt  projects/  skills.txt'),
  cat([file]) {
    const files = { 'about.txt': cmds.about, 'contact.txt': cmds.contact, 'experience.txt': cmds.experience, 'skills.txt': cmds.skills };
    if (!file) return print('cat: missing file. try ls.', 'err');
    if (/^projects\/?$/.test(file)) return print(`cat: ${file}: is a directory. try projects.`, 'err');
    Object.hasOwn(files, file) ? files[file]() : print(`cat: ${file}: no such file`, 'err');
  },
  cd: () => print('cd: guests stay in ~', 'err'),
  date: () => print(new Date().toString()),
  echo: args => print(args.join(' ')),
  history: () => hist.forEach((h, i) => print(`${String(i + 1).padStart(4)}  ${h}`)),
  sudo() { sfx.play('error'); print('guest is not in the sudoers file. this incident will be reported to SOC Swarm.', 'err'); },
  rm() { sfx.play('error'); print('rm: permission denied. nice try, the honeypot logged that.', 'err'); },
  hack() { sfx.play('glitch'); print('ACCESS DENIED. you are inside the honeypot now.', 'err'); },
  exit: () => print('there is no exit. only more projects. try projects.', 'warn'),
  clear: () => out.replaceChildren(),
};
cmds.stack = cmds.skills;
cmds.exp = cmds.work = cmds.experience;

function run(raw) {
  const line = raw.trim();
  out.append(el('div', {}, el('span', { className: 'ok', textContent: 'guest@nikunj:~$ ' }), line));
  if (line) {
    hist.push(line);
    hp = hist.length;
    const [name, ...args] = line.split(/\s+/);
    const key = name.toLowerCase();
    if (Object.hasOwn(cmds, key)) cmds[key](args);
    else { sfx.play('error'); print(`command not found: ${name}. type help.`, 'err'); }
  }
  out.scrollTop = out.scrollHeight;
}

$('#term-form').addEventListener('submit', e => {
  e.preventDefault();
  run(input.value);
  input.value = '';
});

input.addEventListener('keydown', e => {
  if (e.key.length === 1 || e.key === 'Backspace') sfx.play('key');
  if (e.key === 'ArrowUp' && hp > 0) {
    e.preventDefault();
    input.value = hist[--hp];
  } else if (e.key === 'ArrowDown' && hp < hist.length) {
    e.preventDefault();
    input.value = hist[++hp] ?? '';
  } else if (e.key === 'Tab' && input.value.trim()) {
    // only hijack Tab mid-word, so keyboard users can still tab out of an empty prompt
    e.preventDefault();
    const v = input.value.trim().toLowerCase();
    const hits = Object.keys(cmds).filter(c => c.startsWith(v));
    if (hits.length === 1) input.value = hits[0] + ' ';
    else if (hits.length) { print(hits.join('  '), 'dim'); out.scrollTop = out.scrollHeight; }
  }
});

$('.term').addEventListener('click', e => {
  if (!e.target.closest('a, button') && !getSelection().toString()) input.focus({ preventScroll: true });
});

cmds.neofetch();
out.append(el('div', {}, 'type ', cmdBtn('help'), ' or try ', cmdBtn('experience'), ', ', cmdBtn('projects'), ', ', cmdBtn('rag'), ', ', cmdBtn('contact'), '.'));
