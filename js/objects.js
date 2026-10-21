// Things that live near the keyboard: twelve CC0 objects (Poly Haven) with
// real physics, woven through the headline. The scene renders in three
// passes onto three stacked canvases: layer 0 sits behind both headline
// lines, layer 1 in front of the lower line only, layer 2 in front of both.
// Every pass writes depth for all objects, so occlusion stays physical. They drop onto the page when the section scrolls in, lift
// back out when you scroll up past it, can be grabbed and thrown (or tapped
// on touch screens), and get shaken by fast scrolling.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

// Six clean scans (Poly Haven, CC0) and six objects made here in code, each
// in a different material. `layer` sets depth against the headline.
export const FOOTER_OBJECTS = [
  { make: 'cursor', size: 1.1, name: 'Cursor', line: 'the one on this page, in 3D.' },
  { make: 'bolt', size: 1.1, name: 'Bolt', line: 'fast by default.' },
  { make: 'plus', size: 0.9, name: 'Plus', line: 'small additions, shipped often.' },
  { make: 'orb', size: 0.8, name: 'Orb', line: 'reflects the whole stack back.' },
  { make: 'jelly', size: 0.8, name: 'Jelly', line: 'flexible, within limits.' },
  { make: 'squiggle', size: 1.1, name: 'Squiggle', line: 'the path from idea to launch.' },
  { make: 'dice', size: 0.7, name: 'Dice', line: 'how not to pick a framework.' },
  { make: 'coin', size: 0.8, name: 'Coin', line: 'every API call costs something.' },
  { make: 'cherries', size: 0.9, name: 'Cherries', line: 'cherry-picked commits only.' },
];

export const OBJECTS = [
  { make: 'braces', layer: 0, size: 1.9, name: '{ }', line: 'every idea starts as a block.' },
  { id: 'rubber_duck_toy', layer: 2, size: 1.2, name: 'Rubber duck', line: 'senior debugging partner.' },
  { make: 'tag', layer: 0, size: 2.1, name: '</>', line: 'the markup is the easy part.' },
  { make: 'keycap', layer: 0, size: 1.25, name: 'Z key', line: 'the most-used key: undo.' },
  { id: 'croissant', layer: 1, size: 1.4, name: 'Croissant', line: 'layers, done properly.' },
  { make: 'semicolon', layer: 2, size: 1.4, name: 'Semicolon', line: 'optional, until it isn\'t.' },
  { id: 'gamepad', layer: 0, size: 1.8, name: 'Gamepad', line: 'the best interface is the one you stop noticing.' },
  { make: 'toggle', layer: 1, size: 1.4, name: 'Feature flag', line: 'ship it dark, switch it on.' },
  { id: 'lightbulb_01', layer: 0, size: 1.25, name: 'Light bulb', line: 'ideas, before the tickets.' },
  { make: 'spinner', layer: 0, size: 1.5, name: 'Spinner', line: 'under 300ms, if I can help it.' },
  { id: 'magnifying_glass_01', layer: 1, size: 1.7, name: 'Magnifying glass', line: 'code review.' },
  { id: 'round_spectacles', layer: 0, size: 1.6, name: 'Spectacles', line: 'for reading the docs. All of them.' },
  { make: 'pill', layer: 2, size: 1.3, name: 'Capsule', line: 'small, scoped components.' },
  { make: 'dice', layer: 0, size: 0.95, name: 'Dice', line: 'how not to pick a framework.' },
  { make: 'donut', layer: 1, size: 1.35, name: 'Donut', line: 'Friday deploys get celebrated, not done.' },
  { make: 'brick', layer: 0, size: 1.4, name: 'Brick', line: 'composable, like good components.' },
  { make: 'coin', layer: 1, size: 1.05, name: 'Coin', line: 'every API call costs something.' },
  { make: 'star', layer: 2, size: 1.2, name: 'Star', line: 'leave one on the repo.' },
  { make: 'heart', layer: 0, size: 1.15, name: 'Heart', line: 'care is a feature.' },
  { make: 'cherries', layer: 1, size: 1.2, name: 'Cherries', line: 'cherry-picked commits only.' },
  { make: 'cone', layer: 0, size: 1.3, name: 'Cone', line: 'work in progress. Mind the build.' },
  { make: 'ball', layer: 2, size: 0.9, name: 'Ball', line: 'async, back and forth.' },
  { make: 'at', layer: 0, size: 1.3, name: '@', line: 'mentions in review, always kind.' },
  { make: 'hash', layer: 1, size: 1.2, name: '#', line: 'every page has a hierarchy.' },
  { make: 'question', layer: 0, size: 1.3, name: '?', line: 'the best word in a standup.' },
];

