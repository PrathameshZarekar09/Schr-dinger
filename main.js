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
  catCollapseT: 0.0, // 0.0 = upright alive, 1.0 = collapsed dead on chamber floor
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
camera.position.set(0.20, 1.52, 2.50);

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
controls.target.set(0.20, 1.15, 0.20);
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

// Poison Green Glow (under vial - added to modelRoot so it rotates with the model)
const poisonGlow = new THREE.PointLight(0x10b981, 0.2, 2.0);
poisonGlow.position.set(-0.38, 0.88, 0.38);

// ==========================================
// INTERACTIVE MODEL ROOT
// Contains the entire experiment (table, chamber, cat, screen)
// Rotate via 1-hand middle pinch, zoom via 2-hand middle pinch
// ==========================================
const modelRoot = new THREE.Group();
modelRoot.name = 'Entire_Model_Root';
scene.add(modelRoot);

// Reference container for tabletop buttons
const tableButtons = {
  sealBtn: null,
  observeBtn: null,
  resetBtn: null,
};

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

// Interaction markers at index fingertips (Index + Thumb pinch: box lid / buttons)
const tipGeo = new THREE.SphereGeometry(0.012, 16, 16);
const tipMat0 = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.8 });
const tipMat1 = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.8 });
const indexMarker0 = new THREE.Mesh(tipGeo, tipMat0);
const indexMarker1 = new THREE.Mesh(tipGeo, tipMat1);
scene.add(indexMarker0);
scene.add(indexMarker1);

// Interaction markers at thumb tips (Middle + Thumb pinch: Zoom & Rotate entire model)
const middleTipGeo = new THREE.SphereGeometry(0.013, 16, 16);
const middleTipMat0 = new THREE.MeshStandardMaterial({
  color: 0xa855f7,
  emissive: 0x7e22ce,
  emissiveIntensity: 0.7,
  roughness: 0.2,
});
const middleTipMat1 = middleTipMat0.clone();
const middleMarker0 = new THREE.Mesh(middleTipGeo, middleTipMat0);
const middleMarker1 = new THREE.Mesh(middleTipGeo, middleTipMat1);
middleMarker0.visible = false;
middleMarker1.visible = false;
scene.add(middleMarker0);
scene.add(middleMarker1);

// Raycaster for pointers & mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const interactableObjects = [];

