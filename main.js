import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { XRButton } from 'three/addons/webxr/XRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { sounds } from './src/audio.js';

// ==========================================
// CONSTANTS & STATE
// ==========================================
const STATES = {
  ORIENTATION: 'ORIENTATION',
  INSPECTION: 'INSPECTION',
  SUPERPOSITION: 'SUPERPOSITION',
  COLLAPSED: 'COLLAPSED',
};

const appState = {
  stage: STATES.ORIENTATION,
  isBoxSealed: false,
  quantumPeek: false,
  outcome: null, // 'alive' | 'dead'
  decayProbability: 0.5,
  isPinchingLeft: false,
  isPinchingRight: false,
  time: 0,
  lastGeigerClick: 0,
};

// ==========================================
// SCENE, CAMERA & RENDERER SETUP
// ==========================================
const container = document.getElementById('scene-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060911);
scene.fog = new THREE.FogExp2(0x060911, 0.08);

const camera = new THREE.PerspectiveCamera(
  62,
  window.innerWidth / window.innerHeight,
  0.05,
  100
);
camera.position.set(0.15, 1.52, 2.45);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

// Append official Three.js WebXR button
const xrButton = XRButton.createButton(renderer, {
  optionalFeatures: ['hand-tracking', 'local-floor', 'bounded-floor'],
});
xrButton.id = 'webxr-enter-btn';
document.body.appendChild(xrButton);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0.15, 1.15, 0.05);
controls.maxPolarAngle = Math.PI / 2 + 0.05;
controls.minDistance = 0.4;
controls.maxDistance = 6.0;

// ==========================================
// LIGHTING SETUP
// ==========================================
const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.65);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
keyLight.position.set(2.0, 4.0, 2.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 10;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

// Quantum Cyan Fill Light
const cyanFill = new THREE.PointLight(0x00f2fe, 2.4, 6);
cyanFill.position.set(-1.2, 1.5, 0.5);
scene.add(cyanFill);

// Quantum Violet Rim Light
const violetRim = new THREE.PointLight(0xa855f7, 2.2, 6);
violetRim.position.set(1.4, 1.6, -0.6);
scene.add(violetRim);

// Poison Green Glow (under vial)
const poisonGlow = new THREE.PointLight(0x10b981, 0.2, 2.0);
poisonGlow.position.set(-0.38, 0.88, 0.38);
scene.add(poisonGlow);

// ==========================================
// WEBXR HAND TRACKING & CONTROLLERS
// ==========================================
const handModelFactory = new XRHandModelFactory();

// Left Controller & Hand
const controller0 = renderer.xr.getController(0);
scene.add(controller0);
const hand0 = renderer.xr.getHand(0);
hand0.add(handModelFactory.createHandModel(hand0, 'mesh'));
scene.add(hand0);

// Right Controller & Hand
const controller1 = renderer.xr.getController(1);
scene.add(controller1);
const hand1 = renderer.xr.getHand(1);
hand1.add(handModelFactory.createHandModel(hand1, 'mesh'));
scene.add(hand1);

// Pointer Rays for Hand / Controller Selection
function buildControllerRay() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1.2),
  ]);
  const mat = new THREE.LineBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.5,
  });
  return new THREE.Line(geo, mat);
}
const ray0 = buildControllerRay();
const ray1 = buildControllerRay();
controller0.add(ray0);
controller1.add(ray1);

// Interaction markers at index fingertips
const tipGeo = new THREE.SphereGeometry(0.012, 16, 16);
const tipMat0 = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.8 });
const tipMat1 = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.8 });
const indexMarker0 = new THREE.Mesh(tipGeo, tipMat0);
const indexMarker1 = new THREE.Mesh(tipGeo, tipMat1);
scene.add(indexMarker0);
scene.add(indexMarker1);

// Raycaster for pointers & mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const interactableObjects = [];