// Materials for the made objects: chrome, mint glass, pearl, glossy plastic,
// rubber, velvet. Nothing textured, so nothing heavy.
const MAT = {
  chrome: () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06 }),
  // Glass look without a transmission pass (that re-renders the scene).
  glass: () => new THREE.MeshPhysicalMaterial({ color: 0x5fd99a, roughness: 0.05, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.82, specularIntensity: 1 }),
  pearl: () => new THREE.MeshPhysicalMaterial({ color: 0xc9b8ff, roughness: 0.18, metalness: 0.55, iridescence: 1, iridescenceIOR: 2.0, iridescenceThicknessRange: [250, 1100], clearcoat: 1, clearcoatRoughness: 0.05 }),
  plastic: (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
  rubber: (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.85 }),
  velvet: (c, sh) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.7, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(sh) }),
  metal: (c, r = 0.22) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 1, roughness: r }),
  candy: (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02, sheen: 0.3 }),
  frost: (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.35, transparent: true, opacity: 0.78, clearcoat: 1, clearcoatRoughness: 0.2 }),
};

function extrudeShape(shape, depth) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.25, bevelSize: 0.05, bevelSegments: 5, curveSegments: 24 });
  g.center();
  return g;
}
function starShape(n = 5, R = 0.6, r = 0.27) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rad = i % 2 ? r : R;
    i ? s.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : s.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  return s;
}
function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.55);
  s.bezierCurveTo(-0.15, -0.4, -0.62, -0.12, -0.62, 0.2);
  s.bezierCurveTo(-0.62, 0.48, -0.36, 0.62, -0.18, 0.62);
  s.bezierCurveTo(-0.06, 0.62, 0, 0.52, 0, 0.44);
  s.bezierCurveTo(0, 0.52, 0.06, 0.62, 0.18, 0.62);
  s.bezierCurveTo(0.36, 0.62, 0.62, 0.48, 0.62, 0.2);
  s.bezierCurveTo(0.62, -0.12, 0.15, -0.4, 0, -0.55);
  return s;
}
const SPRINKLES = [0xff4fa3, 0x8dffcd, 0xffd23f, 0x2b4bff, 0xffffff, 0xff6b57];

function text(font, str, size, depth) {
  const g = new TextGeometry(str, { font, size, depth, curveSegments: 10, bevelEnabled: true, bevelThickness: depth * 0.18, bevelSize: size * 0.035, bevelSegments: 4 });
  g.center();
  return g;
}

