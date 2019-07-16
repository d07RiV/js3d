import { vec3 } from 'math';
import phy from 'physics';
import Scene from './scene';

const numBalls = 6;
const numPull = 2;
const sphereRadius = 1;
const springHeight = 5;
//const springRadius = 0.1;
const frameWidth = 6;
const pullAngle = 1;
const ballGap = 0;

export default class Newton extends Scene {
  static sceneName = "Newton";

  constructor() {
    super();

    const width = (numBalls + 2) * sphereRadius * 2 + (numBalls - 1) * ballGap;
    const height = 2 * sphereRadius + springHeight;
    const fx = [-width / 2 + sphereRadius * 0.5, width / 2 - sphereRadius * 0.5];
    const fy = [-frameWidth / 2 + sphereRadius * 0.5, frameWidth / 2 - sphereRadius * 0.5];

    this.ground.addShape(new phy.shapes.Plane([0, 0, 1], 0));
    this.ground.addShape(new phy.shapes.Box(-width / 2, -frameWidth / 2, 0, width, frameWidth, sphereRadius * 0.5));
    fy.forEach(y => {
      fx.forEach(x => this.ground.addShape(new phy.shapes.Capsule([x, y, 0], [x, y, height], sphereRadius * 0.2)));
      this.ground.addShape(new phy.shapes.Capsule([fx[0], y, height], [fx[1], y, height], sphereRadius * 0.2));
    });

    const mat = phy.config.defaultMaterial;
    phy.config.defaultMaterial = {...mat, restitution: 1};
    for (let i = 0; i < numBalls; ++i) {
      const x = -width / 2 + sphereRadius * 3 + i * (sphereRadius * 2 + ballGap);

      const obj = new phy.RigidBody(`ball${i}`);
      if (i < numPull) {
        vec3.set(obj.position, x - springHeight * Math.sin(pullAngle), 0, sphereRadius * 2 + springHeight * (1 - Math.cos(pullAngle)));
      } else {
        vec3.set(obj.position, x, 0, sphereRadius * 2);
      }
      obj.calculateTransform();
      obj.addShape(new phy.shapes.Sphere([0, 0, 0], sphereRadius));
      this.world.addBody(obj);

      fy.forEach(y => this.world.addConstraint(new phy.constraints.Point(obj, this.ground, [0, 0, 0], [x, y, height], 0, Math.sqrt(springHeight * springHeight + y * y))));
    }
    phy.config.defaultMaterial = mat;
  }
}