// ==========================================
// LABORATORY WORKBENCH & ENVIRONMENT
// ==========================================
function buildLabEnvironment() {
  const envGroup = new THREE.Group();

  // 1. Sleek Heavy Laboratory Table (Extended forward so buttons are clearly separated & fully visible)
  const tableTopGeo = new THREE.BoxGeometry(4.0, 0.06, 2.70);
  const tableTopMat = new THREE.MeshStandardMaterial({
    color: 0x161e2e,
    metalness: 0.85,
    roughness: 0.22,
  });
  const tableTop = new THREE.Mesh(tableTopGeo, tableTopMat);
  tableTop.position.set(0.25, 0.76, 0.425);
  tableTop.receiveShadow = true;
  envGroup.add(tableTop);

  // Table Edge Glow (Cyan Neon Strip)
  const edgeGeo = new THREE.BoxGeometry(4.02, 0.014, 2.72);
  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.8,
  });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.set(0.25, 0.79, 0.425);
  envGroup.add(edge);

  // 4 Table Legs
  const legGeo = new THREE.CylinderGeometry(0.042, 0.046, 0.75, 20);
  const legMat = new THREE.MeshStandardMaterial({
    color: 0x0b1120,
    metalness: 0.9,
    roughness: 0.2,
  });
  const legPositions = [
    [-1.65, 0.38, -0.85],
    [2.15, 0.38, -0.85],
    [-1.65, 0.38, 1.62],
    [2.15, 0.38, 1.62],
  ];
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    envGroup.add(leg);
  });

  // Table Crossbar braces
  const braceGeo = new THREE.BoxGeometry(3.8, 0.02, 0.04);
  const brace = new THREE.Mesh(braceGeo, legMat);
  brace.position.set(0.25, 0.2, -0.85);
  envGroup.add(brace);

  const braceFront = new THREE.Mesh(braceGeo, legMat);
  braceFront.position.set(0.25, 0.2, 1.62);
  envGroup.add(braceFront);

  // 2. Quantum Grid Floor (Fixed in world room)
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
  scene.add(floor);

  // Solid dark floor beneath grid
  const solidFloorGeo = new THREE.PlaneGeometry(24, 24);
  const solidFloorMat = new THREE.MeshBasicMaterial({ color: 0x030508 });
  const solidFloor = new THREE.Mesh(solidFloorGeo, solidFloorMat);
  solidFloor.rotation.x = -Math.PI / 2;
  solidFloor.position.y = -0.005;
  scene.add(solidFloor);

  // 4. Tactile 3D Buttons on Tabletop (Raised Control Pedestal in front of chamber, zero overlap)
  const buttonsGroup = new THREE.Group();
  buttonsGroup.position.set(-0.4, 0.792, 1.20);

  // Sleek beveled control console pedestal underneath the 3 buttons
  const pedestalGeo = new THREE.BoxGeometry(0.82, 0.028, 0.26);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.25,
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.set(0, 0.014, 0);
  buttonsGroup.add(pedestal);

  // Glowing cyan trim around console pedestal
  const pedTrimGeo = new THREE.BoxGeometry(0.83, 0.008, 0.27);
  const pedTrimMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.75 });
  const pedTrim = new THREE.Mesh(pedTrimGeo, pedTrimMat);
  pedTrim.position.set(0, 0.025, 0);
  buttonsGroup.add(pedTrim);

  // Console Title Plate
  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = 512;
  plateCanvas.height = 64;
  const plateCtx = plateCanvas.getContext('2d');
  plateCtx.fillStyle = '#080e1a';
  plateCtx.fillRect(0, 0, 512, 64);
  plateCtx.strokeStyle = '#38bdf8';
  plateCtx.lineWidth = 4;
  plateCtx.strokeRect(4, 4, 504, 56);
  plateCtx.fillStyle = '#38bdf8';
  plateCtx.font = 'bold 26px "Outfit", sans-serif';
  plateCtx.textAlign = 'center';
  plateCtx.fillText('⚛ QUANTUM EXPERIMENT CONTROLS', 256, 42);
  const plateTex = new THREE.CanvasTexture(plateCanvas);
  plateTex.colorSpace = THREE.SRGBColorSpace;
  const plateGeo = new THREE.PlaneGeometry(0.44, 0.055);
  const plateMat = new THREE.MeshBasicMaterial({ map: plateTex, transparent: true });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(0, 0.029, -0.08);
  buttonsGroup.add(plate);

  const btnGeo = new THREE.CylinderGeometry(0.048, 0.054, 0.030, 24);

  // Helper to create circular glowing labels for tabletop tactile buttons
  function createTabletopBtnLabel(text, bgColor, strokeColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Outer circle
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(128, 128, 116, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 12;
    ctx.stroke();

    // High contrast text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px "Outfit", system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillText(text, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.0155;
    return mesh;
  }

  // Button A: Seal Box (Superposition)
  const sealMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.5,
    metalness: 0.5,
    roughness: 0.3,
  });
  const sealBtn = new THREE.Mesh(btnGeo, sealMat);
  sealBtn.position.set(-0.25, 0.042, 0.035);
  sealBtn.name = 'Btn_Seal';
  sealBtn.userData = { action: 'toggleSeal', tooltip: 'Seal Chamber (Superposition)' };
  sealBtn.add(createTabletopBtnLabel('SEAL', '#d97706', '#fde047'));
  buttonsGroup.add(sealBtn);
  interactableObjects.push(sealBtn);
  tableButtons.sealBtn = sealBtn;

  // Button B: Observe (Collapse Wavefunction)
  const observeMat = new THREE.MeshStandardMaterial({
    color: 0x00f2fe,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    metalness: 0.5,
    roughness: 0.3,
  });
  const observeBtn = new THREE.Mesh(btnGeo, observeMat);
  observeBtn.position.set(0, 0.042, 0.035);
  observeBtn.name = 'Btn_Observe';
  observeBtn.userData = { action: 'observe', tooltip: 'Open & Observe (Collapse)' };
  observeBtn.add(createTabletopBtnLabel('OBSERVE', '#0284c7', '#38bdf8'));
  buttonsGroup.add(observeBtn);
  interactableObjects.push(observeBtn);
  tableButtons.observeBtn = observeBtn;

  // Button C: Reset Paradox
  const resetMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.5,
    metalness: 0.5,
    roughness: 0.3,
  });
  const resetBtn = new THREE.Mesh(btnGeo, resetMat);
  resetBtn.position.set(0.25, 0.042, 0.035);
  resetBtn.name = 'Btn_Reset';
  resetBtn.userData = { action: 'reset', tooltip: 'Reset Paradox' };
  resetBtn.add(createTabletopBtnLabel('RESET', '#7e22ce', '#c084fc'));
  buttonsGroup.add(resetBtn);
  interactableObjects.push(resetBtn);
  tableButtons.resetBtn = resetBtn;

  envGroup.add(buttonsGroup);

  // 5. Tactile Workbench Grab Bar (At the extended front edge of the table)
  const grabBarGroup = new THREE.Group();
  grabBarGroup.position.set(0.25, 0.79, 1.72);

  const grabRailGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.25, 24);
  grabRailGeo.rotateZ(Math.PI / 2);
  const grabRailMat = new THREE.MeshStandardMaterial({
    color: 0x00f2fe,
    emissive: 0x0284c7,
    emissiveIntensity: 0.75,
    metalness: 0.9,
    roughness: 0.15,
  });
  const grabRail = new THREE.Mesh(grabRailGeo, grabRailMat);
  grabRail.name = 'Workbench_Grab_Rail';
  grabRail.userData = { action: 'grabModel', tooltip: 'Grab & Move entire workbench' };
  grabBarGroup.add(grabRail);
  interactableObjects.push(grabRail);

  // Standoff brackets
  const bracketGeo = new THREE.BoxGeometry(0.026, 0.035, 0.05);
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
  const b1 = new THREE.Mesh(bracketGeo, bracketMat);
  b1.position.set(-0.60, 0, -0.025);
  const b2 = new THREE.Mesh(bracketGeo, bracketMat);
  b2.position.set(0.60, 0, -0.025);
  grabBarGroup.add(b1);
  grabBarGroup.add(b2);

  // Grab handle label banner
  const bannerCanvas = document.createElement('canvas');
  bannerCanvas.width = 512;
  bannerCanvas.height = 80;
  const bCtx = bannerCanvas.getContext('2d');
  bCtx.fillStyle = '#080e1a';
  bCtx.fillRect(0, 0, 512, 80);
  bCtx.strokeStyle = '#00f2fe';
  bCtx.lineWidth = 4;
  bCtx.strokeRect(4, 4, 504, 72);
  bCtx.fillStyle = '#00f2fe';
  bCtx.font = 'bold 30px "Outfit", sans-serif';
  bCtx.textAlign = 'center';
  bCtx.fillText('✥ GRAB & PLACE WORKBENCH', 256, 52);
  const bannerTex = new THREE.CanvasTexture(bannerCanvas);
  bannerTex.colorSpace = THREE.SRGBColorSpace;
  const bannerGeo = new THREE.PlaneGeometry(0.50, 0.075);
  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(0, 0.03, 0.015);
  banner.rotation.x = -Math.PI / 8;
  banner.name = 'Workbench_Grab_Banner';
  banner.userData = { action: 'grabModel', tooltip: 'Grab & Move entire workbench' };
  grabBarGroup.add(banner);
  interactableObjects.push(banner);

  envGroup.add(grabBarGroup);

  // Add table, buttons, and grab bar to modelRoot so they rotate, scale, and move together
  modelRoot.add(envGroup);
}
buildLabEnvironment();

// ==========================================
// 3D MODELS LOADING & CACHING
// ==========================================
// Cat Posture Poses (Inside Chamber)
// Upright healthy cat on feet
const CAT_ALIVE_POS = new THREE.Vector3(0.32, 0.84, 0.15);
const CAT_ALIVE_ROT = new THREE.Euler(0, -0.55, 0, 'XYZ');
const CAT_ALIVE_QUAT = new THREE.Quaternion().setFromEuler(CAT_ALIVE_ROT);

// Dead cat collapsed on its side resting on chamber floor
const CAT_DEAD_POS = new THREE.Vector3(0.24, 1.02, 0.02);
const CAT_DEAD_ROT = new THREE.Euler(0.12, -0.60, -1.46, 'XYZ');
const CAT_DEAD_QUAT = new THREE.Quaternion().setFromEuler(CAT_DEAD_ROT);

function createDeadEyeCross(x, y, z) {
  const crossGroup = new THREE.Group();
  crossGroup.position.set(x, y, z);
  const armMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Quantum red / crimson X marker
    emissive: 0xdc2626,
    emissiveIntensity: 0.8,
    roughness: 0.25,
  });
  const barGeo = new THREE.BoxGeometry(0.016, 0.075, 0.014);
  const bar1 = new THREE.Mesh(barGeo, armMat);
  bar1.rotation.z = Math.PI / 4;
  const bar2 = new THREE.Mesh(barGeo, armMat);
  bar2.rotation.z = -Math.PI / 4;
  crossGroup.add(bar1);
  crossGroup.add(bar2);
  return crossGroup;
}

