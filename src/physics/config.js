import { vec3 } from 'math';

const combiners = {
  average: (x, y) => (x + y) * 0.5,
  multiply: (x, y) => x * y,
  minimum: (x, y) => Math.min(x, y),
  maximum: (x, y) => Math.max(x, y),
};

export default {
  combiners,

  iterations: 8, // number of iterations to resolve velocity
  positionIterations: 2, // number of iterations to resolve position
  step: 1 / 60, // time step, in seconds
  defaultGravity: vec3.fromValues(0, 0, -10), // default gravity acceleration
  defaultMaterial: {
    restitution: 0,
    friction: 0.5,
    density: 1,
    frictionCombine: combiners.average,
    restitutionCombine: combiners.average,
  },
  delta: 0.01, // collision offset
  sleepTime: 0.5, // time after which a stationary object is considered sleeping
  sleepThreshold: 0.08,
  sleepWakeThreshold: 0.15,
  angularMomentum: false, // conserve angular momentum instead of velocity (unstable!)
};
