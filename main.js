import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ---------- richiesta preventivo ---------- */
const newId = () => { const d = new Date(); const p = n => String(n).padStart(2, '0');
  return `RC-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`; };
let reqId = newId();
const form = $('#leadForm'), lfErr = $('#lfErr'), lfDone = $('#lfDone');
$('#lfId').textContent = reqId;
form.addEventListener('submit', e => {
  e.preventDefault();
  let ok = true;
  $$('[required]', form).forEach(el => {
    const bad = el.type === 'checkbox' ? !el.checked : (!el.value.trim() || (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value)));
    (el.type === 'checkbox' ? el.closest('.chk') : el).classList.toggle('bad', bad); if (bad) ok = false;
  });
  if (!ok) { lfErr.textContent = 'Completa i campi obbligatori evidenziati.'; return; }
  lfErr.textContent = '';
  const f = Object.fromEntries(new FormData(form));
  const body = [`Codice richiesta: ${reqId}`, '', `Struttura: ${f.struttura}`, `Tipologia: ${f.tipologia}`, `Città: ${f.citta || '-'}`, `Posti letto da monitorare: ${f.letti}`, '',
    `Referente: ${f.referente}`, `Ruolo: ${f.ruolo || '-'}`, `Email: ${f.email}`, `Telefono: ${f.telefono || '-'}`, `Preferenza di contatto: ${f.contatto}`, '',
    `Messaggio:`, f.messaggio || '-', '', 'Il richiedente dichiara di essere un operatore sanitario o di agire per conto di una struttura sanitaria e di aver letto l\'informativa privacy.'].join('\n');
  location.href = `mailto:info@cmtecnologie.it?subject=${encodeURIComponent('Richiesta preventivo RadarCare – ' + reqId)}&body=${encodeURIComponent(body)}`;
  $('#lfId2').textContent = reqId; lfDone.hidden = false;
});
form.addEventListener('input', e => { e.target.classList?.remove('bad'); e.target.closest?.('.chk')?.classList.remove('bad'); });
$('#lfAgain').addEventListener('click', () => { form.reset(); reqId = newId(); $('#lfId').textContent = reqId; lfDone.hidden = true; });
$('#loginForm').addEventListener('submit', e => { e.preventDefault(); $('#loginMsg').hidden = false; });

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!RM && window.Lenis) {
  lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
}
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href'); const t = id === '#top' ? document.body : $(id);
  if (!t) return; e.preventDefault();
  const y = id === '#top' ? 0 : t.getBoundingClientRect().top + scrollY - (t.classList.contains('story') ? 0 : 92);
  lenis ? lenis.scrollTo(y, { duration: 1.4 }) : scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
}));

/* ---------- reveal ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
$$('.reveal').forEach(el => io.observe(el));

/* ---------- layout / sections ---------- */
const stories = $$('.story');
let VH = innerHeight, VW = innerWidth, M = VW <= 820;
const S = {}; // section metrics
function measure() {
  VH = innerHeight; VW = innerWidth; M = VW <= 820;
  stories.forEach(s => s.style.height = (parseFloat(s.dataset.len) * VH) + 'px');
  ['top', 'parametri', 'vantaggi', 'sistema', 'reparto', 'installazione'].forEach(id => {
    const el = document.getElementById(id); const r = el.getBoundingClientRect();
    S[id] = { top: r.top + scrollY, h: el.offsetHeight, story: el.classList.contains('story') };
  });
  const st = $('.stats').getBoundingClientRect(); S.stats = { top: st.top + scrollY, h: st.height };
  buildKeys();
  buildStops();
}
// scroll position helpers
const pin = (id, p) => S[id].top + p * (S[id].h - VH);        // story: 0..1 while pinned
const flow = (id, p) => S[id].top - VH + p * (S[id].h + VH);  // normal section: 0 enters, 1 leaves
const prog = id => clamp((scrollY - S[id].top) / (S[id].h - VH));