// ==========================================
// LABORATORY WORKBENCH & ENVIRONMENT
// ==========================================
function buildLabEnvironment() {
  const envGroup = new THREE.Group();

  // 1. Sleek Heavy Laboratory Table (Wider for scaled box and side panel)
  const tableTopGeo = new THREE.BoxGeometry(3.1, 0.06, 1.85);
  const tableTopMat = new THREE.MeshStandardMaterial({
    color: 0x161e2e,
    metalness: 0.85,
    roughness: 0.22,
  });
  const tableTop = new THREE.Mesh(tableTopGeo, tableTopMat);
  tableTop.position.set(0, 0.76, 0.05);
  tableTop.receiveShadow = true;
  envGroup.add(tableTop);

  // Table Edge Glow (Cyan Neon Strip)
  const edgeGeo = new THREE.BoxGeometry(3.12, 0.014, 1.87);
  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.8,
  });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.set(0, 0.79, 0.05);
  envGroup.add(edge);

  // 4 Table Legs
  const legGeo = new THREE.CylinderGeometry(0.042, 0.046, 0.75, 20);
  const legMat = new THREE.MeshStandardMaterial({
    color: 0x0b1120,
    metalness: 0.9,
    roughness: 0.2,
  });
  const legPositions = [
    [-1.45, 0.38, -0.82],
    [1.45, 0.38, -0.82],
    [-1.45, 0.38, 0.82],
    [1.45, 0.38, 0.82],
  ];
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    envGroup.add(leg);
  });

  // Table Crossbar braces
  const braceGeo = new THREE.BoxGeometry(2.9, 0.02, 0.04);
  const brace = new THREE.Mesh(braceGeo, legMat);
  brace.position.set(0, 0.2, -0.82);
  envGroup.add(brace);

  // 2. Quantum Grid Floor
  const floorGeo = new THREE.PlaneGeometry(24, 24, 32, 32);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x080d1a,
    metalness: 0.7,
    roughness: 0.4,
    wireframe: true,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  envGroup.add(floor);

  // Solid dark floor beneath grid
  const solidFloorGeo = new THREE.PlaneGeometry(24, 24);
  const solidFloorMat = new THREE.MeshBasicMaterial({ color: 0x030508 });
  const solidFloor = new THREE.Mesh(solidFloorGeo, solidFloorMat);
  solidFloor.rotation.x = -Math.PI / 2;
  solidFloor.position.y = -0.005;
  envGroup.add(solidFloor);

  // 4. Tactile 3D Buttons on Tabletop (In front of chamber)
  const buttonsGroup = new THREE.Group();
  buttonsGroup.position.set(-0.4, 0.795, 0.82);

  const btnGeo = new THREE.CylinderGeometry(0.046, 0.052, 0.026, 24);

  // Button A: Seal Box (Superposition)
  const sealMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.5,
    metalness: 0.5,
    roughness: 0.3,
  });
  const sealBtn = new THREE.Mesh(btnGeo, sealMat);
  sealBtn.position.set(-0.20, 0, 0);
  sealBtn.name = 'Btn_Seal';
  sealBtn.userData = { action: 'toggleSeal', tooltip: 'Seal Chamber (Superposition)' };
  buttonsGroup.add(sealBtn);
  interactableObjects.push(sealBtn);

  // Button B: Observe (Collapse Wavefunction)
  const observeMat = new THREE.MeshStandardMaterial({
    color: 0x00f2fe,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    metalness: 0.5,
    roughness: 0.3,
  });
  const observeBtn = new THREE.Mesh(btnGeo, observeMat);
  observeBtn.position.set(0, 0, 0);
  observeBtn.name = 'Btn_Observe';
  observeBtn.userData = { action: 'observe', tooltip: 'Open & Observe (Collapse)' };
  buttonsGroup.add(observeBtn);
  interactableObjects.push(observeBtn);

  // Button C: Reset Paradox
  const resetMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.5,
    metalness: 0.5,
    roughness: 0.3,
  });
  const resetBtn = new THREE.Mesh(btnGeo, resetMat);
  resetBtn.position.set(0.20, 0, 0);
  resetBtn.name = 'Btn_Reset';
  resetBtn.userData = { action: 'reset', tooltip: 'Reset Paradox' };
  buttonsGroup.add(resetBtn);
  interactableObjects.push(resetBtn);

  envGroup.add(buttonsGroup);
  scene.add(envGroup);
}
buildLabEnvironment();