const deadEyeMat = new THREE.MeshStandardMaterial({
  color: 0x334155, // Dull lifeless slate grey
  roughness: 0.85,
  metalness: 0.05,
});

const deadPupilMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  roughness: 0.9,
});

const apparatus = {
  box: null,
  boxLid: null,
  glassWindow: null,
  cat: null,
  catHead: null,
  catChest: null,
  catTail: [],
  catEyes: [],
  catPupils: [],
  catEyeHighlights: [],
  deadEyes: null,
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

function setCatDeadVisuals(isDead) {
  if (apparatus.deadEyes) {
    apparatus.deadEyes.visible = isDead;
  }
  apparatus.catEyeHighlights.forEach((h) => {
    h.visible = !isDead;
  });
  apparatus.catEyes.forEach((eye) => {
    if (!eye.userData.origMat) eye.userData.origMat = eye.material;
    eye.material = isDead ? deadEyeMat : eye.userData.origMat;
  });
  apparatus.catPupils.forEach((pupil) => {
    if (!pupil.userData.origMat) pupil.userData.origMat = pupil.material;
    pupil.material = isDead ? deadPupilMat : pupil.userData.origMat;
  });
}

const mixers = [];
let atomActions = [];
let hammerAction = null;
let geigerRedAction = null;
const gltfLoader = new GLTFLoader();

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
    modelRoot.add(apparatus.box);

    // 2. Cat (Right side of chamber, full headroom & breathing room)
    const catGltf = await loadModel('/models/Cat.glb');
    apparatus.cat = catGltf.scene;
    apparatus.cat.position.copy(CAT_ALIVE_POS);
    apparatus.cat.quaternion.copy(CAT_ALIVE_QUAT);
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
      if (child.name === 'Cat_Eye_L' || child.name === 'Cat_Eye_R') {
        apparatus.catEyes.push(child);
      }
      if (child.name === 'Cat_Pupil_L' || child.name === 'Cat_Pupil_R') {
        apparatus.catPupils.push(child);
      }
      if (child.name && child.name.includes('Eye_Highlight')) {
        apparatus.catEyeHighlights.push(child);
      }
    });

    // Create stylized "X_X" cross markers for the dead collapsed cat
    const deadEyesGroup = new THREE.Group();
    deadEyesGroup.name = 'Dead_Eyes_Group';
    deadEyesGroup.add(createDeadEyeCross(-0.145, 1.39, 0.85));
    deadEyesGroup.add(createDeadEyeCross(0.145, 1.39, 0.85));
    deadEyesGroup.visible = false;
    apparatus.cat.add(deadEyesGroup);
    apparatus.deadEyes = deadEyesGroup;

    apparatus.cat.userData = { action: 'inspectCat', tooltip: 'Quantum Cat' };
    interactableObjects.push(apparatus.cat);
    modelRoot.add(apparatus.cat);

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
    modelRoot.add(apparatus.geiger);

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
    modelRoot.add(apparatus.hammer);

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
    modelRoot.add(apparatus.vial);
    modelRoot.add(poisonGlow);

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
    modelRoot.add(apparatus.atom);

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

// Cinematic Holographic Panel Geometry (Placed exact side to the box with clean distance, flat & untilted)
const spatialPanelGeo = new THREE.PlaneGeometry(1.20, 0.84);
const spatialPanelMat = new THREE.MeshBasicMaterial({
  map: spatialTexture,
  transparent: true,
  opacity: 0.98,
  side: THREE.DoubleSide,
});

// Floating Holographic Screen: Brought closer forward (Z: 0.45) and closer beside the box (X: 1.48)
const spatialPanel = new THREE.Mesh(spatialPanelGeo, spatialPanelMat);
// Box right wall ends at x = +0.82. Screen left edge is at x = 0.88 (6cm safe clearance, zero clipping)
spatialPanel.position.set(1.48, 1.25, 0.45);
spatialPanel.rotation.set(0, 0, 0);
spatialPanel.name = 'Spatial_Orientation_Panel';

// Glowing holographic cyan halo border
const haloGeo = new THREE.PlaneGeometry(1.24, 0.88);
const haloMat = new THREE.MeshBasicMaterial({
  color: 0x00f2fe,
  transparent: true,
  opacity: 0.20,
  side: THREE.DoubleSide,
});
const haloMesh = new THREE.Mesh(haloGeo, haloMat);
haloMesh.position.set(0, 0, -0.005);
haloMesh.rotation.set(0, 0, 0);
haloMesh.raycast = () => {}; // Prevent halo border from blocking raycasts
spatialPanel.add(haloMesh);

// ==========================================
// 3D TACTILE BUTTONS ON DISPLAY PANEL (WITH CRISP HIGH-CONTRAST 3D TEXT LABELS)
// ==========================================
const panelButtons = {
  sealBtn: null,
  observeBtn: null,
  peekBtn: null,
};

const BTN_TEX_W = 1024;
const BTN_TEX_H = 256;

// Create dedicated canvas & textures for each button on the display panel
const sealBtnCanvas = document.createElement('canvas');
sealBtnCanvas.width = BTN_TEX_W;
sealBtnCanvas.height = BTN_TEX_H;
const sealBtnCtx = sealBtnCanvas.getContext('2d');
const sealBtnTex = new THREE.CanvasTexture(sealBtnCanvas);
sealBtnTex.colorSpace = THREE.SRGBColorSpace;

const obsBtnCanvas = document.createElement('canvas');
obsBtnCanvas.width = BTN_TEX_W;
obsBtnCanvas.height = BTN_TEX_H;
const obsBtnCtx = obsBtnCanvas.getContext('2d');
const obsBtnTex = new THREE.CanvasTexture(obsBtnCanvas);
obsBtnTex.colorSpace = THREE.SRGBColorSpace;

const peekBtnCanvas = document.createElement('canvas');
peekBtnCanvas.width = BTN_TEX_W;
peekBtnCanvas.height = BTN_TEX_H;
const peekBtnCtx = peekBtnCanvas.getContext('2d');
const peekBtnTex = new THREE.CanvasTexture(peekBtnCanvas);
peekBtnTex.colorSpace = THREE.SRGBColorSpace;