/* ---------- presentation stops ---------- */
let STOPS = [];
const HDR = () => $('.hdr').offsetHeight;
function buildStops() {
  const top = sel => { const el = $(sel); return el.getBoundingClientRect().top + scrollY - HDR(); };
  STOPS = [0, pin('top', .82), S.stats.top + S.stats.h / 2 - VH / 2,
    ...[0, 1, 2, 3].map(i => pin('parametri', (i + .55) / 4)),
    top('#vantaggi'), pin('sistema', .22), pin('sistema', .52), pin('sistema', .9),
    top('#reparto'), pin('installazione', .3), pin('installazione', .55), pin('installazione', .9),
    top('.specs'), top('#contatti'), top('#area-clienti')].map(v => Math.round(Math.min(v, document.documentElement.scrollHeight - innerHeight))).sort((a, b) => a - b).filter((v, i, a) => !i || v - a[i - 1] > 20);
}
const pgUp = $('#pgUp'), pgDn = $('#pgDn'), pgN = $('#pgN');
let goingTo = null;
function goStop(dir) {
  const y = goingTo ?? scrollY; let target;
  if (dir > 0) target = STOPS.find(v => v > y + 8); else target = [...STOPS].reverse().find(v => v < y - 8);
  if (target == null) return; goingTo = target;
  const done = () => { goingTo = null; };
  if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 3), onComplete: done, force: true });
  else { scrollTo({ top: target, behavior: RM ? 'auto' : 'smooth' }); setTimeout(done, 900); }
}
pgUp.addEventListener('click', () => goStop(-1)); pgDn.addEventListener('click', () => goStop(1));
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea,select')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); goStop(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); goStop(-1); }
});
function updPager() {
  if (!STOPS.length) return; const y = scrollY + 8; let i = 0;
  STOPS.forEach((v, k) => { if (v <= y) i = k; });
  pgN.textContent = `${i + 1}/${STOPS.length}`;
  pgUp.disabled = scrollY < 8; pgDn.disabled = scrollY >= STOPS[STOPS.length - 1] - 8 && goingTo == null;
}

/* ---------- 3D keyframes ---------- */
const DEF = { sx: 0, sy: 0, sz: 0, ss: 1, srx: 0, sry: 0, sop: 1, rings: 0, tilt: 0,
  gx: 0, gy: -1.8, gs: 1, gry: 0, gop: 0, spread: 0, links: 0, eth: 0, wall: 0, cable: 0, wry: -.38 };
