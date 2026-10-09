/* ==========================================================================
   MotionDex — Three.js 3D Hero Scene
   A living, breathing crystal geometry surrounded by swirling particles.
   Reacts to mouse movement for an immersive parallax feel.
   ========================================================================== */

import * as THREE from 'three';

const PARTICLE_COUNT = 1800;
const CRYSTAL_SEGMENTS = 2;

/* ─── state ─── */
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
let scene, camera, renderer, clock;
let crystalGroup, particleSystem, innerGlow, outerRing;
let frameId;

/* ─── palette (matches CSS vars) ─── */
const palette = {
  violet: new THREE.Color('#8b5cf6'),
  cyan:   new THREE.Color('#22d3ee'),
  pink:   new THREE.Color('#f472b6'),
  amber:  new THREE.Color('#fbbf24'),
  bg:     new THREE.Color('#05050c'),
};

/* ─── init ─── */
export function initScene(canvasEl) {
  if (!canvasEl) return;

  const rect = canvasEl.parentElement.getBoundingClientRect();

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(rect.width, rect.height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05050c, 0.08);

  // Camera
  camera = new THREE.PerspectiveCamera(55, rect.width / rect.height, 0.1, 100);
  camera.position.set(0, 0, 6);

  clock = new THREE.Clock();

  buildCrystal();
  buildParticles();
  buildLights();

  // Events
  window.addEventListener('resize', onResize);
  document.addEventListener('mousemove', onMouseMove);

  animate();
}

/* ─── crystal geometry ─── */
function buildCrystal() {
  crystalGroup = new THREE.Group();

  // Main wireframe icosahedron
  const icoGeo = new THREE.IcosahedronGeometry(1.35, CRYSTAL_SEGMENTS);
  const wireframe = new THREE.WireframeGeometry(icoGeo);
  const wireMat = new THREE.LineBasicMaterial({
    color: palette.violet,
    transparent: true,
    opacity: 0.55,
    linewidth: 1,
  });
  const wireLines = new THREE.LineSegments(wireframe, wireMat);
  crystalGroup.add(wireLines);

  // Inner solid with emissive glow
  const innerGeo = new THREE.IcosahedronGeometry(1.1, CRYSTAL_SEGMENTS);
  const innerMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a16,
    emissive: palette.violet,
    emissiveIntensity: 0.15,
    metalness: 0.9,
    roughness: 0.2,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    envMapIntensity: 0.5,
  });
  innerGlow = new THREE.Mesh(innerGeo, innerMat);
  crystalGroup.add(innerGlow);

  // Outer octahedron ring — slowly counter-rotates
  const octGeo = new THREE.OctahedronGeometry(2.0, 0);
  const octWire = new THREE.WireframeGeometry(octGeo);
  const octMat = new THREE.LineBasicMaterial({
    color: palette.cyan,
    transparent: true,
    opacity: 0.18,
  });
  outerRing = new THREE.LineSegments(octWire, octMat);
  crystalGroup.add(outerRing);

  // Edge glow rings
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.RingGeometry(1.6 + i * 0.35, 1.62 + i * 0.35, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: i === 0 ? palette.violet : i === 1 ? palette.cyan : palette.pink,
      transparent: true,
      opacity: 0.08 - i * 0.02,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.5 + i * 0.3;
    ring.rotation.y = i * 0.5;
    ring.userData = { speed: 0.15 + i * 0.08, axis: i };
    crystalGroup.add(ring);
  }

  scene.add(crystalGroup);
}

