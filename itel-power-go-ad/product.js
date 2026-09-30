// Real-time 3D model of the itel Power Go (IESS-320T) portable power station,
// built from the product photos: soft white rounded body, tan carry strap riveted to
// the sides, dark port strip with a blue status LED on top, itel logo on the front.
// PBR materials lit by a studio environment map plus key / rim / sweep lights.
import * as THREE from 'three';
import { RoomEnvironment } from './lib/RoomEnvironment.js';
import { RoundedBoxGeometry } from './lib/RoundedBoxGeometry.js';

await document.fonts.load('800 100px Montserrat');

const SIZE = 1200;
const BW = 1.0, BH = 0.92, BD = 0.44, BR = 0.15; // body in scene units

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(SIZE, SIZE, false);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
camera.position.set(0, 0.42, 4.3);
camera.lookAt(0, 0.12, 0);

// ---------- textures ----------
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// micro surface noise so the plastic doesn't look like flat CG
const plasticRough = canvasTex(256, 256, (g, w, h) => {
  const r = seeded(3), id = g.createImageData(w, h);
  for (let i = 0; i < id.data.length; i += 4) { const v = 150 + r() * 40; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
}, false);
plasticRough.wrapS = plasticRough.wrapT = THREE.RepeatWrapping; plasticRough.repeat.set(4, 4);

const leatherTex = canvasTex(512, 64, (g, w, h) => {
  g.fillStyle = '#c7a07c'; g.fillRect(0, 0, w, h);
  const r = seeded(11);
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${r() > .5 ? '255,240,220' : '90,60,35'},${r() * .08})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
  g.strokeStyle = 'rgba(120,85,55,.55)'; g.lineWidth = 2; g.setLineDash([10, 7]);
  for (const y of [7, h - 7]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
});
leatherTex.wrapS = THREE.RepeatWrapping;
const leatherBump = canvasTex(256, 64, (g, w, h) => {
  const r = seeded(21), id = g.createImageData(w, h);
  for (let i = 0; i < id.data.length; i += 4) { const v = 110 + r() * 60; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
}, false);
leatherBump.wrapS = leatherBump.wrapT = THREE.RepeatWrapping;

const logoTex = canvasTex(1024, 640, (g, w, h) => { window.drawItelLogo(g, w / 2, h / 2 + 30, 820, { dot: true }); });

const contactTex = canvasTex(256, 256, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(.45, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, false);

// ---------- materials ----------
const M = {
  body: new THREE.MeshPhysicalMaterial({ color: 0xf3f3f0, roughness: .42, roughnessMap: plasticRough, metalness: 0, clearcoat: .35, clearcoatRoughness: .3, sheen: .3, sheenColor: 0xffffff, sheenRoughness: .8 }),
  strip: new THREE.MeshPhysicalMaterial({ color: 0x34373d, roughness: .32, metalness: .1, clearcoat: .7, clearcoatRoughness: .15 }),
  hole: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: .9 }),
  tongue: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: .3, metalness: .9 }),
  button: new THREE.MeshPhysicalMaterial({ color: 0x0b0b0d, roughness: .5, clearcoat: .4 }),
  led: new THREE.MeshBasicMaterial({ color: 0x3a8bff }),
  leather: new THREE.MeshStandardMaterial({ map: leatherTex, roughness: .72, bumpMap: leatherBump, bumpScale: .6, side: THREE.DoubleSide }),
  rivet: new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: .22, metalness: 1 }),
  logo: new THREE.MeshPhysicalMaterial({ map: logoTex, transparent: true, roughness: .3, clearcoat: .6, polygonOffset: true, polygonOffsetFactor: -2 }),
};

// ---------- model ----------
const product = new THREE.Group();
scene.add(product);

const body = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, BD, 10, BR), M.body);
body.castShadow = body.receiveShadow = true;
product.add(body);

// front logo decal
const logo = new THREE.Mesh(new THREE.PlaneGeometry(.26, .26 * 640 / 1024), M.logo);
logo.position.set(0, -.03, BD / 2 + .0015);
product.add(logo);

// top port strip
const top = BH / 2;
const strip = new THREE.Mesh(new RoundedBoxGeometry(.78, .03, .085, 4, .014), M.strip);
strip.position.set(-.01, top - .005, .03); strip.receiveShadow = true;
product.add(strip);
const ports = [
  { x: -.30, w: .028, d: .014, c: true }, { x: -.22, w: .028, d: .014, c: true },
  { x: -.12, w: .05, d: .02 }, { x: -.04, w: .05, d: .02 }, { x: .04, w: .05, d: .02 },
  { x: .12, w: .028, d: .014, c: true }, { x: .20, w: .032, d: .032, round: true },
];
for (const p of ports) {
  // flush openings: a thin dark inset sitting on the strip surface
  const g = p.round ? new THREE.CylinderGeometry(p.w / 2, p.w / 2, .002, 24) : new RoundedBoxGeometry(p.w, .002, p.d, 2, p.c ? p.d / 2.2 - .0005 : .0009);
  const h = new THREE.Mesh(g, M.hole); h.position.set(p.x, top + .0102, .03); product.add(h);
  if (!p.c && !p.round) { const tg = new THREE.Mesh(new THREE.BoxGeometry(p.w * .78, .0022, p.d * .28), M.tongue); tg.position.set(p.x, top + .0104, .03 - p.d * .2); product.add(tg); }
}
const led = new THREE.Mesh(new THREE.SphereGeometry(.011, 16, 12), M.led);
led.position.set(-.37, top + .006, .03); product.add(led);
const btn = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, .02, 32), M.button);
btn.position.set(.335, top + .006, .03); product.add(btn);