// ==========================================
// 3D MODELS LOADING & CACHING
// ==========================================
const gltfLoader = new GLTFLoader();
const apparatus = {
  box: null,
  boxLid: null,
  glassWindow: null,
  cat: null,
  catHead: null,
  catChest: null,
  catTail: [],
  catEyes: [],
  geiger: null,
  geigerNeedle: null,
  geigerRedLight: null,
  hammer: null,
  hammerLever: null,
  vial: null,
  intactVial: [],
  brokenVial: [],
  atom: null,
};

const mixers = [];
let atomActions = [];
let hammerAction = null;
let geigerRedAction = null;

async function loadModel(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject);
  });
}

async function initApparatus() {
  try {
    // 1. Box
    // 1. Box (Scaled up to 1.22 for spacious chamber)
    const boxGltf = await loadModel('/models/Box.glb');
    apparatus.box = boxGltf.scene;
    apparatus.box.position.set(-0.4, 0.79, 0.05);
    apparatus.box.scale.set(1.22, 1.22, 1.22);
    apparatus.box.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      if (child.name === 'Lid_Hinged') {
        apparatus.boxLid = child;
        child.rotation.x = -1.9; // Initially open
      }
      if (child.name === 'Front_Glass_Window' && child.material) {
        apparatus.glassWindow = child;
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.45;
        child.material.roughness = 0.08;
        child.material.transmission = 0.85;
      }
    });
    apparatus.box.userData = { action: 'toggleSeal', tooltip: 'Chamber Lid' };
    interactableObjects.push(apparatus.box);
    scene.add(apparatus.box);

    // 2. Cat (Right side of chamber, full headroom & breathing room)
    const catGltf = await loadModel('/models/Cat.glb');
    apparatus.cat = catGltf.scene;
    apparatus.cat.position.set(0.32, 0.84, 0.15);
    apparatus.cat.rotation.y = -0.55;
    apparatus.cat.scale.set(0.46, 0.46, 0.46);
    apparatus.cat.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
      if (child.name === 'Cat_Head') apparatus.catHead = child;
      if (child.name === 'Cat_Chest') apparatus.catChest = child;
      if (child.name && child.name.startsWith('Cat_Tail_Segment')) {
        apparatus.catTail.push(child);
      }
      if (child.name && child.name.includes('Eye')) {
        apparatus.catEyes.push(child);
      }
    });
    apparatus.cat.userData = { action: 'inspectCat', tooltip: 'Quantum Cat' };
    interactableObjects.push(apparatus.cat);
    scene.add(apparatus.cat);

    // 3. Geiger Counter (Spaced to left of center, probe pointing toward atom)
    const geigerGltf = await loadModel('/models/Geiger_Counter.glb');
    apparatus.geiger = geigerGltf.scene;
    apparatus.geiger.position.set(-0.85, 0.84, 0.05);
    apparatus.geiger.rotation.y = 0.35;
    apparatus.geiger.scale.set(0.70, 0.70, 0.70);
    apparatus.geiger.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
      if (child.name === 'Dial_Needle_Pivot' || child.name === 'Dial_Needle') {
        apparatus.geigerNeedle = child;
      }
      if (child.name === 'Status_Light_Red') {
        apparatus.geigerRedLight = child;
      }
    });
    if (geigerGltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(apparatus.geiger);
      for (const clip of geigerGltf.animations) {
        if (clip.name.includes('Red')) {
          geigerRedAction = mixer.clipAction(clip);
          geigerRedAction.setLoop(THREE.LoopRepeat);
        }
      }
      mixers.push(mixer);
    }
    apparatus.geiger.userData = { action: 'testGeiger', tooltip: 'Geiger-Müller Radiation Detector' };
    interactableObjects.push(apparatus.geiger);
    scene.add(apparatus.geiger);

    // 4. Hammer (Spaced between Geiger Counter and Cat)
    const hammerGltf = await loadModel('/models/Hammer.glb');
    apparatus.hammer = hammerGltf.scene;
    apparatus.hammer.position.set(-0.38, 0.84, 0.18);
    apparatus.hammer.scale.set(0.62, 0.62, 0.62);
    apparatus.hammer.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
      if (child.name === 'Trigger_Hammer_Head' || child.name === 'Trigger_Lever') {
        apparatus.hammerLever = child;
      }
    });
    if (hammerGltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(apparatus.hammer);
      for (const clip of hammerGltf.animations) {
        hammerAction = mixer.clipAction(clip);
        hammerAction.setLoop(THREE.LoopOnce);
        hammerAction.clampWhenFinished = true;
      }
      mixers.push(mixer);
    }
    scene.add(apparatus.hammer);

    // 5. Poison Vial (Directly below hammer strike target)
    const vialGltf = await loadModel('/models/PoisionVial.glb');
    apparatus.vial = vialGltf.scene;
    apparatus.vial.position.set(-0.38, 0.84, 0.36);
    apparatus.vial.scale.set(0.68, 0.68, 0.68);
    apparatus.vial.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
      if (child.name.startsWith('Broken_')) {
        child.visible = false;
        apparatus.brokenVial.push(child);
      } else if (child.name.startsWith('Vial_')) {
        child.visible = true;
        apparatus.intactVial.push(child);
      }
    });
    apparatus.vial.userData = { tooltip: 'Hydrocyanic Poison Vial' };
    scene.add(apparatus.vial);

    // 6. Radioactive Atom (Far left chamber, floating freely)
    const atomGltf = await loadModel('/models/RadioactiveAtom.glb');
    apparatus.atom = atomGltf.scene;
    apparatus.atom.position.set(-1.18, 1.22, -0.15);
    apparatus.atom.scale.set(0.18, 0.18, 0.18);
    if (atomGltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(apparatus.atom);
      for (const clip of atomGltf.animations) {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat);
        action.play();
        atomActions.push(action);
      }
      mixers.push(mixer);
    }
    apparatus.atom.userData = { action: 'inspectAtom', tooltip: 'Radioactive Atom (50% Decay Half-Life)' };
    interactableObjects.push(apparatus.atom);
    scene.add(apparatus.atom);

    updateUI();
  } catch (err) {
    console.error('Error loading apparatus models:', err);
  }
}
initApparatus();

