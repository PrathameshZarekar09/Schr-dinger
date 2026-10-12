import {
  createSystem,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Group,
  Color,
} from '@iwsdk/core';
import { sounds } from './audio.js';

export class EnvironmentSystem extends createSystem({}) {
  init() {
    const scene = this.world.scene;
    if (!scene) return;

    const labGroup = new Group();
    labGroup.name = 'LaboratoryEnvironment';

    // 1. Sci-Fi Laboratory Workbench Table
    // Top surface
    const tableTopGeo = new BoxGeometry(1.6, 0.06, 1.2);
    const tableTopMat = new MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const tableTop = new Mesh(tableTopGeo, tableTopMat);
    tableTop.position.set(0, 0.79, 0.05);
    labGroup.add(tableTop);

    // Glowing rim / accent edge
    const rimGeo = new BoxGeometry(1.62, 0.015, 1.22);
    const rimMat = new MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.7,
    });
    const rim = new Mesh(rimGeo, rimMat);
    rim.position.set(0, 0.82, 0.05);
    labGroup.add(rim);

    // Sturdy Metallic Table Legs (4 corners)
    const legGeo = new CylinderGeometry(0.035, 0.04, 0.78, 16);
    const legMat = new MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.3,
    });
    const legOffsets = [
      [-0.72, 0.39, -0.48],
      [0.72, 0.39, -0.48],
      [-0.72, 0.39, 0.58],
      [0.72, 0.39, 0.58],
    ];
    for (const [x, y, z] of legOffsets) {
      const leg = new Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      labGroup.add(leg);
    }

    // 2. Quantum Grid Floor
    const floorGeo = new PlaneGeometry(12, 12, 24, 24);
    const floorMat = new MeshStandardMaterial({
      color: 0x080c14,
      metalness: 0.6,
      roughness: 0.5,
      wireframe: true,
    });
    const floor = new Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    labGroup.add(floor);

    // 3. Tactile 3D Physical Table Buttons (for Hand Interactions)
    const buttonGroup = new Group();
    buttonGroup.position.set(0, 0.825, 0.52);

    const btnGeo = new CylinderGeometry(0.045, 0.05, 0.025, 24);

    // Button A: Seal Chamber
    const sealBtnMat = new MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.5,
    });
    const sealBtn = new Mesh(btnGeo, sealBtnMat);
    sealBtn.position.set(-0.16, 0, 0);
    buttonGroup.add(sealBtn);

    // Button B: Observe (Collapse)
    const observeBtnMat = new MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
    });
    const observeBtn = new Mesh(btnGeo, observeBtnMat);
    observeBtn.position.set(0, 0, 0);
    buttonGroup.add(observeBtn);

    // Button C: Reset Paradox
    const resetBtnMat = new MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.5,
    });
    const resetBtn = new Mesh(btnGeo, resetBtnMat);
    resetBtn.position.set(0.16, 0, 0);
    buttonGroup.add(resetBtn);

    labGroup.add(buttonGroup);
    scene.add(labGroup);

    // Button click listeners
    sealBtn.addEventListener('click', () => {
      sounds.playUiClick();
      const schrodingerSys = this.world.getSystem?.('SchrodingerSystem');
      schrodingerSys?.sealChamber();
    });

    observeBtn.addEventListener('click', () => {
      sounds.playUiClick();
      const schrodingerSys = this.world.getSystem?.('SchrodingerSystem');
      schrodingerSys?.openChamber();
    });

    resetBtn.addEventListener('click', () => {
      sounds.playUiClick();
      const schrodingerSys = this.world.getSystem?.('SchrodingerSystem');
      schrodingerSys?.resetApparatusToSuperposition();
    });
  }
}
