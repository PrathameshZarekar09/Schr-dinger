import { AssetType, defineAssets } from '@iwsdk/core';

const publicAssetUrl = (filePath) => `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

export default defineAssets({
  'box': {
    url: publicAssetUrl('models/Box.glb'),
    type: AssetType.GLTF,
    name: 'Steel Box',
    priority: 'eager',
  },
  'cat': {
    url: publicAssetUrl('models/Cat.glb'),
    type: AssetType.GLTF,
    name: 'Quantum Cat',
    priority: 'eager',
  },
  'geiger-counter': {
    url: publicAssetUrl('models/Geiger_Counter.glb'),
    type: AssetType.GLTF,
    name: 'Geiger Counter',
    priority: 'eager',
  },
  'hammer': {
    url: publicAssetUrl('models/Hammer.glb'),
    type: AssetType.GLTF,
    name: 'Trigger Hammer',
    priority: 'eager',
  },
  'poison-vial': {
    url: publicAssetUrl('models/PoisionVial.glb'),
    type: AssetType.GLTF,
    name: 'Poison Vial',
    priority: 'eager',
  },
  'radioactive-atom': {
    url: publicAssetUrl('models/RadioactiveAtom.glb'),
    type: AssetType.GLTF,
    name: 'Radioactive Isotope',
    priority: 'eager',
  },
  'orientation-panel': {
    url: publicAssetUrl('ui/orientation.uikitml'),
    type: AssetType.UIKitML,
    name: 'Orientation Panel',
    priority: 'eager',
  },
});