// carry strap: flat leather band following a spline, riveted on both side faces
function ribbon(curve, width, thick, segs) {
  const pos = [], nrm = [], uv = [], idx = [];
  const Z = new THREE.Vector3(0, 0, 1);
  const len = curve.getLength();
  const faces = [ // [offset along N, offset along Z] corners for each face and its normal direction
    { a: [1, -1], b: [1, 1], n: [1, 0] }, { a: [-1, 1], b: [-1, -1], n: [-1, 0] },
    { a: [1, 1], b: [-1, 1], n: [0, 1] }, { a: [-1, -1], b: [1, -1], n: [0, -1] },
  ];
  for (const f of faces) {
    const base = pos.length / 3;
    for (let i = 0; i <= segs; i++) {
      const k = i / segs, p = curve.getPointAt(k), T = curve.getTangentAt(k);
      const N = new THREE.Vector3().crossVectors(Z, T).normalize();
      for (const c of [f.a, f.b]) {
        const v = p.clone().addScaledVector(N, c[0] * thick / 2).addScaledVector(Z, c[1] * width / 2);
        pos.push(v.x, v.y, v.z);
        const n = N.clone().multiplyScalar(f.n[0]).addScaledVector(Z, f.n[1]);
        nrm.push(n.x, n.y, n.z);
        uv.push(k * len / .5, c === f.a ? 0 : 1);
      }
    }
    for (let i = 0; i < segs; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
const sx = BW / 2 + .007;
const strapPts = [[-sx, -.02], [-sx, .2], [-sx + .012, .36], [-.47, .55], [-.36, .72], [-.19, .83], [0, .865]];
const pts = strapPts.concat(strapPts.slice(0, -1).reverse().map(([x, y]) => [-x, y])).map(([x, y]) => new THREE.Vector3(x, y, 0));
const strap = new THREE.Mesh(ribbon(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), .15, .014, 240), M.leather);
strap.castShadow = strap.receiveShadow = true;
product.add(strap);
for (const s of [-1, 1]) for (const y of [.02, .15]) {
  const r = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .012, 24), M.rivet);
  r.rotation.z = Math.PI / 2; r.position.set(s * (sx + .009), y, 0); product.add(r);
}

// ---------- lights ----------
const key = new THREE.DirectionalLight(0xfff4e8, 2.2);
key.position.set(-2.5, 3.5, 3); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = -.0008;
Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.6, bottom: -1.4, near: .5, far: 12 });
scene.add(key);
const rim = new THREE.DirectionalLight(0xff3050, 2.0); rim.position.set(3, 1.5, -3); scene.add(rim);
const fill = new THREE.DirectionalLight(0xdfe8ff, .5); fill.position.set(3, 0, 2); scene.add(fill);
const sweep = new THREE.PointLight(0xffffff, 0, 4, 1.5); scene.add(sweep);

// ground: real shadow + contact / ambient occlusion blob
const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0 }));
shadowPlane.visible = false;
shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.receiveShadow = true; scene.add(shadowPlane);
const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.1), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }));
contact.rotation.x = -Math.PI / 2; scene.add(contact);
const contact2 = new THREE.Mesh(new THREE.PlaneGeometry(1.25, .62), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }));
contact2.rotation.x = -Math.PI / 2; scene.add(contact2);

const tmp = new THREE.Vector3();
function render(o = {}) {
  product.rotation.set(o.pitch ?? .15, o.yaw ?? -.45, o.roll ?? 0);
  product.position.y = o.lift ?? 0;
  // light sweep: bright point light gliding across the front, reads as a specular streak
  if (o.sweep != null && o.sweep > 0 && o.sweep < 1) { sweep.intensity = 9 * Math.sin(o.sweep * Math.PI); sweep.position.set(-1.6 + 3.2 * o.sweep, .5, 1.1); }
  else sweep.intensity = 0;
  rim.color.set(o.rimColor ?? 0xff3050); rim.intensity = o.rim ?? 2.0;
  key.intensity = o.key ?? 2.2;
  renderer.toneMappingExposure = o.exposure ?? 1.0;
  M.led.color.setHSL(.6, 1, .5 + .25 * (o.ledPulse ?? 0));
  const floor = -BH / 2 - (o.floatGap ?? 0) + (o.lift ?? 0) * 0;
  shadowPlane.position.y = floor - .002; contact.position.y = floor - .001; contact2.position.y = floor;
  const sh = o.shadow ?? 1;
  shadowPlane.material.opacity = .22 * sh;
  contact.material.opacity = sh * (o.floatGap ? clampN(1 - o.floatGap * 1.4) : 1);
  contact.scale.setScalar(1 + (o.floatGap ?? 0) * .8);
  contact2.material.opacity = o.floatGap ? 0 : sh * .9;
  renderer.render(scene, camera);
  // screen-space anchor of the first USB-C port (for the charging cable)
  tmp.set(ports[0].x, top + .02, .03); product.localToWorld(tmp); tmp.project(camera);
  return { canvas: renderer.domElement, anchor: [(tmp.x + 1) / 2, (1 - tmp.y) / 2] };
}
const clampN = v => Math.max(0, Math.min(1, v));

window.Product = { render, SIZE };
window.dispatchEvent(new Event('product-ready'));