// ==========================================
// 3D SPATIAL ORIENTATION & INSTRUCTION PANEL// ==========================================
// 3D SPATIAL ORIENTATION & INSTRUCTION PANEL (CINEMATIC FLOATING SCREEN)
// ==========================================
const spatialCanvas = document.createElement('canvas');
spatialCanvas.width = 2048;
spatialCanvas.height = 1440;
const spatialCtx = spatialCanvas.getContext('2d');
const spatialTexture = new THREE.CanvasTexture(spatialCanvas);
spatialTexture.colorSpace = THREE.SRGBColorSpace;

// Cinematic Large-Format Holographic Plane Geometry (2.35m x 1.65m)
const spatialPanelGeo = new THREE.PlaneGeometry(2.35, 1.65);
const spatialPanelMat = new THREE.MeshBasicMaterial({
  map: spatialTexture,
  transparent: true,
  opacity: 0.98,
  side: THREE.DoubleSide,
});

// Floating Holographic Screen: Positioned to the right of chamber, hovering in space
const spatialPanel = new THREE.Mesh(spatialPanelGeo, spatialPanelMat);
spatialPanel.position.set(1.78, 1.62, 0.25);
spatialPanel.rotation.set(0, -0.42, 0);
spatialPanel.name = 'Spatial_Orientation_Panel';

