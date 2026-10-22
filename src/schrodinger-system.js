import {
  createSystem,
  Vector3,
  Quaternion,
  Euler,
  AnimationMixer,
  LoopRepeat,
  LoopOnce,
} from '@iwsdk/core';
import {
  SchrodingerBox,
  QuantumCat,
  GeigerDetector,
  HammerMechanism,
  PoisonFlask,
  RadioactiveSource,
} from './components.js';
import { sounds } from './audio.js';

export class SchrodingerSystem extends createSystem({
  boxes: { required: [SchrodingerBox] },
  cats: { required: [QuantumCat] },
  geigers: { required: [GeigerDetector] },
  hammers: { required: [HammerMechanism] },
  vials: { required: [PoisonFlask] },
  atoms: { required: [RadioactiveSource] },
}) {
  constructor() {
    super(...arguments);
    this.time = 0;
    this.lastGeigerClick = 0;
    this.superpositionActive = false;
    this.experimentState = 'orientation'; // 'orientation' | 'inspect' | 'sealed' | 'observed'
    this.outcome = null; // 'alive' | 'dead'

    // Node references cached from models
    this.boxLidNode = null;
    this.glassWindowNode = null;
    this.geigerNeedleNode = null;
    this.hammerLeverNode = null;
    this.catHeadNode = null;
    this.catChestNode = null;
    this.catTailNodes = [];
    this.intactVialNodes = [];
    this.brokenVialNodes = [];

    // Animation mixers
    this.mixers = [];
    this.atomActions = [];
    this.geigerRedAction = null;
    this.hammerAction = null;
  }

  init() {
    // Listen for model registrations
    this.queries.boxes.subscribe('qualify', (entity) => {
      this.setupBox(entity);
    });

    this.queries.cats.subscribe('qualify', (entity) => {
      this.setupCat(entity);
    });

    this.queries.geigers.subscribe('qualify', (entity) => {
      this.setupGeiger(entity);
    });

    this.queries.hammers.subscribe('qualify', (entity) => {
      this.setupHammer(entity);
    });

    this.queries.vials.subscribe('qualify', (entity) => {
      this.setupVial(entity);
    });

    this.queries.atoms.subscribe('qualify', (entity) => {
      this.setupAtom(entity);
    });
  }

  setupBox(entity) {
    const obj = entity.object3D;
    if (!obj) return;

    obj.traverse((child) => {
      if (child.name === 'Lid_Hinged') {
        this.boxLidNode = child;
        // Start open at ~110 degrees so user can see inside
        child.rotation.x = -1.9;
      }
      if (child.name === 'Front_Glass_Window' && child.material) {
        this.glassWindowNode = child;
        child.material.transparent = true;
        child.material.opacity = 0.45;
        child.material.roughness = 0.1;
      }
    });

    // Make box clickable/grabbable with hand
    entity.addComponent('RayInteractable', {});
    obj.addEventListener('click', () => {
      this.toggleBox();
    });
  }

  setupCat(entity) {
    const obj = entity.object3D;
    if (!obj) return;
    this.catObj = obj;

    this.catTailNodes = [];
    this.catEyeHighlights = [];
    obj.traverse((child) => {
      if (child.name === 'Cat_Head') this.catHeadNode = child;
      if (child.name === 'Cat_Chest') this.catChestNode = child;
      if (child.name && child.name.startsWith('Cat_Tail_Segment')) {
        this.catTailNodes.push(child);
      }
      if (child.name && child.name.includes('Eye_Highlight')) {
        this.catEyeHighlights.push(child);
      }
    });
  }

  setupGeiger(entity) {
    const obj = entity.object3D;
    if (!obj) return;

    obj.traverse((child) => {
      if (child.name === 'Dial_Needle_Pivot' || child.name === 'Dial_Needle') {
        this.geigerNeedleNode = child;
      }
    });

    // Handle animations
    if (obj.animations && obj.animations.length > 0) {
      const mixer = new AnimationMixer(obj);
      for (const clip of obj.animations) {
        if (clip.name.includes('Red')) {
          this.geigerRedAction = mixer.clipAction(clip);
          this.geigerRedAction.setLoop(LoopRepeat);
        }
      }
      this.mixers.push(mixer);
    }
  }

  setupHammer(entity) {
    const obj = entity.object3D;
    if (!obj) return;

    obj.traverse((child) => {
      if (child.name === 'Trigger_Hammer_Head' || child.name === 'Trigger_Lever') {
        this.hammerLeverNode = child;
      }
    });

    if (obj.animations && obj.animations.length > 0) {
      const mixer = new AnimationMixer(obj);
      for (const clip of obj.animations) {
        this.hammerAction = mixer.clipAction(clip);
        this.hammerAction.setLoop(LoopOnce);
        this.hammerAction.clampWhenFinished = true;
      }
      this.mixers.push(mixer);
    }
  }

  setupVial(entity) {
    const obj = entity.object3D;
    if (!obj) return;

    this.intactVialNodes = [];
    this.brokenVialNodes = [];

    obj.traverse((child) => {
      if (child.name.startsWith('Broken_')) {
        child.visible = false;
        this.brokenVialNodes.push(child);
      } else if (child.name.startsWith('Vial_')) {
        child.visible = true;
        this.intactVialNodes.push(child);
      }
    });
  }

  setupAtom(entity) {
    const obj = entity.object3D;
    if (!obj) return;

    if (obj.animations && obj.animations.length > 0) {
      const mixer = new AnimationMixer(obj);
      for (const clip of obj.animations) {
        const action = mixer.clipAction(clip);
        action.setLoop(LoopRepeat);
        action.play();
        this.atomActions.push(action);
      }
      this.mixers.push(mixer);
    }
  }

  /** Hand action: Toggle opening or closing of the chamber lid */
  toggleBox() {
    sounds.playUiClick();
    if (!this.boxLidNode) return;

    const isCurrentlyClosed = Math.abs(this.boxLidNode.rotation.x) < 0.2;
    if (isCurrentlyClosed) {
      this.openChamber();
    } else {
      this.sealChamber();
    }
  }

  /** Seal chamber and enter Quantum Superposition */
  sealChamber() {
    this.experimentState = 'sealed';
    this.superpositionActive = true;
    this.outcome = null;
    sounds.playHammerStrike();
    sounds.startQuantumHum();

    // Make glass frosted/opaque to isolate observer
    if (this.glassWindowNode && this.glassWindowNode.material) {
      this.glassWindowNode.material.opacity = 0.95;
      this.glassWindowNode.material.roughness = 0.85;
    }

    // Reset components to superposition
    this.resetApparatusToSuperposition();
  }

  /** Open chamber to Observe & Collapse Wave Function */
  openChamber() {
    sounds.playUiClick();
    this.experimentState = 'observed';
    this.superpositionActive = false;
    sounds.stopQuantumHum();

    // Clear glass for inspection
    if (this.glassWindowNode && this.glassWindowNode.material) {
      this.glassWindowNode.material.opacity = 0.45;
      this.glassWindowNode.material.roughness = 0.1;
    }

    // 50% Born Rule quantum probability
    const decayHappened = Math.random() < 0.5;
    this.outcome = decayHappened ? 'dead' : 'alive';

    if (decayHappened) {
      this.triggerDecayCollapse();
    } else {
      this.triggerAliveCollapse();
    }
  }

  /** Branch A: Quantum Atom Decayed */
  triggerDecayCollapse() {
    // 1. Geiger Counter triggers
    sounds.playDecayBurst();
    if (this.geigerRedAction) {
      this.geigerRedAction.play();
    }
    if (this.geigerNeedleNode) {
      this.geigerNeedleNode.rotation.z = 1.35; // Maximum deflection
    }

    // 2. Relay hammer strikes after 250ms
    setTimeout(() => {
      sounds.playHammerStrike();
      if (this.hammerAction) {
        this.hammerAction.reset().play();
      }
    }, 250);

    // 3. Poison vial shatters after 450ms
    setTimeout(() => {
      sounds.playVialShatter();
      this.intactVialNodes.forEach((n) => (n.visible = false));
      this.brokenVialNodes.forEach((n) => (n.visible = true));
    }, 450);

    // 4. Cat collapses onto chamber floor
    setTimeout(() => {
      sounds.playCatCollapse();
      if (this.catObj) {
        this.catObj.position.set(0.24, 1.02, 0.02);
        this.catObj.rotation.set(0.12, -0.60, -1.46);
      }
      if (this.catHeadNode) {
        this.catHeadNode.rotation.x = -0.32;
        this.catHeadNode.rotation.z = 0.28;
      }
      this.catEyeHighlights.forEach((h) => (h.visible = false));
    }, 600);
  }

  /** Branch B: Atom Undecayed (Cat Survives!) */
  triggerAliveCollapse() {
    sounds.playCatMeow();

    // Geiger remains calm
    if (this.geigerRedAction) {
      this.geigerRedAction.stop();
    }
    if (this.geigerNeedleNode) {
      this.geigerNeedleNode.rotation.z = 0.05;
    }

    // Cat stays upright & healthy
    if (this.catObj) {
      this.catObj.position.set(0.32, 0.84, 0.15);
      this.catObj.rotation.set(0, -0.55, 0);
    }
    if (this.catHeadNode) {
      this.catHeadNode.rotation.z = 0.0;
      this.catHeadNode.rotation.x = 0.0;
    }
    this.catEyeHighlights.forEach((h) => (h.visible = true));

    // Vial stays intact
    this.intactVialNodes.forEach((n) => (n.visible = true));
    this.brokenVialNodes.forEach((n) => (n.visible = false));
  }

  resetApparatusToSuperposition() {
    if (this.geigerRedAction) this.geigerRedAction.stop();
    if (this.hammerAction) this.hammerAction.stop();

    if (this.geigerNeedleNode) this.geigerNeedleNode.rotation.z = 0.1;
    this.intactVialNodes.forEach((n) => (n.visible = true));
    this.brokenVialNodes.forEach((n) => (n.visible = false));

    if (this.catObj) {
      this.catObj.position.set(0.32, 0.84, 0.15);
      this.catObj.rotation.set(0, -0.55, 0);
    }
    if (this.catHeadNode) {
      this.catHeadNode.rotation.z = 0.0;
      this.catHeadNode.rotation.x = 0.0;
    }
    this.catEyeHighlights.forEach((h) => (h.visible = true));
  }

  update(delta) {
    this.time += delta;

    // Update GLTF animation mixers
    for (const mixer of this.mixers) {
      mixer.update(delta);
    }

    // Smooth lid rotation animation
    if (this.boxLidNode) {
      const targetAngle = this.experimentState === 'sealed' ? 0.0 : -1.9;
      this.boxLidNode.rotation.x += (targetAngle - this.boxLidNode.rotation.x) * delta * 5.0;
    }

    // Cat procedural breathing & tail swaying
    if (this.catChestNode && this.outcome !== 'dead') {
      const breath = Math.sin(this.time * 2.8) * 0.02;
      this.catChestNode.scale.set(1 + breath, 1 + breath, 1 + breath);
    }

    if (this.catTailNodes.length > 0 && this.outcome !== 'dead') {
      const sway = Math.sin(this.time * 2.0) * 0.12;
      this.catTailNodes.forEach((seg, i) => {
        seg.rotation.y = sway * (i + 1) * 0.4;
      });
    }

    // Ambient random Geiger clicks (cosmic / background radiation)
    if (this.time - this.lastGeigerClick > 2.5 + Math.random() * 2.5) {
      this.lastGeigerClick = this.time;
      if (this.experimentState !== 'observed' || this.outcome === 'alive') {
        sounds.playGeigerClick(0.15);
      }
    }
  }
}
