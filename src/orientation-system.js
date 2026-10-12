import { createSystem, VisibilityState } from '@iwsdk/core';
import { sounds } from './audio.js';

export class OrientationSystem extends createSystem({}) {
  init() {
    const panel = this.world.getSceneObject('orientation-panel');
    if (!panel) return;

    const xrButton = panel.getElementById('xr-button');
    const startButton = panel.getElementById('start-btn');
    const peekButton = panel.getElementById('quantum-peek-btn');

    if (xrButton) {
      if (!this.world.xrEnabled) {
        xrButton.setProperties({ display: 'none' });
      } else {
        const toggleXR = () => {
          sounds.playUiClick();
          if (this.world.visibilityState.value === VisibilityState.NonImmersive) {
            this.world.launchXR();
          } else {
            this.world.exitXR();
          }
        };
        xrButton.addEventListener('click', toggleXR);
        this.cleanupFuncs.push(() => xrButton.removeEventListener('click', toggleXR));
      }
    }

    if (startButton) {
      const onStart = () => {
        sounds.playUiClick();
        const panelObj = panel.object3D || panel;
        if (panelObj) {
          // Reposition orientation panel to left desk angle for clear workstation view
          panelObj.position.set(-0.8, 1.4, -0.5);
          panelObj.rotation.y = 0.45;
        }
      };
      startButton.addEventListener('click', onStart);
      this.cleanupFuncs.push(() => startButton.removeEventListener('click', onStart));
    }

    if (peekButton) {
      const onPeek = () => {
        sounds.playUiClick();
        const boxObj = this.world.getSceneObject('schrodinger-box');
        if (boxObj) {
          boxObj.traverse((child) => {
            if (child.name === 'Front_Glass_Window' && child.material) {
              child.material.opacity = child.material.opacity > 0.5 ? 0.2 : 0.95;
            }
          });
        }
      };
      peekButton.addEventListener('click', onPeek);
      this.cleanupFuncs.push(() => peekButton.removeEventListener('click', onPeek));
    }
  }
}