// Glowing holographic cyan halo border
const haloGeo = new THREE.PlaneGeometry(2.41, 1.71);
const haloMat = new THREE.MeshBasicMaterial({
  color: 0x00f2fe,
  transparent: true,
  opacity: 0.20,
  side: THREE.DoubleSide,
});
const haloMesh = new THREE.Mesh(haloGeo, haloMat);
haloMesh.position.z = -0.006;
spatialPanel.add(haloMesh);

scene.add(spatialPanel);
interactableObjects.push(spatialPanel);

function renderSpatialOrientationPanel() {
  const ctx = spatialCtx;
  const w = spatialCanvas.width;
  const h = spatialCanvas.height;

  // Background Glass Panel
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(8, 14, 28, 0.96)';
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(18, 18, w - 36, h - 36, 40);
  ctx.fill();
  ctx.stroke();

  // Header Title
  ctx.fillStyle = '#00f2fe';
  ctx.font = 'bold 64px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("SCHRÖDINGER'S CAT — QUANTUM WEBXR", w / 2, 105);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 36px "Outfit", sans-serif';
  ctx.fillText('Superposition Paradox & Measurement Collapse (1935)', w / 2, 165);

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(65, 205);
  ctx.lineTo(w - 65, 205);
  ctx.stroke();

  // Status Badge
  let statusText = 'STATE: CHAMBER OPEN (INSPECTION)';
  let statusBg = 'rgba(0, 242, 254, 0.2)';
  let statusColor = '#00f2fe';

  if (appState.stage === STATES.SUPERPOSITION) {
    statusText = 'STATE: SUPERPOSITION |Ψ⟩ (50% ALIVE / 50% DEAD)';
    statusBg = 'rgba(168, 85, 247, 0.25)';
    statusColor = '#c084fc';
  } else if (appState.stage === STATES.COLLAPSED) {
    if (appState.outcome === 'alive') {
      statusText = 'OUTCOME: WAVE FUNCTION COLLAPSED → CAT SURVIVED! 🐱';
      statusBg = 'rgba(16, 185, 129, 0.25)';
      statusColor = '#34d399';
    } else {
      statusText = 'OUTCOME: WAVE FUNCTION COLLAPSED → ATOM DECAYED (CAT DEAD) 💀';
      statusBg = 'rgba(239, 68, 68, 0.25)';
      statusColor = '#f87171';
    }
  }

  ctx.fillStyle = statusBg;
  ctx.beginPath();
  ctx.roundRect(140, 240, w - 280, 85, 20);
  ctx.fill();
  ctx.fillStyle = statusColor;
  ctx.font = 'bold 38px "JetBrains Mono", monospace';
  ctx.fillText(statusText, w / 2, 296);

  // Content Paragraph
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 44px "Outfit", sans-serif';
  ctx.fillText('1. The Copenhagen Paradox:', 85, 395);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '400 34px "Outfit", sans-serif';
  ctx.fillText(
    'In quantum isolation, until an observer measures the system, the wave function contains both eigenstates:',
    85,
    445
  );

  // Quantum Formula Box
  ctx.fillStyle = 'rgba(121, 40, 202, 0.25)';
  ctx.strokeStyle = '#9333ea';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(85, 490, w - 170, 105, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#d8b4fe';
  ctx.font = 'bold 42px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('|Ψ⟩ = (1/√2)|Alive, Undecayed⟩ + (1/√2)|Dead, Decayed⟩', w / 2, 556);

  // Hand Gestures Section
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 44px "Outfit", sans-serif';
  ctx.fillText('2. Hand Gestures & Orientation:', 85, 670);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '400 33px "Outfit", sans-serif';
  ctx.fillText('🤏 Pinch / Grab: Grip the chamber lid to Seal or Open the box', 115, 730);
  ctx.fillText('👆 Index Poke: Tap the 3D buttons on the tabletop or on this panel', 115, 790);
  ctx.fillText('👁️ Observer Effect: Opening the box forces instantaneous Wave Collapse', 115, 850);

  // Interactive Buttons on 3D Spatial Panel
  const btnY = 985;
  const btnH = 120;
  const btnW = Math.round(w * 0.28); // ~573px

  // Button 1: Seal Box
  ctx.fillStyle = appState.isBoxSealed ? '#475569' : '#f59e0b';
  ctx.beginPath();
  ctx.roundRect(85, btnY, btnW, btnH, 20);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(appState.isBoxSealed ? '✓ Sealed (Isolated)' : '🔒 Seal Chamber', 85 + btnW / 2, btnY + 74);

  // Button 2: Observe
  ctx.fillStyle = '#00f2fe';
  ctx.beginPath();
  ctx.roundRect(737, btnY, btnW, btnH, 20);
  ctx.fill();
  ctx.fillStyle = '#080c14';
  ctx.font = 'bold 36px "Outfit", sans-serif';
  ctx.fillText('👁️ Observe (Collapse)', 737 + btnW / 2, btnY + 74);

  // Button 3: Quantum Vision Peek
  ctx.fillStyle = '#a855f7';
  ctx.beginPath();
  ctx.roundRect(1390, btnY, btnW, btnH, 20);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Outfit", sans-serif';
  ctx.fillText(appState.quantumPeek ? '🔮 Vision: ON' : '🔮 Quantum Peek', 1390 + btnW / 2, btnY + 74);

  // Step instruction at bottom
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 32px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('💡 Tip: In VR, pinch the chamber lid or press tabletop buttons with hands', w / 2, 1200);

  spatialTexture.needsUpdate = true;
}
renderSpatialOrientationPanel();

// ==========================================
// SIMULATION ACTIONS & QUANTUM MECHANICS
// ==========================================
function toggleChamberSeal() {
  sounds.playUiClick();
  if (appState.isBoxSealed) {
    observeChamber();
  } else {
    sealChamber();
  }
}

function sealChamber() {
  appState.isBoxSealed = true;
  appState.stage = STATES.SUPERPOSITION;
  appState.outcome = null;
  sounds.playHammerStrike();
  sounds.startQuantumHum();

  // Make glass frosted/opaque for quantum isolation
  if (apparatus.glassWindow && apparatus.glassWindow.material) {
    apparatus.glassWindow.material.opacity = appState.quantumPeek ? 0.25 : 0.95;
    apparatus.glassWindow.material.roughness = 0.85;
  }

  resetApparatusVisuals();
  updateUI();
}

function observeChamber() {
  sounds.playUiClick();
  appState.isBoxSealed = false;
  appState.stage = STATES.COLLAPSED;
  sounds.stopQuantumHum();

  // Glass becomes transparent upon observation
  if (apparatus.glassWindow && apparatus.glassWindow.material) {
    apparatus.glassWindow.material.opacity = 0.45;
    apparatus.glassWindow.material.roughness = 0.08;
  }

  // 50% Born Rule Quantum Probability
  const isDecayed = Math.random() < appState.decayProbability;
  appState.outcome = isDecayed ? 'dead' : 'alive';

  if (isDecayed) {
    // Branch A: Decayed
    sounds.playDecayBurst();
    if (geigerRedAction) geigerRedAction.play();
    if (apparatus.geigerNeedle) apparatus.geigerNeedle.rotation.z = 1.35;

    setTimeout(() => {
      sounds.playHammerStrike();
      if (hammerAction) hammerAction.reset().play();
    }, 280);

    setTimeout(() => {
      sounds.playVialShatter();
      apparatus.intactVial.forEach((n) => (n.visible = false));
      apparatus.brokenVial.forEach((n) => (n.visible = true));
      poisonGlow.intensity = 1.5;
    }, 480);

    setTimeout(() => {
      if (apparatus.catHead) {
        apparatus.catHead.rotation.z = 0.42;
        apparatus.catHead.rotation.x = -0.32;
      }
    }, 620);
  } else {
    // Branch B: Undecayed (Alive!)
    sounds.playCatMeow();
    if (geigerRedAction) geigerRedAction.stop();
    if (apparatus.geigerNeedle) apparatus.geigerNeedle.rotation.z = 0.05;
    if (apparatus.catHead) {
      apparatus.catHead.rotation.z = 0.0;
      apparatus.catHead.rotation.x = 0.0;
    }
    apparatus.intactVial.forEach((n) => (n.visible = true));
    apparatus.brokenVial.forEach((n) => (n.visible = false));
    poisonGlow.intensity = 0.2;
  }

  updateUI();
}

function toggleQuantumPeek() {
  sounds.playUiClick();
  appState.quantumPeek = !appState.quantumPeek;
  if (apparatus.glassWindow && apparatus.glassWindow.material) {
    if (appState.isBoxSealed) {
      apparatus.glassWindow.material.opacity = appState.quantumPeek ? 0.25 : 0.95;
    }
  }
  updateUI();
}

function resetExperiment() {
  sounds.playUiClick();
  appState.isBoxSealed = false;
  appState.stage = STATES.ORIENTATION;
  appState.outcome = null;
  appState.quantumPeek = false;
  sounds.stopQuantumHum();

  if (apparatus.glassWindow && apparatus.glassWindow.material) {
    apparatus.glassWindow.material.opacity = 0.45;
    apparatus.glassWindow.material.roughness = 0.08;
  }

  resetApparatusVisuals();
  updateUI();
}

function resetApparatusVisuals() {
  if (geigerRedAction) geigerRedAction.stop();
  if (hammerAction) hammerAction.stop();

  if (apparatus.geigerNeedle) apparatus.geigerNeedle.rotation.z = 0.08;
  apparatus.intactVial.forEach((n) => (n.visible = true));
  apparatus.brokenVial.forEach((n) => (n.visible = false));
  poisonGlow.intensity = 0.2;

  if (apparatus.catHead) {
    apparatus.catHead.rotation.z = 0.0;
    apparatus.catHead.rotation.x = 0.0;
  }
}

function updateUI() {
  renderSpatialOrientationPanel();
}

// ==========================================
// POINTER & TOUCH / CLICK INTERACTIONS
// ==========================================
function onPointerDown(event) {
  sounds.ensureContext();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactableObjects, true);

  if (intersects.length > 0) {
    handleObjectInteraction(intersects[0]);
  }
}
window.addEventListener('pointerdown', onPointerDown);