let KEYS = [];
function buildKeys() {
  const k = [];
  const add = (at, s) => k.push({ at, s });
  if (!M) {
    add(pin('top', 0),   { sx: .44, sy: -.02, ss: 1.45, srx: .16, sry: .42, tilt: 1 });
    add(pin('top', .4),  { sx: .02, sy: 0, ss: 1.85, srx: .02, sry: .05, tilt: .4 });
    add(pin('top', .64), { sx: -.44, sy: .02, ss: 1.4, srx: .06, sry: .45, rings: 1, tilt: 0 });
    add(pin('top', 1),   { sx: -.36, sy: -.05, ss: 1.3, srx: .18, sry: -.18, rings: 1 });
    add(flow('stats', .5), { sx: 0, sy: -.15, ss: 1.0, srx: .3, sry: -.9, rings: 0 });
    add(pin('parametri', 0),   { sx: .5, sy: .06, ss: 1.35, srx: .1, sry: -.55, rings: 1 });
    add(pin('parametri', .25), { sx: .48, sy: -.04, ss: 1.38, srx: .22, sry: .3 });
    add(pin('parametri', .5),  { sx: .5, sy: .05, ss: 1.33, srx: .02, sry: -.35 });
    add(pin('parametri', .75), { sx: .48, sy: -.05, ss: 1.38, srx: .22, sry: .45 });
    add(pin('parametri', 1),   { sx: .5, sy: .02, ss: 1.3, srx: .08, sry: -.15 });
    add(flow('vantaggi', .3),  { sx: .8, sy: .3, ss: .78, srx: .1, sry: -.35, rings: 0 });
    add(flow('vantaggi', .75), { sx: .8, sy: -.05, ss: .78, srx: .15, sry: .35 });
    add(pin('sistema', 0),   { sx: -.55, sy: 0, ss: .8, srx: .05, sry: .2, spread: 0, gop: 0, gy: -1.8, gx: .2 });
    add(pin('sistema', .18), { sx: -.55, sy: 0, ss: .8, sry: .1, spread: 1, gop: 0, gy: -1.6, gx: .2, gry: -1.2 });
    add(pin('sistema', .34), { spread: 1, gx: .2, gy: -.04, gs: .85, gop: 1, gry: -.45 });
    add(pin('sistema', .56), { spread: 1, links: 1, gx: .2, gy: -.04, gs: .85, gry: .1, gop: 1 });
    add(pin('sistema', .78), { spread: 1, links: 1, eth: 1, gx: .2, gy: -.04, gs: .85, gry: .45, gop: 1 });
    add(pin('sistema', 1),   { spread: 1, links: 1, eth: 1, gx: .2, gy: .02, gs: .88, gry: .95, gop: 1 });
    add(flow('reparto', .45), { spread: 0, links: 0, eth: 0, gop: 0, gy: -1.8, sx: 1.5, sy: 0, sz: 1.4, ss: 1.2, sry: -.9, srx: .1, sop: 1 });
    add(pin('installazione', .04), { sx: 1.5, sy: 0, sz: 1.4, ss: 1.2, sry: -.9, srx: .1, wall: 0 });
    add(pin('installazione', .16), { sx: 1.0, sy: 0, sz: 1.3, ss: 1.2, sry: -.8, srx: .08, wall: 1 });
    add(pin('installazione', .36), { sx: .42, sy: -.08, sz: 0, ss: 1.2, sry: -.38, wry: -.38, srx: 0, wall: 1 });
    add(pin('installazione', .6),  { sx: .42, sy: -.08, sz: 0, ss: 1.2, sry: -.3, wry: -.3, wall: 1, cable: 1 });
    add(pin('installazione', .8),  { sx: .42, sy: -.08, sz: 0, ss: 1.2, sry: -.22, wry: -.22, wall: 1, cable: 1, rings: 1 });
    add(pin('installazione', 1),   { sx: .42, sy: -.08, sz: 0, ss: 1.22, sry: -.12, wry: -.12, wall: 1, cable: 1, rings: 1 });
  } else {
    add(pin('top', 0),   { sx: 0, sy: .4, ss: .82, srx: .16, sry: .42, tilt: 1 });
    add(pin('top', .4),  { sx: 0, sy: .36, ss: 1.0, srx: .05, sry: .05, tilt: .3 });
    add(pin('top', .64), { sx: 0, sy: .55, ss: .78, srx: .08, sry: .4, rings: 1, tilt: 0 });
    add(pin('top', 1),   { sx: 0, sy: .52, ss: .74, srx: .18, sry: -.2, rings: 1 });
    add(flow('stats', .5), { sx: .9, sy: .2, ss: .6, sry: -.9, rings: 0, sop: .0 });
    add(pin('parametri', 0),   { sx: 0, sy: .5, ss: .85, srx: .12, sry: -.5, rings: 1, sop: 1 });
    add(pin('parametri', .25), { sx: 0, sy: .48, ss: .87, srx: .22, sry: .3 });
    add(pin('parametri', .5),  { sx: 0, sy: .5, ss: .85, srx: .04, sry: -.35 });
    add(pin('parametri', .75), { sx: 0, sy: .48, ss: .87, srx: .22, sry: .4 });
    add(pin('parametri', 1),   { sx: 0, sy: .5, ss: .84, srx: .08, sry: -.15 });
    add(flow('vantaggi', .25), { sx: 0, sy: 1.6, ss: .6, sop: 0, rings: 0 });
    add(pin('sistema', 0),   { sx: 0, sy: .3, ss: .6, sop: 1, spread: 0, gop: 0, gy: -1.8, gx: -.5 });
    add(pin('sistema', .18), { sx: 0, sy: .3, ss: .6, spread: 1, gop: 0, gy: -1.6, gx: -.5, gry: -1.2 });
    add(pin('sistema', .34), { spread: 1, gx: -.5, gy: -.3, gs: .36, gop: 1, gry: -.45 });
    add(pin('sistema', .56), { spread: 1, links: 1, gx: -.5, gy: -.3, gs: .36, gry: .1, gop: 1 });
    add(pin('sistema', .78), { spread: 1, links: 1, eth: 1, gx: -.5, gy: -.3, gs: .36, gry: .45, gop: 1 });
    add(pin('sistema', 1),   { spread: 1, links: 1, eth: 1, gx: -.5, gy: -.27, gs: .37, gry: .95, gop: 1 });
    add(flow('reparto', .45), { spread: 0, links: 0, eth: 0, gop: 0, gy: -1.8, sx: 1.6, sy: .42, sz: 1.4, ss: .8, sry: -.9, sop: 1 });
    add(pin('installazione', .04), { sx: 1.6, sy: .42, sz: 1.4, ss: .8, sry: -.9, wall: 0 });
    add(pin('installazione', .16), { sx: 1.1, sy: .42, sz: 1.3, ss: .8, sry: -.8, wall: 1 });
    add(pin('installazione', .36), { sx: 0, sy: .42, sz: 0, ss: .8, sry: -.38, wry: -.38, srx: 0, wall: 1 });
    add(pin('installazione', .6),  { sx: 0, sy: .42, sz: 0, ss: .8, sry: -.3, wry: -.3, wall: 1, cable: 1 });
    add(pin('installazione', .8),  { sx: 0, sy: .42, sz: 0, ss: .8, sry: -.22, wry: -.22, wall: 1, cable: 1, rings: 1 });
    add(pin('installazione', 1),   { sx: 0, sy: .42, sz: 0, ss: .81, sry: -.12, wry: -.12, wall: 1, cable: 1, rings: 1 });
  }
  // fill each key with previous values
  let prev = { ...DEF };
  KEYS = k.map(({ at, s }) => { prev = { ...prev, ...s }; return { at, s: prev }; });
}
function stateAt(y) {
  if (y <= KEYS[0].at) return KEYS[0].s;
  for (let i = 1; i < KEYS.length; i++) {
    if (y <= KEYS[i].at) {
      const a = KEYS[i - 1], b = KEYS[i]; const u = clamp((y - a.at) / Math.max(1, b.at - a.at)); const t = .55 * u + .45 * ease(u);
      const o = {}; for (const key in a.s) o[key] = lerp(a.s[key], b.s[key], t); return o;
    }
  }
  return KEYS[KEYS.length - 1].s;
}

