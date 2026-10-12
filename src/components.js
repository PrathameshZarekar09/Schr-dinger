import { createComponent, defineComponents, Types } from '@iwsdk/core';

export class SchrodingerBox extends createComponent({
  isOpen: { type: Types.Boolean, default: true },
  targetAngle: { type: Types.Float32, default: -1.8 },
  currentAngle: { type: Types.Float32, default: -1.8 },
}) {}

export class QuantumCat extends createComponent({
  state: { type: Types.String, default: 'superposition' }, // 'alive' | 'dead' | 'superposition'
  breathPhase: { type: Types.Float32, default: 0.0 },
}) {}

export class GeigerDetector extends createComponent({
  isTriggered: { type: Types.Boolean, default: false },
  needleAngle: { type: Types.Float32, default: 0.0 },
}) {}

export class HammerMechanism extends createComponent({
  isFired: { type: Types.Boolean, default: false },
  swingProgress: { type: Types.Float32, default: 0.0 },
}) {}

export class PoisonFlask extends createComponent({
  isShattered: { type: Types.Boolean, default: false },
}) {}

export class RadioactiveSource extends createComponent({
  decayProbability: { type: Types.Float32, default: 0.5 },
  isDecayed: { type: Types.Boolean, default: false },
}) {}

export class ControlConsole extends createComponent({
  step: { type: Types.Int32, default: 0 },
}) {}

export default defineComponents([
  SchrodingerBox,
  QuantumCat,
  GeigerDetector,
  HammerMechanism,
  PoisonFlask,
  RadioactiveSource,
  ControlConsole,
]);
