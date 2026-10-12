import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { SchrodingerSystem } from './schrodinger-system.js';
import { OrientationSystem } from './orientation-system.js';
import { EnvironmentSystem } from './environment-system.js';

World.create(document.getElementById('scene-container'), projectOptions)
  .then((world) => {
    world.registerSystem(EnvironmentSystem);
    world.registerSystem(SchrodingerSystem);
    world.registerSystem(OrientationSystem);
    console.log("Schrödinger's Cat WebXR Simulation Initialized with IWSDK.");
  })
  .catch((err) => {
    console.error('Failed to initialize IWSDK World:', err);
  });