/* ---------- three.js ---------- */
const canvas = $('#scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) { renderer = null; }
if (!renderer) document.documentElement.classList.add('no-webgl');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, VW / VH, .1, 100);
camera.position.set(0, 0, 6);
const HALF_H = Math.tan(THREE.MathUtils.degToRad(15)) * 6;

const sensor = new THREE.Group(); scene.add(sensor);
const gw = new THREE.Group(); scene.add(gw);
const clones = [];
const rings = new THREE.Group(); scene.add(rings);
const wall = new THREE.Group(); scene.add(wall);
let cable, lid, wallMesh, wallShadow, cableMat, lidMat;
let sensorMats = [], gwMats = [];
let ready = false, antenna = null; const abox = new THREE.Box3();
const DEPTH = 70 / 110; // sensor depth in normalized units

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .7;
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(-2.5, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdbe8ff, .8); rim.position.set(4, 1, -3); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9ced6, .35));

  // radar rings
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x2F6DB5, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(.985, 1, 160), ringMat.clone()); rings.add(m);
  }

  // wall + lid
  wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), new THREE.MeshStandardMaterial({ color: 0xF1F1F3, roughness: .95, transparent: true, opacity: 0 }));
  wall.add(wallMesh);
  const shTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(20,30,50,.38)'); gr.addColorStop(1, 'rgba(20,30,50,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
  wallShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, opacity: 0, depthWrite: false }));
  wallShadow.position.set(.12, -.16, .002); wall.add(wallShadow);
  lidMat = new THREE.MeshPhysicalMaterial({ color: 0xC9CDD2, roughness: .55, transparent: true, opacity: 0 });
  lid = new THREE.Mesh(new THREE.BoxGeometry(.96, .96, .05), lidMat); lid.position.z = .025; wall.add(lid);

  const loader = new GLTFLoader();
  Promise.all([loader.loadAsync('assets/models/sensor.glb'), loader.loadAsync('assets/models/gateway.glb')]).then(([sg, gg]) => {
    // sensor: normalize to width 1, centered
    const sm = sg.scene; const b = new THREE.Box3().setFromObject(sm); const sz = b.getSize(new THREE.Vector3()); const c = b.getCenter(new THREE.Vector3());
    const k = 1 / sz.x; sm.position.sub(c).multiplyScalar(k); sm.scale.setScalar(k);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xC2C7CD, roughness: .5, metalness: 0, clearcoat: .2, clearcoatRoughness: .55, sheen: .2, sheenColor: new THREE.Color(0xffffff) });
    sm.traverse(o => { if (o.isMesh) { o.material = mat; } });
    // if front faces -z, flip
    sensor.add(sm); sensorMats.push(mat);
    cableMat = new THREE.MeshStandardMaterial({ color: 0xE9EAEC, roughness: .6 });
    const cg = new THREE.CylinderGeometry(.022, .022, 1, 20); cg.translate(0, .5, 0);
    cable = new THREE.Mesh(cg, cableMat); cable.position.set(0, .5, -DEPTH * .3); cable.scale.y = .0001; sensor.add(cable);
    for (let i = 0; i < 8; i++) { const cl = sm.clone(); const g = new THREE.Group(); g.add(cl); g.visible = false; scene.add(g); clones.push(g); }

    // gateway
    const gm = gg.scene; const b2 = new THREE.Box3().setFromObject(gm); const s2 = b2.getSize(new THREE.Vector3()); const c2 = b2.getCenter(new THREE.Vector3());
    const k2 = 1.25 / s2.x; gm.position.sub(c2).multiplyScalar(k2); gm.scale.setScalar(k2);
    gm.traverse(o => { if (o.isMesh) {
      const n = o.material.name;
      if (n === 'alluminio') o.material = new THREE.MeshPhysicalMaterial({ color: 0xD9DBDF, metalness: 1, roughness: .3, clearcoat: .3 });
      else if (n === 'top') o.material = new THREE.MeshPhysicalMaterial({ color: 0xC9CCD1, metalness: .9, roughness: .42 });
      else if (n === 'nero' || n === 'sma') o.material = new THREE.MeshPhysicalMaterial({ color: n === 'sma' ? 0xB89A52 : 0x1E1F22, metalness: n === 'sma' ? 1 : 0, roughness: n === 'sma' ? .3 : .5 });
      else o.material = new THREE.MeshPhysicalMaterial({ color: 0x2A2C30, roughness: .5, metalness: .3 });
      o.material.transparent = true; gwMats.push(o.material);
    } });
    gw.add(gm);
    let best = null, bh = 0; gm.traverse(o => { if (o.isMesh) { const bb = new THREE.Box3().setFromObject(o); const hh = bb.max.y - bb.min.y; if (hh > bh) { bh = hh; best = o; } } }); antenna = best;
    ready = true; measure();
    document.documentElement.classList.add('ready');
  }).catch(err => { console.error(err); document.documentElement.classList.add('no-webgl'); });
}

