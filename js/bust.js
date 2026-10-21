// The bust: polished white marble with veins generated in the shader (no
// texture to download), lit like a gallery piece with a mint rim. Scroll
// turns it a full 360°; drag spins it with inertia.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const NOISE = /* glsl */ `
varying vec3 vObjPos;
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * n3(p); p *= 2.03; a *= 0.5; } return s; }
float veins(vec3 p) {
  float t = p.y * 3.2 + p.x * 1.4 + fbm(p * 2.2) * 6.5;
  float v = 1.0 - abs(sin(t));
  float fine = 1.0 - abs(sin(p.z * 9.0 + fbm(p * 5.0) * 9.0));
  return pow(v, 14.0) * 0.9 + pow(fine, 40.0) * 0.35;
}
`;

function marble(normalMap) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xf4f3ef, roughness: 0.26, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.18,
    normalMap: normalMap || null, normalScale: new THREE.Vector2(0.8, 0.8),
  });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float vn = veins(vObjPos * 2.4);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.50, 0.52, 0.55), clamp(vn, 0.0, 1.0) * 0.6);
        diffuseColor.rgb *= 0.96 + 0.04 * fbm(vObjPos * 14.0);`);
  };
  return m;
}

export function createBust({ canvas, stage, src }) {
  // `stage` receives the drag; the canvas itself overflows the section.
  const coarse = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const lite = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  // Desktops get the sharper 153k-triangle bust (1.3 MB); phones and weak
  // devices the 67k one (0.66 MB).
  src = src || (!coarse && !lite && innerWidth > 900 ? '/assets/bust-hd.glb' : '/assets/bust.glb');
  renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1 : coarse ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
  camera.position.set(0, 0.55, 3.0);
  camera.lookAt(0, 0.5, 0);

  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(-2, 3, 2.5);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
  fill.position.set(2.5, 0.5, 2);
  const rim = new THREE.PointLight(0x8dffcd, 9, 6, 1.4);
  rim.position.set(1.4, 1.2, -1.4);
  const rim2 = new THREE.PointLight(0x68d89b, 4, 6, 1.6);
  rim2.position.set(-1.6, 0.2, -1.2);
  scene.add(key, fill, rim, rim2);

  const turn = new THREE.Group(); // scroll + drag rotation
  scene.add(turn);

  let w = 1, h = 1;
  function fit() {
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fill the canvas: the bust (one unit tall) spans ~88% of its height.
    camera.fov = 24;
    const d = (1 / 0.88) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.position.set(0, 0.56, d);
    camera.lookAt(0, 0.5, 0);
    camera.updateProjectionMatrix();
    dirty = true;
  }

  // Rotation = scroll angle + spun angle (with inertia) + a slight pointer lean.
  let scrollA = -0.47 * Math.PI * 2, spin = 0, vel = 0, lean = 0, leanT = 0, dirty = true;
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') e.preventDefault();
    drag = { x: e.clientX, last: e.clientX, t: performance.now() };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-grabbing');
    kick();
  });
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    leanT = ((e.clientY - r.top) / r.height - 0.5) * 0.18;
    if (drag) {
      const dx = e.clientX - drag.last;
      const now = performance.now();
      spin += dx * 0.012;
      vel = (dx * 0.012) / Math.max(1, now - drag.t) * 16;
      drag.last = e.clientX; drag.t = now;
    }
    kick();
  });
  const up = () => { drag = null; stage.classList.remove('is-grabbing'); kick(); };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('pointerleave', () => { leanT = 0; kick(); });

  let running = false, visible = false, raf = 0, model = null;
  function loop() {
    raf = 0;
    if (!running) return;
    if (!drag) { spin += vel; vel *= 0.94; }
    lean += (leanT - lean) * 0.08;
    const target = scrollA + spin;
    const moving = Math.abs(vel) > 0.0004 || Math.abs(leanT - lean) > 0.0005 || !!drag || Math.abs(turn.rotation.y - target) > 0.0005;
    turn.rotation.y += (target - turn.rotation.y) * 0.18;
    turn.rotation.x = lean;
    if (moving || dirty) { renderer.render(scene, camera); dirty = false; }
    if (moving) raf = requestAnimationFrame(loop);
  }
  function kick() { if (running && !raf) raf = requestAnimationFrame(loop); }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; running = visible && !document.hidden; if (running) { dirty = true; kick(); } }, { rootMargin: '100px' });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { running = visible && !document.hidden; kick(); });
  new ResizeObserver(() => { fit(); kick(); }).observe(canvas);
  fit();

  const ready = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(src).then((gltf) => {
    model = gltf.scene;
    let normalMap = null;
    model.traverse((o) => { if (o.isMesh && o.material.normalMap) normalMap = o.material.normalMap; });
    const mat = marble(normalMap);
    model.traverse((o) => { if (o.isMesh) o.material = mat; });
    // Centre on its vertical axis, feet on y = 0, about one unit tall.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const k = 1 / size.y;
    model.scale.setScalar(k);
    model.position.set(-c.x * k, -box.min.y * k, -c.z * k);
    turn.add(model);
    renderer.compile(scene, camera);
    dirty = true; kick();
  });

  return {
    ready,
    // Facing you, slightly turned, when the section is centred.
    setProgress(p) { scrollA = (p - 0.47) * Math.PI * 2; kick(); },
  };
}