function drawPanelButtonFace(ctx, w, h, config) {
  ctx.clearRect(0, 0, w, h);

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, config.bgStart);
  grad.addColorStop(1, config.bgEnd);

  // Outer Rounded Pill
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(10, 10, w - 20, h - 20, 38);
  ctx.fill();

  // Vibrant neon border
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = 12;
  ctx.stroke();

  // Subtle inner glassy bevel
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(20, 20, w - 40, h - 40, 30);
  ctx.stroke();

  // Main Action Text (Large, High-Contrast, Crystal-Clear)
  ctx.fillStyle = config.textColor || '#ffffff';
  ctx.font = 'bold 58px "Outfit", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  ctx.fillText(config.title, w / 2, h * 0.40);

  // Secondary State/Subtext Badge
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = config.subtextColor || 'rgba(255, 255, 255, 0.9)';
  ctx.font = '600 28px "JetBrains Mono", monospace';
  ctx.fillText(config.subtext, w / 2, h * 0.77);
}

function updatePanelButtonsText() {
  // 1. Seal Chamber Button
  if (appState.isBoxSealed) {
    drawPanelButtonFace(sealBtnCtx, BTN_TEX_W, BTN_TEX_H, {
      bgStart: '#0f766e',
      bgEnd: '#042f2e',
      borderColor: '#34d399',
      textColor: '#ffffff',
      subtextColor: '#a7f3d0',
      title: '✓ CHAMBER SEALED',
      subtext: 'QUANTUM ISOLATION ACTIVE',
    });
  } else {
    drawPanelButtonFace(sealBtnCtx, BTN_TEX_W, BTN_TEX_H, {
      bgStart: '#f59e0b',
      bgEnd: '#b45309',
      borderColor: '#fde047',
      textColor: '#ffffff',
      subtextColor: '#fef3c7',
      title: '🔒 SEAL CHAMBER',
      subtext: 'ENTER SUPERPOSITION',
    });
  }
  sealBtnTex.needsUpdate = true;

  // 2. Observe Chamber Button
  drawPanelButtonFace(obsBtnCtx, BTN_TEX_W, BTN_TEX_H, {
    bgStart: '#0284c7',
    bgEnd: '#0369a1',
    borderColor: '#38bdf8',
    textColor: '#ffffff',
    subtextColor: '#e0f2fe',
    title: '👁️ OBSERVE & COLLAPSE',
    subtext: 'MEASURE WAVEFUNCTION',
  });
  obsBtnTex.needsUpdate = true;

  // 3. Quantum Peek Button
  if (appState.quantumPeek) {
    drawPanelButtonFace(peekBtnCtx, BTN_TEX_W, BTN_TEX_H, {
      bgStart: '#9333ea',
      bgEnd: '#c026d3',
      borderColor: '#f0abfc',
      textColor: '#ffffff',
      subtextColor: '#fae8ff',
      title: '🔮 VISION: ACTIVE',
      subtext: 'CHAMBER LID TRANSPARENT',
    });
  } else {
    drawPanelButtonFace(peekBtnCtx, BTN_TEX_W, BTN_TEX_H, {
      bgStart: '#7e22ce',
      bgEnd: '#581c87',
      borderColor: '#c084fc',
      textColor: '#ffffff',
      subtextColor: '#f3e8ff',
      title: '🔮 QUANTUM PEEK',
      subtext: 'X-RAY CHAMBER LID',
    });
  }
  peekBtnTex.needsUpdate = true;
}

const pBtnGeo = new THREE.BoxGeometry(0.34, 0.08, 0.022);
const pBtnSideMat = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  roughness: 0.35,
  metalness: 0.7,
});

const createPanelBtnMats = (tex) => {
  const frontMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: false,
    toneMapped: false,
  });
  return [pBtnSideMat, pBtnSideMat, pBtnSideMat, pBtnSideMat, frontMat, pBtnSideMat];
};

// Button 1: Seal Chamber (Amber)
const panelBtnSeal = new THREE.Mesh(pBtnGeo, createPanelBtnMats(sealBtnTex));
panelBtnSeal.position.set(-0.382, -0.190, 0.016);
panelBtnSeal.name = 'Panel_Btn_Seal';
panelBtnSeal.userData = { action: 'toggleSeal', tooltip: 'Seal Chamber' };
spatialPanel.add(panelBtnSeal);
interactableObjects.push(panelBtnSeal);
panelButtons.sealBtn = panelBtnSeal;

// Button 2: Observe & Collapse (Cyan)
const panelBtnObserve = new THREE.Mesh(pBtnGeo, createPanelBtnMats(obsBtnTex));
panelBtnObserve.position.set(0.000, -0.190, 0.016);
panelBtnObserve.name = 'Panel_Btn_Observe';
panelBtnObserve.userData = { action: 'observe', tooltip: 'Observe Chamber (Collapse)' };
spatialPanel.add(panelBtnObserve);
interactableObjects.push(panelBtnObserve);
panelButtons.observeBtn = panelBtnObserve;

// Button 3: Quantum Peek (Purple)
const panelBtnPeek = new THREE.Mesh(pBtnGeo, createPanelBtnMats(peekBtnTex));
panelBtnPeek.position.set(0.382, -0.190, 0.016);
panelBtnPeek.name = 'Panel_Btn_Peek';
panelBtnPeek.userData = { action: 'togglePeek', tooltip: 'Quantum Peek Vision' };
spatialPanel.add(panelBtnPeek);
interactableObjects.push(panelBtnPeek);
panelButtons.peekBtn = panelBtnPeek;

// Initial render of panel button text textures
updatePanelButtonsText();