/* ---------- pointer tilt ---------- */
const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => { ptr.tx = (e.clientX / VW) * 2 - 1; ptr.ty = (e.clientY / VH) * 2 - 1; }, { passive: true });

/* ---------- waves ---------- */
const waves = $$('canvas.wave').map(c => ({ c, g: c.getContext('2d'), mode: c.dataset.wave }));
function hrShape(ph) { // ph 0..1, ECG-like
  const g = (m, s, a) => a * Math.exp(-Math.pow((ph - m) / s, 2));
  return g(.18, .035, .12) - g(.36, .012, .18) + g(.4, .016, 1) - g(.44, .014, .3) + g(.68, .05, .22);
}
let seedT = 0;
function drawWave(w, t) {
  const { c, g, mode } = w; const r = c.getBoundingClientRect();
  if (r.bottom < 0 || r.top > VH || r.width === 0 || r.height === 0) return;
  const dpr = Math.min(devicePixelRatio, 2); const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  g.clearRect(0, 0, W, H);
  const grad = g.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, 'rgba(47,109,181,0)'); grad.addColorStop(.25, 'rgba(47,109,181,.9)'); grad.addColorStop(1, '#2F6DB5');
  g.strokeStyle = grad; g.lineWidth = 2 * dpr; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
  const N = 160, mid = H * .55;
  for (let i = 0; i <= N; i++) {
    const x = i / N, X = x * W; const tt = t - (1 - x) * 3.2; let y;
    if (mode === 'hr') { const ph = ((tt / .83) % 1 + 1) % 1; y = mid - hrShape(ph) * H * .42; }
    else if (mode === 'rr') { y = mid - Math.sin(tt * 2 * Math.PI / 3.75) * H * .3; }
    else if (mode === 'bed') { const ph = ((tt / 6) % 1 + 1) % 1; const up = ph < .62 ? 1 : 0; y = up ? H * .28 : H * .78; }
    else { const s = Math.sin(tt * 1.7) * .5 + .5; const burst = Math.pow(Math.max(0, Math.sin(tt * .9)), 8);
      y = mid - (Math.sin(tt * 23) * .5 + Math.sin(tt * 37 + 1) * .5) * H * (.05 + burst * .32) * (0.6 + s * .4); }
    i ? g.lineTo(X, y) : g.moveTo(X, y);
  }
  g.stroke();
  // live head
  if (mode !== 'bed') { g.fillStyle = '#1FB47F'; } else { g.fillStyle = '#2F6DB5'; }
}

/* ---------- live numbers ---------- */
const liveHR = $$('[data-live="hr"]'), liveRR = $$('[data-live="rr"]');
let hr = 72, rr = 16;
if (!RM) setInterval(() => {
  hr = clamp(Math.round(hr + (Math.random() - .5) * 3), 66, 78); rr = clamp(Math.round(rr + (Math.random() - .5) * 1.6), 14, 18);
  liveHR.forEach(e => e.textContent = hr); liveRR.forEach(e => e.textContent = rr);
}, 1600);

/* ---------- dashboard ---------- */
const beds = [
  { hr: 72, rr: 15, st: 'A letto' }, { hr: 64, rr: 13, st: 'A letto' }, { hr: 0, rr: 0, st: 'Fuori dal letto', cls: 'out' }, { hr: 80, rr: 18, st: 'A letto' },
  { hr: 69, rr: 16, st: 'A letto' }, { hr: 77, rr: 17, st: 'Agitazione', cls: 'agit' }, { hr: 61, rr: 12, st: 'A letto' }, { hr: 74, rr: 15, st: 'A letto' }];