function handleObjectInteraction(hit) {
  let cur = hit.object;
  while (cur) {
    if (cur.userData && cur.userData.action) {
      const act = cur.userData.action;
      if (act === 'toggleSeal') toggleChamberSeal();
      if (act === 'observe') observeChamber();
      if (act === 'reset') resetExperiment();
      if (act === 'testGeiger') sounds.playGeigerClick(0.4);
      if (act === 'inspectCat') sounds.playCatMeow();
      return;
    }

    // Check click on 3D spatial canvas panel
    if (cur.name === 'Spatial_Orientation_Panel' && hit.uv) {
      const u = hit.uv.x;
      const v = 1 - hit.uv.y; // UV is inverted in canvas Y
      // Y range for buttons: v between 0.68 and 0.82
      if (v >= 0.67 && v <= 0.82) {
        if (u >= 0.04 && u <= 0.33) {
          toggleChamberSeal();
        } else if (u >= 0.35 && u <= 0.65) {
          observeChamber();
        } else if (u >= 0.67 && u <= 0.96) {
          toggleQuantumPeek();
        }
      }
      return;
    }
    cur = cur.parent;
  }
}

// Hand Pinch Detection
function checkHandPinch(hand, isLeft) {
  if (!hand || !hand.joints) return;

  const indexTip = hand.joints['index-finger-tip'];
  const thumbTip = hand.joints['thumb-tip'];

  if (indexTip && thumbTip) {
    const dist = indexTip.position.distanceTo(thumbTip.position);
    const isPinching = dist < 0.032;

    if (isLeft) {
      if (isPinching && !appState.isPinchingLeft) {
        onHandPinchTrigger(indexTip.position);
      }
      appState.isPinchingLeft = isPinching;
      indexMarker0.position.copy(indexTip.position);
      indexMarker0.scale.setScalar(isPinching ? 1.6 : 1.0);
    } else {
      if (isPinching && !appState.isPinchingRight) {
        onHandPinchTrigger(indexTip.position);
      }
      appState.isPinchingRight = isPinching;
      indexMarker1.position.copy(indexTip.position);
      indexMarker1.scale.setScalar(isPinching ? 1.6 : 1.0);
    }
  }
}