/* ─── particle system ─── */
function buildParticles() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const speeds = new Float32Array(PARTICLE_COUNT);
  const offsets = new Float32Array(PARTICLE_COUNT);

  const colorChoices = [palette.violet, palette.cyan, palette.pink, palette.amber];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Distribute in a sphere shell
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.8 + Math.random() * 4.5;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const col = colorChoices[Math.floor(Math.random() * colorChoices.length)];
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;

    sizes[i] = 0.015 + Math.random() * 0.045;
    speeds[i] = 0.2 + Math.random() * 0.8;
    offsets[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Custom shader for soft glowing particles
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uTime;
      uniform float uPixelRatio;

      void main() {
        vColor = color;
        vec3 pos = position;

        // Gentle orbit
        float angle = uTime * 0.15 + length(pos) * 0.5;
        float s = sin(angle) * 0.3;
        float c = cos(angle) * 0.3;
        pos.x += s * 0.15;
        pos.y += c * 0.12;

        // Breathing
        float breath = sin(uTime * 0.6 + length(position) * 1.5) * 0.08;
        pos *= 1.0 + breath;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = size * 220.0 * uPixelRatio / -mvPosition.z;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;

      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.05, d);
        alpha *= 0.7;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // Store speeds/offsets for animation
  mat.userData = { speeds, offsets };

  particleSystem = new THREE.Points(geo, mat);
  scene.add(particleSystem);
}

/* ─── lights ─── */
function buildLights() {
  const ambient = new THREE.AmbientLight(0x1a1a2e, 0.5);
  scene.add(ambient);

  const point1 = new THREE.PointLight(palette.violet.getHex(), 2.5, 12);
  point1.position.set(2, 2, 3);
  scene.add(point1);

  const point2 = new THREE.PointLight(palette.cyan.getHex(), 1.8, 10);
  point2.position.set(-3, -1, 2);
  scene.add(point2);

  const point3 = new THREE.PointLight(palette.pink.getHex(), 1.2, 8);
  point3.position.set(0, -3, 1);
  scene.add(point3);
}

/* ─── animation loop ─── */
function animate() {
  frameId = requestAnimationFrame(animate);

  const t = clock.getElapsedTime();
  const dt = clock.getDelta();

  // Smooth mouse
  mouse.tx += (mouse.x - mouse.tx) * 0.06;
  mouse.ty += (mouse.y - mouse.ty) * 0.06;

  // Crystal rotation
  if (crystalGroup) {
    crystalGroup.rotation.y = t * 0.18 + mouse.tx * 0.4;
    crystalGroup.rotation.x = Math.sin(t * 0.12) * 0.15 + mouse.ty * 0.3;
    crystalGroup.rotation.z = Math.sin(t * 0.08) * 0.05;

    // Breathing scale
    const breath = 1 + Math.sin(t * 0.5) * 0.03;
    crystalGroup.scale.setScalar(breath);
  }

  // Outer ring counter-rotation
  if (outerRing) {
    outerRing.rotation.y = -t * 0.12;
    outerRing.rotation.x = t * 0.08;
    outerRing.rotation.z = Math.sin(t * 0.2) * 0.2;
  }

  // Inner glow pulse
  if (innerGlow) {
    innerGlow.material.emissiveIntensity = 0.12 + Math.sin(t * 0.8) * 0.08;
    innerGlow.material.opacity = 0.2 + Math.sin(t * 0.6) * 0.08;
  }

  // Orbital rings
  crystalGroup?.children.forEach(child => {
    if (child.userData?.speed) {
      const s = child.userData.speed;
      const a = child.userData.axis;
      if (a === 0) child.rotation.z += s * 0.01;
      else if (a === 1) child.rotation.x += s * 0.008;
      else child.rotation.y += s * 0.012;
    }
  });

  // Particle time
  if (particleSystem) {
    particleSystem.material.uniforms.uTime.value = t;
    particleSystem.rotation.y = t * 0.03 + mouse.tx * 0.15;
    particleSystem.rotation.x = mouse.ty * 0.1;
  }

  // Camera subtle sway
  camera.position.x = Math.sin(t * 0.15) * 0.2 + mouse.tx * 0.6;
  camera.position.y = Math.cos(t * 0.12) * 0.15 + mouse.ty * 0.4;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

/* ─── events ─── */
function onMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
}

function onResize() {
  const canvas = renderer.domElement;
  const parent = canvas.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();

  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  renderer.setSize(rect.width, rect.height);
}

/* ─── cleanup ─── */
export function destroyScene() {
  cancelAnimationFrame(frameId);
  window.removeEventListener('resize', onResize);
  document.removeEventListener('mousemove', onMouseMove);
  renderer?.dispose();
}