// Add to modelRoot so the screen stays exact side to the box when rotated or zoomed
modelRoot.add(spatialPanel);
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
  ctx.fillText('2. Hand Gestures & Spatial Placement Controls:', 85, 660);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '400 31px "Outfit", sans-serif';
  ctx.fillText('🤏 Middle Finger + Thumb (Both hands): Zoom & Reposition at hand level', 115, 715);
  ctx.fillText('🤏 Middle Finger + Thumb (One hand): Grab, Move & Place model anywhere', 115, 765);
  ctx.fillText('🤏 Index Finger + Thumb: Grip chamber lid or Grab Bar to move', 115, 815);
  ctx.fillText('🎮 Controller Grip (Squeeze): Grab & Place entire model in 3D', 115, 865);

  // Interactive Buttons on 3D Spatial Panel
  const btnY = 985;
  const btnH = 120;
  const btnW = Math.round(w * 0.28); // ~573px

  // Button 1: Seal Box
  ctx.fillStyle = appState.isBoxSealed ? '#334155' : '#f59e0b';
  ctx.strokeStyle = appState.isBoxSealed ? '#64748b' : '#fde047';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(85, btnY, btnW, btnH, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(appState.isBoxSealed ? '✓ Sealed (Isolated)' : '🔒 Seal Chamber', 85 + btnW / 2, btnY + 76);

  // Button 2: Observe
  ctx.fillStyle = '#00f2fe';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(737, btnY, btnW, btnH, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#080c14';
  ctx.font = 'bold 38px "Outfit", sans-serif';
  ctx.fillText('👁️ Observe (Collapse)', 737 + btnW / 2, btnY + 76);

  // Button 3: Quantum Vision Peek
  ctx.fillStyle = appState.quantumPeek ? '#a855f7' : '#7e22ce';
  ctx.strokeStyle = '#d8b4fe';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(1390, btnY, btnW, btnH, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px "Outfit", sans-serif';
  ctx.fillText(appState.quantumPeek ? '🔮 Vision: ON' : '🔮 Quantum Peek', 1390 + btnW / 2, btnY + 76);

  // Step instruction at bottom
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 32px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('💡 Tip: Pinch 1 hand (or Grip) to Grab & Place, or 2 hands to Zoom at hand level without sinking', w / 2, 1200);

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
      // Trigger Cat Physical Collapse onto chamber floor
      sounds.playCatCollapse();
      setCatDeadVisuals(true);
      if (apparatus.catHead) {
        apparatus.catHead.rotation.x = -0.32;
        apparatus.catHead.rotation.z = 0.28;
      }
    }, 620);
  } else {
    // Branch B: Undecayed (Alive!)
    sounds.playCatMeow();
    if (geigerRedAction) geigerRedAction.stop();
    if (apparatus.geigerNeedle) apparatus.geigerNeedle.rotation.z = 0.05;
    setCatDeadVisuals(false);
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

  setCatDeadVisuals(false);
  appState.catCollapseT = 0.0;

  if (apparatus.cat) {
    apparatus.cat.position.copy(CAT_ALIVE_POS);
    apparatus.cat.quaternion.copy(CAT_ALIVE_QUAT);
  }
  if (apparatus.catHead) {
    apparatus.catHead.rotation.z = 0.0;
    apparatus.catHead.rotation.x = 0.0;
  }
}

function updateUI() {
  renderSpatialOrientationPanel();
  updatePanelButtonsText();
}

// ==========================================
// POINTER & TOUCH / CLICK INTERACTIONS
// ==========================================
let isDesktopDraggingModel = false;
const prevDesktopPointerPos = new THREE.Vector2();

function onPointerDown(event) {
  sounds.ensureContext();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  prevDesktopPointerPos.set(event.clientX, event.clientY);

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactableObjects, true);

  if (intersects.length > 0) {
    handleObjectInteraction(intersects[0]);
  }
}
window.addEventListener('pointerdown', onPointerDown);

window.addEventListener('pointermove', (event) => {
  if (isDesktopDraggingModel) {
    const dx = (event.clientX - prevDesktopPointerPos.x) * 0.0035;
    const dy = (event.clientY - prevDesktopPointerPos.y) * 0.0035;
    modelRoot.position.x += dx;
    modelRoot.position.y -= dy; // mouse Y inverted
    prevDesktopPointerPos.set(event.clientX, event.clientY);
  }
});

window.addEventListener('pointerup', () => {
  isDesktopDraggingModel = false;
});