function make(kind, font) {
  const g = new THREE.Group();
  const add = (geo, mat, f) => { const m = new THREE.Mesh(geo, mat); f?.(m); g.add(m); return m; };
  if (kind === 'braces') add(text(font, '{ }', 1, 0.34), MAT.chrome());
  if (kind === 'tag') add(text(font, '</>', 1, 0.4), MAT.glass());
  if (kind === 'semicolon') add(text(font, ';', 1.4, 0.45), MAT.pearl());
  if (kind === 'keycap') {
    add(new RoundedBoxGeometry(1, 0.55, 1, 5, 0.16), MAT.plastic(0x8dffcd));
    add(text(font, 'Z', 0.42, 0.05), MAT.rubber(0x0b0b0b), (m) => { m.rotation.x = -Math.PI / 2; m.position.y = 0.29; });
  }
  if (kind === 'toggle') {
    add(new THREE.CapsuleGeometry(0.34, 0.8, 8, 24), MAT.rubber(0xff6b57), (m) => (m.rotation.z = Math.PI / 2));
    add(new THREE.SphereGeometry(0.3, 32, 24), MAT.plastic(0xffffff), (m) => { m.position.set(0.4, 0.06, 0); });
  }
  if (kind === 'pill') {
    const r = 0.3, L = 0.55;
    add(new THREE.CylinderGeometry(r, r, L / 2, 32), MAT.candy(0xff3fa4), (m) => (m.position.y = L / 4));
    add(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), MAT.candy(0xff3fa4), (m) => (m.position.y = L / 2));
    add(new THREE.CylinderGeometry(r, r, L / 2, 32), MAT.candy(0xffffff), (m) => (m.position.y = -L / 4));
    add(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.candy(0xffffff), (m) => (m.position.y = -L / 2));
    g.rotation.z = Math.PI / 2;
  }
  if (kind === 'dice') {
    add(new RoundedBoxGeometry(1, 1, 1, 5, 0.16), MAT.candy(0xffffff));
    const pip = new THREE.SphereGeometry(0.085, 16, 12), ink = MAT.plastic(0x111111), q = 0.25;
    const faces = [[1, [[0, 0]]], [2, [[-q, -q], [q, q]]], [3, [[-q, -q], [0, 0], [q, q]]], [4, [[-q, -q], [q, q], [-q, q], [q, -q]]], [5, [[-q, -q], [q, q], [-q, q], [q, -q], [0, 0]]], [6, [[-q, -q], [-q, 0], [-q, q], [q, -q], [q, 0], [q, q]]]];
    const axes = [[0, 0, 1], [1, 0, 0], [0, 1, 0], [0, -1, 0], [-1, 0, 0], [0, 0, -1]];
    faces.forEach(([, pts], fi) => {
      const n = new THREE.Vector3(...axes[fi]);
      const u = Math.abs(n.y) ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const v = new THREE.Vector3().crossVectors(n, u);
      pts.forEach(([a, b]) => add(pip, ink, (m) => m.position.copy(n.clone().multiplyScalar(0.49)).addScaledVector(u, a).addScaledVector(v, b)));
    });
  }
  if (kind === 'donut') {
    add(new THREE.TorusGeometry(0.5, 0.24, 24, 48), MAT.velvet(0xd9a066, 0xf3d1a0), (m) => (m.rotation.x = Math.PI / 2));
    add(new THREE.TorusGeometry(0.5, 0.2, 24, 48), MAT.candy(0xff7ab8), (m) => { m.rotation.x = Math.PI / 2; m.position.y = 0.07; m.scale.set(1.02, 1.02, 0.85); });
    const sp = new THREE.CapsuleGeometry(0.018, 0.07, 4, 8);
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2, rr = 0.5 + (Math.random() - 0.5) * 0.26;
      add(sp, MAT.plastic(SPRINKLES[i % SPRINKLES.length]), (m) => { m.position.set(Math.cos(a) * rr, 0.25, Math.sin(a) * rr); m.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI); });
    }
  }
  if (kind === 'brick') {
    const blue = MAT.plastic(0x2b6bff);
    add(new RoundedBoxGeometry(1.6, 0.6, 0.8, 3, 0.05), blue);
    const stud = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 24);
    for (let x = 0; x < 4; x++) for (let z = 0; z < 2; z++) add(stud, blue, (m) => m.position.set(-0.6 + x * 0.4, 0.36, -0.2 + z * 0.4));
  }
  if (kind === 'coin') {
    add(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 64), MAT.metal(0xffc24a, 0.18));
    add(text(font, 'Z', 0.5, 0.04), MAT.metal(0xffd77a, 0.3), (m) => { m.rotation.x = -Math.PI / 2; m.position.y = 0.06; });
  }
  if (kind === 'star') add(extrudeShape(starShape(), 0.28), MAT.candy(0xffd23f));
  if (kind === 'heart') add(extrudeShape(heartShape(), 0.32), MAT.velvet(0xe0123c, 0xff7a95));
  if (kind === 'cherries') {
    const red = MAT.candy(0xd10f2f), stem = MAT.rubber(0x3c7a2a);
    [[-0.28, 0], [0.28, 0.05]].forEach(([x, z]) => {
      add(new THREE.SphereGeometry(0.3, 32, 24), red, (m) => m.position.set(x, 0, z));
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, 0.26, z), new THREE.Vector3(x * 0.4, 0.75, z), new THREE.Vector3(0.05, 0.95, 0));
      add(new THREE.TubeGeometry(curve, 20, 0.025, 8), stem);
    });
  }
  if (kind === 'cone') {
    const orange = MAT.rubber(0xff6a1a);
    add(new THREE.ConeGeometry(0.42, 1.1, 40, 1, true), orange, (m) => (m.position.y = 0.6));
    add(new THREE.CylinderGeometry(0.235, 0.29, 0.16, 40, 1, true), MAT.candy(0xffffff), (m) => (m.position.y = 0.55));
    add(new RoundedBoxGeometry(0.95, 0.08, 0.95, 2, 0.03), orange);
  }
  if (kind === 'ball') {
    add(new THREE.SphereGeometry(0.5, 40, 28), MAT.velvet(0xc6f03a, 0xf4ffb0));
    const seam = new THREE.TorusGeometry(0.5, 0.018, 8, 80);
    add(seam, MAT.rubber(0xffffff), (m) => { m.rotation.set(0.5, 0.3, 0); m.scale.set(1, 0.6, 1); });
  }
  if (kind === 'at') add(text(font, '@', 1.1, 0.3), MAT.metal(0x7fb2ff, 0.12));
  if (kind === 'hash') add(text(font, '#', 1.1, 0.34), MAT.frost(0xff5fd2));
  if (kind === 'question') add(text(font, '?', 1.3, 0.38), MAT.candy(0x111111));
  if (kind === 'cursor') {
    // The site's pixel arrow, extruded.
    const px = ['B', 'BB', 'BWB', 'BWWB', 'BWWWB', 'BWWWWB', 'BWWWWWB', 'BWWWWWWB', 'BWWWBBBB', 'BWWB', 'BWB', 'BB', 'B'];
    const cube = new THREE.BoxGeometry(0.1, 0.1, 0.22), white = MAT.candy(0xffffff), black = MAT.candy(0x111111);
    px.forEach((row, y) => [...row].forEach((c, x) => add(cube, c === 'B' ? black : white, (m) => m.position.set(x * 0.1 - 0.3, -y * 0.1 + 0.6, 0))));
  }
  if (kind === 'bolt') {
    const s = new THREE.Shape();
    [[0.1, 0.62], [-0.32, 0.02], [-0.04, 0.02], [-0.16, -0.62], [0.32, 0.06], [0.04, 0.06], [0.1, 0.62]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    add(extrudeShape(s, 0.24), MAT.metal(0xff8a2b, 0.2));
  }
  if (kind === 'plus') {
    const mint = MAT.candy(0x8dffcd);
    add(new RoundedBoxGeometry(1, 0.32, 0.32, 4, 0.12), mint);
    add(new RoundedBoxGeometry(0.32, 1, 0.32, 4, 0.12), mint);
  }
  if (kind === 'orb') add(new THREE.SphereGeometry(0.42, 48, 32), MAT.metal(0xffffff, 0.04));
  if (kind === 'jelly') add(new RoundedBoxGeometry(0.75, 0.75, 0.75, 6, 0.24), MAT.frost(0xff6fb8));
  if (kind === 'squiggle') {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push(new THREE.Vector3((t - 0.5) * 1.4, Math.sin(t * Math.PI * 3) * 0.22, 0)); }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.09, 16), MAT.plastic(0x2b4bff));
  }
  if (kind === 'spinner') {
    const arc = Math.PI * 1.5, R = 0.55, r = 0.17, mat = MAT.velvet(0x2b4bff, 0x9fb4ff);
    add(new THREE.TorusGeometry(R, r, 28, 72, arc), mat, (m) => (m.rotation.x = -Math.PI / 2));
    add(new THREE.SphereGeometry(r, 24, 16), mat, (m) => m.position.set(R, 0, 0));
    add(new THREE.SphereGeometry(r, 24, 16), mat, (m) => m.position.set(Math.cos(arc) * R, 0, -Math.sin(arc) * R));
  }
  return g;
}