const grid = $('#dashGrid');
beds.forEach((b, i) => {
  b.hist = Array.from({ length: 30 }, () => b.hr + (Math.random() - .5) * 4);
  const el = document.createElement('div'); el.className = 'bed';
  el.innerHTML = `<div class="bed__h">Letto ${i + 1}<span class="bed__st ${b.cls || ''}">${b.st}</span></div>
  <div class="bed__v"><div><small>FC</small><b data-hr>${b.hr || '–'}<i>bpm</i></b></div><div><small>FR</small><b data-rr>${b.rr || '–'}<i>atti/min</i></b></div></div>
  <svg viewBox="0 0 100 30" preserveAspectRatio="none"><path fill="none" stroke="${b.cls ? '#C7861F' : '#2F6DB5'}" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
  grid.appendChild(el); b.el = el; b.path = $('path', el);
});
function drawBeds() {
  beds.forEach(b => {
    if (b.hr) { b.hr = clamp(Math.round(b.hr + (Math.random() - .5) * 3), 56, 92); b.rr = clamp(Math.round(b.rr + (Math.random() - .5) * 1.4), 11, 20); }
    b.hist.push(b.cls === 'out' ? 0 : b.cls === 'agit' ? b.hr + (Math.random() - .5) * 18 : b.hr); b.hist.shift();
    if (b.hr) { $('[data-hr]', b.el).firstChild.textContent = b.hr; $('[data-rr]', b.el).firstChild.textContent = b.rr; }
    const avg = b.hist.reduce((a, v) => a + v, 0) / b.hist.length; const mn = avg - 14, mx = avg + 14;
    b.path.setAttribute('d', b.hist.map((v, i) => `${i ? 'L' : 'M'}${(i / 29 * 100).toFixed(1)},${(28 - clamp((v - mn) / (mx - mn)) * 26).toFixed(1)}`).join(' '));
  });
}
drawBeds(); if (!RM) setInterval(drawBeds, 1400);

/* ---------- DOM phases ---------- */
const phased = stories.map(s => ({ s, els: $$('[data-in]', s).map(el => ({ el, a: +el.dataset.in, b: +el.dataset.out })) }));
const params = $$('.param'), sysSteps = $$('[data-sys]'), instSteps = $$('[data-inst]');
const svg = $('#links'), ehr = $('#ehr'), tagGw = $('#tagGw'), calib = $('#calib');
const NS = 'http://www.w3.org/2000/svg';
const linkEls = Array.from({ length: 8 }, () => {
  const l = document.createElementNS(NS, 'line'); l.setAttribute('stroke', '#2F6DB5'); l.setAttribute('stroke-width', '1.6'); l.setAttribute('stroke-dasharray', '2 7'); l.setAttribute('stroke-linecap', 'round'); svg.appendChild(l);
  const p = document.createElementNS(NS, 'circle'); p.setAttribute('r', '3.5'); p.setAttribute('fill', '#1FB47F'); svg.appendChild(p);
  return { l, p };
});
const ethEl = document.createElementNS(NS, 'path'); ethEl.setAttribute('stroke', '#0E2B5C'); ethEl.setAttribute('stroke-width', '2.5'); ethEl.setAttribute('fill', 'none'); ethEl.setAttribute('stroke-linecap', 'round'); svg.appendChild(ethEl);
const ethDot = document.createElementNS(NS, 'circle'); ethDot.setAttribute('r', '4'); ethDot.setAttribute('fill', '#1FB47F'); svg.appendChild(ethDot);

function phaseDOM() {
  phased.forEach(({ s, els }) => {
    const id = s.id; if (!S[id]) return; const p = prog(id);
    els.forEach(({ el, a, b }) => {
      const o = (a < 0 ? 1 : smooth(a - .07, a + .02, p)) * (1 - smooth(b - .02, b + .07, p));
      el.style.opacity = o.toFixed(3);
      const base = el.classList.contains('hero__copy') || el.classList.contains('hero__b') ? (M ? '' : 'translateY(-50%) ') : '';
      el.style.transform = `${base}translateY(${((1 - o) * (p < a ? 24 : -24)).toFixed(1)}px)`;
      el.style.visibility = o < .01 ? 'hidden' : 'visible';
    });
  });
  const pp = prog('parametri'); const step = Math.min(3, Math.floor(pp * 4));
  params.forEach((el, i) => el.classList.toggle('on', i === step));
  const ps = prog('sistema'); const ss = ps < .3 ? 0 : ps < .66 ? 1 : 2;
  sysSteps.forEach((el, i) => el.classList.toggle('on', i === ss));
  const pi = prog('installazione'); const is = pi < .4 ? 0 : pi < .7 ? 1 : 2;
  instSteps.forEach((el, i) => el.classList.toggle('on', i === is));
}

/* ---------- render ---------- */
const v3 = new THREE.Vector3();
let CH = VH;
function toScreen(obj, oy = 0) { v3.copy(obj).project(camera); return [(v3.x + 1) / 2 * VW, (1 - v3.y) / 2 * CH - oy]; }
const grid8 = () => {
  const out = [];
  if (!M) { const xs = [-.8, -.64, -.48, -.32], ys = [.17, -.17]; ys.forEach(y => xs.forEach(x => out.push([x, y, .32]))); }
  else { const xs = [-.6, -.2, .2, .6], ys = [.3, .1]; ys.forEach(y => xs.forEach(x => out.push([x, y, .26]))); }
  return out;
};
function resize() {
  measure();
  if (!renderer) return;
  const h = canvas.clientHeight || VH; CH = h;
  renderer.setSize(VW, h, false); camera.aspect = VW / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

let t0 = performance.now();
let lastStation = null, burstAt = -1e9;
function stationId() {
  if (!S.top) return null;
  const pt = prog('top'); if (pt >= .6 && pt < 1) return 'hero';
  if (scrollY >= S.parametri.top && scrollY <= S.parametri.top + S.parametri.h - VH) return 'p' + Math.min(3, Math.floor(prog('parametri') * 4));
  const pi = prog('installazione'); if (scrollY >= S.installazione.top - 2 && pi >= .8 && pi < 1) return 'inst';
  return null;
}
function frame(now) {
  const t = RM ? 0 : (now - t0) / 1000;
  lenis?.raf(now);
  waves.forEach(w => drawWave(w, t || 1.3));
  phaseDOM();
  updPager();
  if (renderer && ready) {
    const st = stateAt(scrollY);
    let shift = 0;
    if (scrollY > S.sistema.top + S.sistema.h - VH && scrollY < S.sistema.top + S.sistema.h) shift = ehr.parentElement.getBoundingClientRect().top;
    else if (scrollY > S.installazione.top - VH && scrollY < S.installazione.top + S.installazione.h) shift = calib.parentElement.getBoundingClientRect().top;
    camera.position.y = shift / CH * 2 * HALF_H; camera.updateMatrixWorld();
    const halfW = HALF_H * camera.aspect;
    ptr.x += (ptr.tx - ptr.x) * .05; ptr.y += (ptr.ty - ptr.y) * .05;
    const fl = Math.sin(t * .9) * .012;
    // sensor
    sensor.position.set(st.sx * halfW, st.sy * HALF_H + fl * (1 - st.wall), st.sz);
    sensor.rotation.set(st.srx + ptr.y * .12 * st.tilt, st.sry + ptr.x * .25 * st.tilt, 0);
    sensor.scale.setScalar(st.ss);
    const spreadOn = st.spread > .002;
    sensor.visible = !spreadOn && st.sop > .01;
    sensorMats.forEach(m => { m.transparent = st.sop < .99; m.opacity = st.sop; });
    // clones
    const G = grid8();
    clones.forEach((c, i) => {
      c.visible = spreadOn;
      if (!spreadOn) return;
      const d = clamp(st.spread * 1.25 - i * .03);
      const e = ease(d);
      c.position.set(lerp(sensor.position.x, G[i][0] * halfW, e), lerp(sensor.position.y, G[i][1] * HALF_H, e) + Math.sin(t * .9 + i) * .008, 0);
      c.scale.setScalar(lerp(st.ss, G[i][2], e));
      c.rotation.set(.12, lerp(st.sry, .32, e), 0);
    });
    // gateway
    gw.visible = st.gop > .01;
    gw.position.set(st.gx * halfW, st.gy * HALF_H + Math.sin(t * .7) * .01, 0);
    gw.rotation.set(.2, st.gry + Math.sin(t * .35) * .04, 0); gw.scale.setScalar(st.gs);
    gwMats.forEach(m => m.opacity = st.gop);
    // rings: short pulse only when arriving at a text stop
    const sid = stationId();
    if (sid !== lastStation) { lastStation = sid; if (sid) burstAt = now; }
    const dt = (now - burstAt) / 1000;
    const canRing = st.rings > .5 && !spreadOn && sid;
    rings.visible = canRing && dt < 2.2;
    rings.position.copy(sensor.position); rings.position.z -= .05 * st.ss; rings.rotation.set(0, st.wry * st.wall, 0);
    rings.children.forEach((r, i) => {
      const ph = RM ? (i < 3 ? .2 + i * .25 : 2) : (dt - i * .28) / 1.25;
      const vis = ph >= 0 && ph <= 1;
      r.visible = vis;
      if (vis) { r.scale.setScalar(st.ss * (.62 + ph * 2.4)); r.material.opacity = Math.pow(1 - ph, 1.4) * .5 * Math.min(1, ph * 8 + .2); }
    });
    // wall
    const w = st.wall; wall.visible = w > .01;
    if (wall.visible) {
      const ry = st.wry; const dockX = (M ? 0 : .42) * halfW, dockY = (M ? .42 : -.08) * HALF_H; const ssD = M ? .8 : 1.2;
      wall.rotation.set(0, ry, 0);
      // place wall plane at sensor back (dock pose: sensor center at dock, rotated ry)
      const n = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
      wall.position.set(dockX, dockY, 0).addScaledVector(n, -DEPTH * .5 * ssD - .004);
      wallMesh.material.opacity = w; lid.scale.setScalar(ssD); lidMat.opacity = w;
      lid.visible = w > .5;
      const dockD = clamp(1 - st.sz / .3); wallShadow.material.opacity = w * dockD * .9; wallShadow.scale.setScalar(ssD);
    }
    if (cable) cable.scale.y = Math.max(.0001, st.cable * 4);
    renderer.render(scene, camera);

    // SVG links (system section)
    const sysP = prog('sistema');
    const inSys = scrollY > S.sistema.top - VH && scrollY < S.sistema.top + S.sistema.h;
    if (inSys && spreadOn) {
      const oy = 0;
      abox.setFromObject(antenna); const gwTop = new THREE.Vector3((abox.min.x + abox.max.x) / 2, lerp(abox.min.y, abox.max.y, .62), 0); const [gx, gy] = toScreen(gwTop, oy);
      linkEls.forEach((L, i) => {
        const [cx, cy] = toScreen(clones[i].position, oy);
        const lp = clamp(st.links * 1.6 - i * .08); const dx = gx - cx, dy = gy - cy, len = Math.hypot(dx, dy) || 1;
        const r0 = 40 * (VW / 1440) * (M ? 1.4 : 1) + 6, r1 = 10;
        const x0 = cx + dx / len * r0, y0 = cy + dy / len * r0, x1 = gx - dx / len * r1, y1 = gy - dy / len * r1;
        L.l.setAttribute('x1', x0); L.l.setAttribute('y1', y0);
        L.l.setAttribute('x2', lerp(x0, x1, lp)); L.l.setAttribute('y2', lerp(y0, y1, lp));
        L.l.style.opacity = lp > 0 ? .85 : 0; L.l.setAttribute('stroke-dashoffset', (-t * 18).toFixed(1));
        const k = ((t * .5 + i * .137) % 1); L.p.setAttribute('cx', lerp(x0, x1, k)); L.p.setAttribute('cy', lerp(y0, y1, k));
        L.p.style.opacity = lp >= 1 && !RM ? Math.sin(k * Math.PI) : 0;
      });
      // ethernet to EHR
      const er = ehr.getBoundingClientRect();
      abox.setFromObject(gw); const gr = new THREE.Vector3(abox.max.x - .05, lerp(abox.min.y, abox.max.y, .2), 0); const [ex, ey] = toScreen(gr, oy);
      const tx = er.left, ty = er.top + er.height * .5 - oy;
      const e = smooth(0, 1, st.eth);
      const midx = (ex + tx) / 2;
      const d = `M${ex},${ey} C${midx},${ey} ${midx},${ty} ${tx},${ty}`;
      ethEl.setAttribute('d', d);
      const L = ethEl.getTotalLength(); ethEl.style.strokeDasharray = L; ethEl.style.strokeDashoffset = L * (1 - e); ethEl.style.opacity = e > 0 ? 1 : 0;
      ehr.style.opacity = smooth(.6, 1, st.eth); ehr.style.transform = (M ? '' : 'translateY(-48%) ') + `translateX(${(1 - smooth(.6, 1, st.eth)) * 30}px)`;
      if (e >= 1 && !RM) { const k = (t * .45) % 1; const pt = ethEl.getPointAtLength(k * L); ethDot.setAttribute('cx', pt.x); ethDot.setAttribute('cy', pt.y); ethDot.style.opacity = 1; } else ethDot.style.opacity = 0;
      abox.setFromObject(gw); const ty0 = tagGw.parentElement.getBoundingClientRect().top; const [bx, by] = toScreen(new THREE.Vector3(gw.position.x, abox.min.y, .3), ty0);
      const hw = tagGw.offsetWidth / 2 + 8; tagGw.style.left = clamp(bx, hw, VW - hw) + 'px'; tagGw.style.top = (by + 14) + 'px'; tagGw.style.opacity = smooth(.35, .8, st.eth);
    } else {
      linkEls.forEach(L => { L.l.style.opacity = 0; L.p.style.opacity = 0; }); ethEl.style.opacity = 0; ethDot.style.opacity = 0;
    }
    // calibration label
    const pi = prog('installazione');
    const [sx2, sy2] = toScreen(new THREE.Vector3(sensor.position.x, sensor.position.y - .62 * st.ss, 0), calib.parentElement.getBoundingClientRect().top);
    calib.style.left = sx2 + 'px'; calib.style.top = (sy2 + 12) + 'px'; calib.style.opacity = smooth(.78, .86, pi) * (1 - smooth(.995, 1, pi));
  }
  requestAnimationFrame(frame);
}
resize();
addEventListener('load', resize);
requestAnimationFrame(frame);