function onHandPinchTrigger(pos) {
  sounds.ensureContext();
  // Check if hand is near the box lid handle (within 0.28m)
  if (apparatus.box) {
    const boxPos = new THREE.Vector3();
    apparatus.box.getWorldPosition(boxPos);
    boxPos.y += 0.45; // lid height
    if (pos.distanceTo(boxPos) < 0.35) {
      toggleChamberSeal();
      return;
    }
  }

  // Check if hand is near tabletop buttons (in front of chamber)
  const btnOrigin = new THREE.Vector3(-0.4, 0.795, 0.82);
  if (pos.distanceTo(btnOrigin) < 0.3) {
    if (pos.x < -0.3) {
      toggleChamberSeal();
    } else if (pos.x > -0.1) {
      resetExperiment();
    } else {
      observeChamber();
    }
  }
}

// ==========================================
// MAIN ANIMATION LOOP
// ==========================================
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  appState.time += delta;

  controls.update();

  // 1. Update animation mixers (Atom spin, red light, hammer)
  for (const mixer of mixers) {
    mixer.update(delta);
  }

  // 2. Smooth Chamber Lid Animation
  if (apparatus.boxLid) {
    const targetAngle = appState.isBoxSealed ? 0.0 : -1.9;
    apparatus.boxLid.rotation.x += (targetAngle - apparatus.boxLid.rotation.x) * delta * 5.5;
  }

  // 3. Cat Procedural Life / Breathing
  if (apparatus.catChest && appState.outcome !== 'dead') {
    const breath = Math.sin(appState.time * 2.6) * 0.02;
    apparatus.catChest.scale.set(1 + breath, 1 + breath, 1 + breath);
  }

  if (apparatus.catTail.length > 0 && appState.outcome !== 'dead') {
    const sway = Math.sin(appState.time * 2.2) * 0.12;
    apparatus.catTail.forEach((seg, i) => {
      seg.rotation.y = sway * (i + 1) * 0.4;
    });
  }

  // 4. Quantum Superposition Floating Atom bobbing
  if (apparatus.atom) {
    apparatus.atom.position.y = 1.22 + Math.sin(appState.time * 2.0) * 0.015;
    apparatus.atom.rotation.y += delta * 0.4;
  }

  // Floating Anti-Gravity Holographic Screen Hover Animation
  if (spatialPanel) {
    spatialPanel.position.y = 1.48 + Math.sin(appState.time * 1.5) * 0.025;
    spatialPanel.rotation.z = Math.sin(appState.time * 1.1) * 0.007;
  }

  // 5. Hand Pinch Checks
  checkHandPinch(hand0, true);
  checkHandPinch(hand1, false);

  // 6. Ambient Random Geiger Clicks (Background Radiation)
  if (appState.time - appState.lastGeigerClick > 2.8 + Math.random() * 3.0) {
    appState.lastGeigerClick = appState.time;
    if (appState.stage !== STATES.COLLAPSED || appState.outcome === 'alive') {
      sounds.playGeigerClick(0.12);
    }
  }

  renderer.render(scene, camera);
});

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose action handlers for HUD controls
window.__toggleChamberSeal = toggleChamberSeal;
window.__observeChamber = observeChamber;
window.__toggleQuantumPeek = toggleQuantumPeek;
window.__resetExperiment = resetExperiment;

console.log("Schrödinger's Cat WebXR Simulation loaded successfully.");