// Options let the footer reuse this scene: its own `set` of objects, one
// `flat` layer, `bounds` for the pile (NDC y of back and front edges) and
// a size multiplier.
export function createObjects({ stage, canvases, anchors = [], tip, base = '/assets/objects/', set = OBJECTS, flat = false, bounds = null, sizeK = 1, follow = false }) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  // Weak devices (≤ 4 cores or ≤ 4 GB) start lighter: fewer objects, 1x pixels.
  const lite = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  let defs = set.map((d) => (flat ? { ...d, layer: 0 } : d));
  if (lite && !flat) defs = [...defs.filter((d) => d.make).slice(0, 13), ...defs.filter((d) => d.id === 'rubber_duck_toy')];
  let dpr = Math.min(devicePixelRatio, lite ? 1 : coarse ? 1.25 : 1.4);
  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.autoUpdate = false;
  const ctxs = canvases.map((c) => c.getContext('2d'));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 14, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0005;
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.13 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Physics
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -32, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.45;
  world.defaultContactMaterial.restitution = 0.22;

  const plane = (pos, euler) => {
    const b = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    b.position.set(...pos);
    b.quaternion.setFromEuler(...euler);
    world.addBody(b);
    return b;
  };
  plane([0, 0, 0], [-Math.PI / 2, 0, 0]);
  const walls = {
    left: plane([0, 0, 0], [0, Math.PI / 2, 0]),
    right: plane([0, 0, 0], [0, -Math.PI / 2, 0]),
    back: plane([0, 0, 0], [0, 0, 0]),
    front: plane([0, 0, 0], [0, Math.PI, 0]),
  };

  // ── Layout: fit the camera, then put the walls where the screen edges meet the floor.
  let w = 1, h = 1, hw = 7, hd = 4, scaleK = 1;
  const ray = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const onFloor = (x, y) => {
    ray.setFromCamera(new THREE.Vector2(x, y), camera);
    const p = new THREE.Vector3();
    return ray.ray.intersectPlane(floorPlane, p) ? p : null;
  };
  function fit() {
    const r = stage.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    canvases.forEach((c) => { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); });
    camera.aspect = w / h;
    const tall = w / h < 0.9;
    camera.fov = tall ? 40 : 28;
    camera.position.set(0, tall ? 16 : 11.5, tall ? 11 : 14);
    camera.lookAt(0, 0.6, tall ? 0.6 : 1.2);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    // Butter-style: the pile fills the upper part of the hero and its
    // front edge meets the headline, so objects overlap the title but never
    // the line or button beneath it.
    const sr = stage.getBoundingClientRect();
    const ndc = (el, f) => { if (!el) return null; const r = el.getBoundingClientRect(); return 1 - (2 * (r.top + r.height * f - sr.top)) / sr.height; };
    const frontY = bounds ? bounds.front : ndc(anchors[1], 0.55) ?? (tall ? -0.2 : -0.3);
    const backY = bounds ? bounds.back : tall ? 0.72 : 0.76;
    const l = onFloor(-1, frontY), rr = onFloor(1, frontY), top = onFloor(0, backY), bot = onFloor(0, frontY);
    hw = Math.min(Math.abs(l.x), Math.abs(rr.x)) - 0.4;
    const back = top.z + 0.6, front = bot.z;
    hd = (front - back) / 2;
    walls.left.position.set(-hw, 0, 0);
    walls.right.position.set(hw, 0, 0);
    walls.back.position.set(0, 0, back);
    walls.front.position.set(0, 0, front);
    scaleK = THREE.MathUtils.clamp(hw / 6.2, 0.62, 1.35) * sizeK;
    key.shadow.camera.left = -hw - 2; key.shadow.camera.right = hw + 2;
    key.shadow.camera.top = hd + 4; key.shadow.camera.bottom = -hd - 4;
    key.shadow.camera.updateProjectionMatrix();
    items.forEach(applyScale);
    centre = (back + front) / 2;
  }
  let centre = 0;

  // ── Objects
  const items = [];
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

  function applyScale(it) {
    const s = it.def.size * scaleK;
    if (it.scale === s) return;
    it.scale = s;
    const k = s / it.maxDim;
    it.mesh.scale.setScalar(k);
    const he = it.half.clone().multiplyScalar(k);
    it.body.shapes = []; it.body.shapeOffsets = []; it.body.shapeOrientations = [];
    it.body.addShape(new CANNON.Box(new CANNON.Vec3(he.x, he.y, he.z)));
    it.body.updateMassProperties();
  }

  async function load() {
    const font = await new FontLoader().loadAsync('/assets/fonts/glyphs.typeface.json');
    await Promise.all(defs.map(async (def, i) => {
      const model = def.make ? make(def.make, font) : (await loader.loadAsync(base + def.id + '.glb')).scene;
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.item = i; } });
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const c = box.getCenter(new THREE.Vector3());
      model.position.sub(c);
      const mesh = new THREE.Group();
      mesh.add(model);
      mesh.visible = false;
      scene.add(mesh);
      const body = new CANNON.Body({ mass: 1, linearDamping: 0.05, angularDamping: 0.12, sleepSpeedLimit: 0.4, sleepTimeLimit: 0.5 });
      world.addBody(body);
      const meshes = [];
      model.traverse((o) => { if (o.isMesh) meshes.push([o, o.material]); });
      items[i] = { def, mesh, body, meshes, half: size.clone().multiplyScalar(0.5), maxDim: Math.max(size.x, size.y, size.z), scale: 0 };
      applyScale(items[i]);
      park(items[i]);
    }));
  }

  function park(it) {
    it.body.type = CANNON.Body.STATIC;
    it.body.position.set(0, -50, 0);
    it.body.velocity.setZero(); it.body.angularVelocity.setZero();
    it.mesh.visible = false;
  }

  // Where on the floor a headline line sits: layer 2 aims at the upper line,
  // layer 1 at the lower one.
  function lineZ(layer) {
    const el = anchors[layer === 2 ? 0 : layer === 1 ? 1 : -1];
    if (!el) return null;
    const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const ny = 1 - (2 * (r.top + r.height * 0.75 - sr.top)) / sr.height;
    return onFloor(0, ny)?.z ?? null;
  }

  let dropped = false, pending = 0;
  const timers = [];
  function drop() {
    if (dropped) return;
    dropped = true;
    const order = items.map((_, i) => i).sort(() => Math.random() - 0.5);
    order.forEach((i, n) => {
      pending++;
      timers.push(setTimeout(() => {
        pending--;
        const it = items[i];
        if (!it || !dropped) return;
        const b = it.body;
        b.type = CANNON.Body.DYNAMIC;
        b.mass = 1; b.updateMassProperties();
        const zLine = lineZ(it.def.layer);
        const z = zLine ?? centre + (Math.random() * 2 - 1) * hd * 0.85;
        b.position.set((Math.random() * 2 - 1) * hw * 0.85, 7 + Math.random() * 4, THREE.MathUtils.clamp(z + (Math.random() - 0.5) * 1.2, walls.back.position.z + 0.8, walls.front.position.z - 0.8));
        b.quaternion.setFromEuler(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        b.velocity.set(0, -4, 0);
        b.angularVelocity.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
        b.wakeUp();
        it.mesh.visible = true;
        kick();
      }, 120 + n * 70));
    });
  }
  function lift() {
    dropped = false;
    timers.splice(0).forEach(clearTimeout);
    pending = 0; dirty = true;
    items.forEach((it) => it && park(it));
    kick();
  }

  // ── Pointer: grab and throw (fine pointers), tap to toss (touch)
  const pointer = new THREE.Vector2();
  const meshes = () => items.filter((it) => it?.mesh.visible).map((it) => it.mesh);
  const pick = (e) => {
    const r = stage.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(meshes(), true)[0];
    if (!hit) return null;
    let o = hit.object;
    while (o && o.userData.item === undefined) o = o.parent;
    return o ? { item: items[o.userData.item], point: hit.point } : null;
  };

  const joint = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
  joint.collisionFilterGroup = 0; joint.collisionFilterMask = 0;
  world.addBody(joint);
  let drag = null;
  const dragPlane = new THREE.Plane();

  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    const p = pick(e);
    if (!p) return;
    const b = p.item.body;
    b.wakeUp();
    if (e.pointerType !== 'mouse') {
      // Touch: toss it into the air with a spin.
      b.applyImpulse(new CANNON.Vec3((Math.random() - 0.5) * 6, 16, (Math.random() - 0.5) * 4), new CANNON.Vec3(p.point.x, p.point.y, p.point.z));
      navigator.vibrate?.(8);
      kick();
      return;
    }
    e.preventDefault();
    stage.setPointerCapture(e.pointerId);
    const local = new CANNON.Vec3(p.point.x, p.point.y, p.point.z).vsub(b.position);
    const pivot = b.quaternion.inverse().vmult(local);
    joint.position.set(p.point.x, p.point.y, p.point.z);
    const c = new CANNON.PointToPointConstraint(b, pivot, joint, new CANNON.Vec3(0, 0, 0), 60);
    world.addConstraint(c);
    dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, Math.max(p.point.y, 0.5) + 1.4, 0));
    drag = { c, body: b };
    stage.classList.add('is-grabbing');
    hideTip();
    kick();
  });
  stage.addEventListener('pointermove', (e) => {
    if (drag) {
      const r = stage.getBoundingClientRect();
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const p = new THREE.Vector3();
      if (ray.ray.intersectPlane(dragPlane, p)) {
        p.x = THREE.MathUtils.clamp(p.x, -hw, hw);
        joint.position.set(p.x, p.y, p.z);
      }
      drag.body.wakeUp();
      return;
    }
    if (follow && dropped) { followAt(e); kick(); }
    if (e.pointerType !== 'mouse') return;
    const p = pick(e);
    stage.classList.toggle('is-over', !!p);
    if (p) showTip(p.item.def, e.clientX, e.clientY); else hideTip();
  });
  const release = () => {
    if (!drag) return;
    world.removeConstraint(drag.c);
    drag = null;
    stage.classList.remove('is-grabbing');
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('pointerleave', () => { hideTip(); stage.classList.remove('is-over'); target = null; });

  // Follow mode (footer): once dropped, objects are drawn towards the pointer,
  // each to its own spot on a loose ring around it, and settle when it leaves.
  let target = null;
  const followPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.4);
  function followAt(e) {
    const r = stage.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const p = new THREE.Vector3();
    if (!ray.ray.intersectPlane(followPlane, p)) return;
    p.x = THREE.MathUtils.clamp(p.x, -hw + 0.6, hw - 0.6);
    p.z = THREE.MathUtils.clamp(p.z, walls.back.position.z + 0.6, walls.front.position.z - 0.6);
    target = p;
  }
  function pullTowardsPointer() {
    if (!target || !dropped) return false;
    let any = false;
    const n = items.length, ring = 1.1 * scaleK;
    items.forEach((it, i) => {
      if (!it || it.body.type !== CANNON.Body.DYNAMIC || (drag && drag.body === it.body)) return;
      const b = it.body, a = (i / n) * Math.PI * 2;
      const dx = target.x + Math.cos(a) * ring - b.position.x;
      const dz = target.z + Math.sin(a) * ring * 0.7 - b.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.15) return;
      // Steer the velocity straight towards the spot (beats floor friction,
      // and stays smooth): fast when far, easing in as it arrives.
      const speed = Math.min(d * 3.2, 9);
      b.wakeUp();
      b.velocity.x += ((dx / d) * speed - b.velocity.x) * 0.18;
      b.velocity.z += ((dz / d) * speed - b.velocity.z) * 0.18;
      b.angularVelocity.y += (Math.random() - 0.5) * 0.2;
      any = true;
    });
    return any;
  }

  function showTip(def, x, y) {
    if (!tip) return;
    tip.querySelector('b').textContent = def.name;
    tip.querySelector('span').textContent = def.line;
    const r = stage.getBoundingClientRect();
    tip.style.transform = `translate(${x - r.left + 18}px, ${y - r.top + 18}px)`;
    tip.classList.add('is-on');
  }
  function hideTip() { tip?.classList.remove('is-on'); }

  // ── Loop
  let running = false, visible = false, raf = 0, last = 0, lastScroll = scrollY;
  // Render only while something moves: falling, thrown, dragged, shaken.
  // Once every body sleeps the loop stops and the canvases keep the last frame.
  let dirty = true;
  function loop(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Fast scrolling shakes the pile.
    const dy = scrollY - lastScroll;
    lastScroll = scrollY;
    // Only while the hero is mostly on screen: leaving it shouldn't wake the pile.
    if (dropped && Math.abs(dy) > 10 && stage.getBoundingClientRect().bottom > innerHeight * 0.88) {
      const f = Math.min(Math.abs(dy), 80) * 0.045;
      items.forEach((it) => {
        if (!it || it.body.type !== CANNON.Body.DYNAMIC || it.body.position.y > 3) return;
        it.body.wakeUp();
        it.body.applyImpulse(new CANNON.Vec3((Math.random() - 0.5) * f, f * (0.6 + Math.random() * 0.6), (Math.random() - 0.5) * f * 0.5));
      });
    }
    const pulling = follow && pullTowardsPointer();
    world.step(1 / 60, dt, 3);
    let moving = !!drag || pulling || timers.length > 0 && pending > 0;
    items.forEach((it) => {
      if (!it) return;
      const b = it.body;
      if (b.type === CANNON.Body.DYNAMIC && b.sleepState === CANNON.Body.AWAKE) moving = true;
      it.mesh.position.copy(b.position);
      it.mesh.quaternion.copy(b.quaternion);
    });
    if (moving || dirty) { render(); dirty = false; }
    if (moving) adapt(dt);
    // Keep ticking while moving; otherwise idle until scroll/pointer wakes us.
    if (moving) raf = requestAnimationFrame(loop);
  }
  // Adaptive quality: if frames run slow while things move, step down —
  // first to 1x pixels, then without shadows. Never steps back up.
  let frames = 0, slow = 0, level = 0;
  function adapt(dt) {
    if (level >= 2) return;
    frames++; if (dt > 0.024) slow++;
    if (frames < 90) return;
    if (slow / frames > 0.5) {
      level++;
      if (level === 1 && dpr > 1) { dpr = 1; renderer.setPixelRatio(1); fit(); }
      else { level = 2; key.castShadow = false; floor.visible = false; }
    }
    frames = slow = 0;
  }
  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
  function render() {
    renderer.shadowMap.needsUpdate = true;
    for (let L = 0; L < ctxs.length; L++) {
      if (L > 0 && !items.some((it) => it && it.def.layer === L && it.mesh.visible)) { ctxs[L].clearRect(0, 0, ctxs[L].canvas.width, ctxs[L].canvas.height); continue; }
      floor.visible = L === 0 && key.castShadow;
      // Objects of other layers only occlude: a cheap depth-only material
      // instead of running their physical shaders again.
      items.forEach((it) => { if (it) { const on = it.def.layer === L; it.meshes.forEach(([m, mat]) => (m.material = on ? mat : depthOnly)); } });
      renderer.render(scene, camera);
      const ctx = ctxs[L];
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(glCanvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }
  function kick() {
    if (!running || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  const setRunning = (v) => { running = v; if (v) kick(); };

  addEventListener('scroll', () => { if (dropped && visible) kick(); }, { passive: true });
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(visible && !document.hidden); }, { rootMargin: '100px' });
  io.observe(stage);
  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));
  const ro = new ResizeObserver(() => { fit(); dirty = true; kick(); });
  ro.observe(stage);
  fit();

  const ready = load().then(() => { fit(); renderer.compile(scene, camera); });

  return { ready, drop, lift };
}