function handleObjectInteraction(hit) {
  let cur = hit.object;
  while (cur) {
    if (cur.userData && cur.userData.action) {
      const act = cur.userData.action;
      if (act === 'toggleSeal') toggleChamberSeal();
      if (act === 'observe') observeChamber();
      if (act === 'reset') resetExperiment();
      if (act === 'togglePeek') toggleQuantumPeek();
      if (act === 'grabModel') {
        isDesktopDraggingModel = true;
        sounds.playUiClick();
      }
      if (act === 'testGeiger') sounds.playGeigerClick(0.4);
      if (act === 'inspectCat') {
        if (appState.outcome === 'dead') {
          sounds.playCatCollapse();
        } else {
          sounds.playCatMeow();
        }
      }
      return;
    }

    // Check click on 3D spatial canvas panel
    if (cur.name === 'Spatial_Orientation_Panel' && hit.uv) {
      const u = hit.uv.x;
      const v = 1 - hit.uv.y; // UV is inverted in canvas Y
      if (v >= 0.65 && v <= 0.85) {
        if (u >= 0.03 && u <= 0.34) {
          toggleChamberSeal();
        } else if (u >= 0.35 && u <= 0.66) {
          observeChamber();
        } else if (u >= 0.67 && u <= 0.97) {
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
  // Check if hand is near the box lid handle
  if (apparatus.box) {
    const boxPos = new THREE.Vector3();
    apparatus.box.getWorldPosition(boxPos);
    boxPos.y += 0.45 * modelRoot.scale.y;
    if (pos.distanceTo(boxPos) < 0.38 * Math.max(modelRoot.scale.x, 0.4)) {
      toggleChamberSeal();
      return;
    }
  }

  // Check if hand is near tabletop buttons
  if (tableButtons.sealBtn && tableButtons.observeBtn && tableButtons.resetBtn) {
    const sealPos = new THREE.Vector3();
    const obsPos = new THREE.Vector3();
    const rstPos = new THREE.Vector3();
    tableButtons.sealBtn.getWorldPosition(sealPos);
    tableButtons.observeBtn.getWorldPosition(obsPos);
    tableButtons.resetBtn.getWorldPosition(rstPos);

    const hitThreshold = 0.14 * Math.max(modelRoot.scale.x, 0.4);
    if (pos.distanceTo(sealPos) < hitThreshold) {
      toggleChamberSeal();
      return;
    }
    if (pos.distanceTo(obsPos) < hitThreshold) {
      observeChamber();
      return;
    }
    if (pos.distanceTo(rstPos) < hitThreshold) {
      resetExperiment();
      return;
    }
  }

  // Check if hand is near the Workbench Grab Bar handle
  const grabPos = new THREE.Vector3();
  modelRoot.localToWorld(grabPos.set(0.25, 0.79, 1.72));
  if (pos.distanceTo(grabPos) < 0.38 * Math.max(modelRoot.scale.x, 0.4)) {
    middleGestureState.oneHandActive = true;
    middleGestureState.activeHandId = 0;
    middleGestureState.prevPinchPos.copy(pos);
    sounds.playUiClick();
    return;
  }

  // Check if hand is near Spatial Panel buttons
  const pBtns = [panelButtons.sealBtn, panelButtons.observeBtn, panelButtons.peekBtn];
  for (const btn of pBtns) {
    if (btn) {
      const btnPos = new THREE.Vector3();
      btn.getWorldPosition(btnPos);
      if (pos.distanceTo(btnPos) < 0.22 * Math.max(modelRoot.scale.x, 0.35)) {
        if (btn.userData.action === 'toggleSeal') toggleChamberSeal();
        if (btn.userData.action === 'observe') observeChamber();
        if (btn.userData.action === 'togglePeek') toggleQuantumPeek();
        return;
      }
    }
  }

  // Far pinch raycasting from hand toward gaze/forward
  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  const handRayDir = new THREE.Vector3().subVectors(pos, camPos).normalize();
  raycaster.set(pos, handRayDir);
  const hits = raycaster.intersectObjects(interactableObjects, true);
  if (hits.length > 0) {
    handleObjectInteraction(hits[0]);
    return;
  }
}

// ==========================================
// MODEL MANIPULATION GESTURE TRACKING
// Two Hands: Zoom In / Out & Reposition (Bimanual RST anchored at hand midpoint)
// One Hand: Grab, Move & Place anywhere in 3D + Rotate
// ==========================================
const middleGestureState = {
  // Two-hand Zoom & Placement (RST)
  twoHandActive: false,
  initialHandDist: 0,
  initialModelScale: 1.0,
  initialMidpointLocal: new THREE.Vector3(),
  initialAngle: 0,
  initialRotY: 0,

  // One-hand Grab & Place
  oneHandActive: false,
  activeHandId: -1,
  prevPinchPos: new THREE.Vector3(),
};

function getMiddlePinchData(hand) {
  if (!hand || !hand.joints) return null;
  const middleTip = hand.joints['middle-finger-tip'];
  const thumbTip = hand.joints['thumb-tip'];
  if (!middleTip || !thumbTip) return null;

  const mPos = middleTip.position;
  const tPos = thumbTip.position;
  if (!isFinite(mPos.x) || !isFinite(tPos.x)) return null;

  const dist = mPos.distanceTo(tPos);
  const isPinching = dist < 0.035;
  const pinchPos = new THREE.Vector3().addVectors(mPos, tPos).multiplyScalar(0.5);

  return {
    isPinching,
    dist,
    pinchPos,
    thumbPos: tPos,
    middlePos: mPos,
  };
}

function processMiddleFingerModelGestures() {
  const pinch0 = getMiddlePinchData(hand0);
  const pinch1 = getMiddlePinchData(hand1);

  const isPinch0 = !!(pinch0 && pinch0.isPinching);
  const isPinch1 = !!(pinch1 && pinch1.isPinching);

  // Update visual markers to align directly on thumb tips
  if (pinch0) {
    middleMarker0.visible = true;
    middleMarker0.position.copy(pinch0.thumbPos);
    if (isPinch0) {
      middleMarker0.scale.setScalar(1.6);
      middleMarker0.material.color.setHex(0x00f2fe);
      middleMarker0.material.emissive.setHex(0x00f2fe);
    } else {
      middleMarker0.scale.setScalar(1.0);
      middleMarker0.material.color.setHex(0xa855f7);
      middleMarker0.material.emissive.setHex(0x7e22ce);
    }
  } else {
    middleMarker0.visible = false;
  }

  if (pinch1) {
    middleMarker1.visible = true;
    middleMarker1.position.copy(pinch1.thumbPos);
    if (isPinch1) {
      middleMarker1.scale.setScalar(1.6);
      middleMarker1.material.color.setHex(0x00f2fe);
      middleMarker1.material.emissive.setHex(0x00f2fe);
    } else {
      middleMarker1.scale.setScalar(1.0);
      middleMarker1.material.color.setHex(0xa855f7);
      middleMarker1.material.emissive.setHex(0x7e22ce);
    }
  } else {
    middleMarker1.visible = false;
  }

  // 1. BOTH HANDS PINCHING -> BIMANUAL ZOOM & REPOSITION (Pivots on hand midpoint)
  if (isPinch0 && isPinch1) {
    middleGestureState.oneHandActive = false;
    const currentDist = pinch0.pinchPos.distanceTo(pinch1.pinchPos);
    const currentMidpoint = new THREE.Vector3().addVectors(pinch0.pinchPos, pinch1.pinchPos).multiplyScalar(0.5);
    const currentAngle = Math.atan2(
      pinch1.pinchPos.x - pinch0.pinchPos.x,
      pinch1.pinchPos.z - pinch0.pinchPos.z
    );

    if (!middleGestureState.twoHandActive) {
      middleGestureState.twoHandActive = true;
      middleGestureState.initialHandDist = currentDist;
      middleGestureState.initialModelScale = modelRoot.scale.x;
      // Convert world midpoint into local model coordinates for anchor preservation
      middleGestureState.initialMidpointLocal.copy(modelRoot.worldToLocal(currentMidpoint.clone()));
      middleGestureState.initialAngle = currentAngle;
      middleGestureState.initialRotY = modelRoot.rotation.y;
    } else if (middleGestureState.initialHandDist > 0.01) {
      // Scale (Zoom):
      const scaleRatio = currentDist / middleGestureState.initialHandDist;
      const targetScale = THREE.MathUtils.clamp(
        middleGestureState.initialModelScale * scaleRatio,
        0.25,
        3.0
      );
      modelRoot.scale.setScalar(targetScale);

      // Rotation around Y:
      let deltaAngle = currentAngle - middleGestureState.initialAngle;
      while (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      while (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
      modelRoot.rotation.y = middleGestureState.initialRotY + deltaAngle;

      // Position: Anchor model directly to the hands midpoint in world space!
      // This prevents the model from dropping down to the floor when scaled down,
      // and allows moving/repositioning the model in full 3D space with both hands.
      const scaledOffset = middleGestureState.initialMidpointLocal
        .clone()
        .multiplyScalar(targetScale)
        .applyEuler(modelRoot.rotation);
      modelRoot.position.copy(currentMidpoint).sub(scaledOffset);
    }
  }
  // 2. ONE HAND PINCHING -> GRAB, TRANSLATE & PLACE MODEL IN 3D SPACE
  else if (isPinch0 || isPinch1) {
    middleGestureState.twoHandActive = false;
    const activePinch = isPinch0 ? pinch0 : pinch1;
    const activeHandId = isPinch0 ? 0 : 1;

    if (!middleGestureState.oneHandActive || middleGestureState.activeHandId !== activeHandId) {
      middleGestureState.oneHandActive = true;
      middleGestureState.activeHandId = activeHandId;
      middleGestureState.prevPinchPos.copy(activePinch.pinchPos);
    } else {
      // 3D Translation Delta: Hand moves -> Model moves with hand in X, Y, Z!
      const deltaPos = new THREE.Vector3().subVectors(activePinch.pinchPos, middleGestureState.prevPinchPos);
      modelRoot.position.add(deltaPos);

      // Turntable rotation based on hand motion around model center
      const focalWorld = modelRoot.localToWorld(new THREE.Vector3(0.20, 1.15, 0.20));
      const prevAngle = Math.atan2(
        middleGestureState.prevPinchPos.x - focalWorld.x,
        middleGestureState.prevPinchPos.z - focalWorld.z
      );
      const currAngle = Math.atan2(
        activePinch.pinchPos.x - focalWorld.x,
        activePinch.pinchPos.z - focalWorld.z
      );

      let deltaAngle = currAngle - prevAngle;
      while (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      while (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

      if (Math.abs(deltaAngle) < 0.25) {
        modelRoot.rotation.y += deltaAngle * 0.9;
      }

      middleGestureState.prevPinchPos.copy(activePinch.pinchPos);
    }
  }
  // 3. NEITHER HAND PINCHING
  else {
    middleGestureState.twoHandActive = false;
    middleGestureState.oneHandActive = false;
    middleGestureState.activeHandId = -1;
  }
}

// ==========================================
// VR CONTROLLER SQUEEZE (GRIP) TO GRAB & PLACE
// ==========================================
const controllerGrabState = {
  active0: false,
  active1: false,
  prevPos0: new THREE.Vector3(),
  prevPos1: new THREE.Vector3(),
  initialDist: 0,
  initialScale: 1.0,
  initialMidpointLocal: new THREE.Vector3(),
  initialAngle: 0,
  initialRotY: 0,
};

function onControllerSqueezeStart(id) {
  sounds.ensureContext();
  if (id === 0) {
    controllerGrabState.active0 = true;
    controllerGrabState.prevPos0.copy(controller0.position);
  } else {
    controllerGrabState.active1 = true;
    controllerGrabState.prevPos1.copy(controller1.position);
  }

  if (controllerGrabState.active0 && controllerGrabState.active1) {
    controllerGrabState.initialDist = controller0.position.distanceTo(controller1.position);
    controllerGrabState.initialScale = modelRoot.scale.x;
    const mid = new THREE.Vector3().addVectors(controller0.position, controller1.position).multiplyScalar(0.5);
    controllerGrabState.initialMidpointLocal.copy(modelRoot.worldToLocal(mid.clone()));
    controllerGrabState.initialAngle = Math.atan2(
      controller1.position.x - controller0.position.x,
      controller1.position.z - controller0.position.z
    );
    controllerGrabState.initialRotY = modelRoot.rotation.y;
  }
}

function onControllerSqueezeEnd(id) {
  if (id === 0) controllerGrabState.active0 = false;
  else controllerGrabState.active1 = false;
}

controller0.addEventListener('squeezestart', () => onControllerSqueezeStart(0));
controller0.addEventListener('squeezeend', () => onControllerSqueezeEnd(0));
controller1.addEventListener('squeezestart', () => onControllerSqueezeStart(1));
controller1.addEventListener('squeezeend', () => onControllerSqueezeEnd(1));

function processControllerGrab() {
  if (controllerGrabState.active0 && controllerGrabState.active1) {
    const curDist = controller0.position.distanceTo(controller1.position);
    const curMid = new THREE.Vector3().addVectors(controller0.position, controller1.position).multiplyScalar(0.5);
    const curAngle = Math.atan2(
      controller1.position.x - controller0.position.x,
      controller1.position.z - controller0.position.z
    );

    if (controllerGrabState.initialDist > 0.01) {
      const ratio = curDist / controllerGrabState.initialDist;
      const targetScale = THREE.MathUtils.clamp(controllerGrabState.initialScale * ratio, 0.25, 3.0);
      modelRoot.scale.setScalar(targetScale);

      let deltaAngle = curAngle - controllerGrabState.initialAngle;
      while (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      while (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
      modelRoot.rotation.y = controllerGrabState.initialRotY + deltaAngle;

      const offset = controllerGrabState.initialMidpointLocal
        .clone()
        .multiplyScalar(targetScale)
        .applyEuler(modelRoot.rotation);
      modelRoot.position.copy(curMid).sub(offset);
    }
  } else if (controllerGrabState.active0) {
    const delta = new THREE.Vector3().subVectors(controller0.position, controllerGrabState.prevPos0);
    modelRoot.position.add(delta);
    controllerGrabState.prevPos0.copy(controller0.position);
  } else if (controllerGrabState.active1) {
    const delta = new THREE.Vector3().subVectors(controller1.position, controllerGrabState.prevPos1);
    modelRoot.position.add(delta);
    controllerGrabState.prevPos1.copy(controller1.position);
  }
}

// ==========================================
// VR DIRECT TOUCH / POKE & CONTROLLER RAYCASTING
// ==========================================
let lastPokeTime = 0;

function checkIndexFingerPoke(hand) {
  if (!hand || !hand.joints) return;
  const indexTip = hand.joints['index-finger-tip'];
  if (!indexTip || !indexTip.position) return;
  if (!isFinite(indexTip.position.x)) return;

  const now = performance.now();
  if (now - lastPokeTime < 380) return; // 380ms debounce

  const tipPos = indexTip.position;

  // 1. Direct Touch Poke on Display Panel 3D buttons
  const pBtns = [panelButtons.sealBtn, panelButtons.observeBtn, panelButtons.peekBtn];
  for (const btn of pBtns) {
    if (btn) {
      const btnPos = new THREE.Vector3();
      btn.getWorldPosition(btnPos);
      const hitDist = tipPos.distanceTo(btnPos);
      if (hitDist < 0.12 * Math.max(modelRoot.scale.x, 0.35)) {
        lastPokeTime = now;
        btn.position.z = 0.006; // Visual physical press in
        setTimeout(() => {
          btn.position.z = 0.016; // Return to resting position
        }, 160);
        sounds.playUiClick();
        if (btn.userData.action === 'toggleSeal') toggleChamberSeal();
        if (btn.userData.action === 'observe') observeChamber();
        if (btn.userData.action === 'togglePeek') toggleQuantumPeek();
        return;
      }
    }
  }

  // 2. Direct Touch Poke on Tabletop 3D buttons
  const tBtns = [tableButtons.sealBtn, tableButtons.observeBtn, tableButtons.resetBtn];
  for (const btn of tBtns) {
    if (btn) {
      const btnPos = new THREE.Vector3();
      btn.getWorldPosition(btnPos);
      const hitDist = tipPos.distanceTo(btnPos);
      if (hitDist < 0.10 * Math.max(modelRoot.scale.x, 0.35)) {
        lastPokeTime = now;
        const initialY = btn.position.y;
        btn.position.y -= 0.008; // Visual press in
        setTimeout(() => {
          btn.position.y = initialY;
        }, 160);
        sounds.playUiClick();
        if (btn.userData.action === 'toggleSeal') toggleChamberSeal();
        if (btn.userData.action === 'observe') observeChamber();
        if (btn.userData.action === 'reset') resetExperiment();
        return;
      }
    }
  }
}

// Controller Trigger Click (Select)
function onControllerSelect(controller) {
  sounds.ensureContext();
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  const rayOrigin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
  const rayDir = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix).normalize();

  raycaster.set(rayOrigin, rayDir);
  const hits = raycaster.intersectObjects(interactableObjects, true);
  if (hits.length > 0) {
    const hitObj = hits[0].object;
    if (hitObj.name && hitObj.name.startsWith('Panel_Btn_')) {
      hitObj.position.z = 0.006;
      setTimeout(() => {
        hitObj.position.z = 0.016;
      }, 160);
    }
    handleObjectInteraction(hits[0]);
  }
}

controller0.addEventListener('select', () => onControllerSelect(controller0));
controller1.addEventListener('select', () => onControllerSelect(controller1));

function updateControllerRay(controller, rayMesh) {
  if (!controller || !rayMesh) return;
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  const rayOrigin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
  const rayDir = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix).normalize();

  raycaster.set(rayOrigin, rayDir);
  const hits = raycaster.intersectObjects(interactableObjects, true);

  // Clear hover scale on panel buttons
  if (panelButtons.sealBtn && panelButtons.sealBtn.scale.x > 1.0) panelButtons.sealBtn.scale.set(1.0, 1.0, 1.0);
  if (panelButtons.observeBtn && panelButtons.observeBtn.scale.x > 1.0) panelButtons.observeBtn.scale.set(1.0, 1.0, 1.0);
  if (panelButtons.peekBtn && panelButtons.peekBtn.scale.x > 1.0) panelButtons.peekBtn.scale.set(1.0, 1.0, 1.0);

  if (hits.length > 0) {
    rayMesh.scale.z = Math.min(hits[0].distance / 1.2, 2.5);
    rayMesh.material.opacity = 0.95;
    rayMesh.material.color.setHex(0x00f2fe);

    // Subtle hover scale on panel buttons
    if (hits[0].object.name && hits[0].object.name.startsWith('Panel_Btn_')) {
      hits[0].object.scale.set(1.03, 1.05, 1.0);
    }
  } else {
    rayMesh.scale.z = 1.0;
    rayMesh.material.opacity = 0.35;
    rayMesh.material.color.setHex(0x00f2fe);
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

  // 3. Cat Procedural Life / Breathing & Collapse Dynamics
  const targetCollapseT = appState.outcome === 'dead' ? 1.0 : 0.0;
  const collapseSpeed = targetCollapseT > appState.catCollapseT ? 3.8 : 4.5;
  appState.catCollapseT += (targetCollapseT - appState.catCollapseT) * Math.min(delta * collapseSpeed, 1.0);

  if (apparatus.cat) {
    const t = appState.catCollapseT;
    const easeT = THREE.MathUtils.smoothstep(t, 0, 1);

    // Smooth physics-like fall onto chamber floor
    apparatus.cat.position.lerpVectors(CAT_ALIVE_POS, CAT_DEAD_POS, easeT);
    apparatus.cat.quaternion.slerpQuaternions(CAT_ALIVE_QUAT, CAT_DEAD_QUAT, easeT);

    // Procedural Breathing & Tail Wag (Active when alive, dampens to 0 as cat collapses)
    const aliveWeight = Math.max(0, 1.0 - t * 1.5);
    if (apparatus.catChest && aliveWeight > 0.001) {
      const breath = Math.sin(appState.time * 2.6) * 0.02 * aliveWeight;
      apparatus.catChest.scale.set(1 + breath, 1 + breath, 1 + breath);
    } else if (apparatus.catChest) {
      apparatus.catChest.scale.set(1, 1, 1);
    }

    if (apparatus.catTail.length > 0 && aliveWeight > 0.001) {
      const sway = Math.sin(appState.time * 2.2) * 0.12 * aliveWeight;
      apparatus.catTail.forEach((seg, i) => {
        seg.rotation.y = sway * (i + 1) * 0.4;
      });
    } else if (apparatus.catTail.length > 0) {
      apparatus.catTail.forEach((seg) => {
        seg.rotation.y = 0;
      });
    }
  }

  // 4. Quantum Superposition Floating Atom bobbing
  if (apparatus.atom) {
    apparatus.atom.position.y = 1.22 + Math.sin(appState.time * 2.0) * 0.015;
    apparatus.atom.rotation.y += delta * 0.4;
  }

  // Holographic Screen: strictly untilted and parallel to the chamber
  if (spatialPanel) {
    spatialPanel.rotation.set(0, 0, 0);
  }

  // 5. Hand & Controller Gestures for Grabbing, Placing & Scaling
  // Index Finger + Thumb for Chamber Lid & Table Buttons
  checkHandPinch(hand0, true);
  checkHandPinch(hand1, false);

  // Direct touch poke on display panel and table buttons
  checkIndexFingerPoke(hand0);
  checkIndexFingerPoke(hand1);

  // Controller Rays hover update
  updateControllerRay(controller0, ray0);
  updateControllerRay(controller1, ray1);

  // Middle Finger + Thumb for Zoom (2 Hands) and Grab/Place (1 Hand)
  processMiddleFingerModelGestures();

  // VR Controller Grip (Squeeze) for Grab/Place and Zoom
  processControllerGrab();

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

// Height adjustment and model repositioning handlers
function raiseModel(amount = 0.12) {
  modelRoot.position.y += amount;
  sounds.playUiClick();
}
function lowerModel(amount = 0.12) {
  modelRoot.position.y = Math.max(-0.6, modelRoot.position.y - amount);
  sounds.playUiClick();
}
function resetModelTransform() {
  modelRoot.position.set(0, 0, 0);
  modelRoot.rotation.set(0, 0, 0);
  modelRoot.scale.set(1, 1, 1);
  sounds.playUiClick();
}

// Expose action handlers for HUD controls
window.__toggleChamberSeal = toggleChamberSeal;
window.__observeChamber = observeChamber;
window.__toggleQuantumPeek = toggleQuantumPeek;
window.__resetExperiment = resetExperiment;
window.__raiseModel = raiseModel;
window.__lowerModel = lowerModel;
window.__resetModelTransform = resetModelTransform;
window.__renderAllUI = updateUI;

console.log("Schrödinger's Cat WebXR Simulation loaded successfully.");
