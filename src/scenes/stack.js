import { vec3 } from 'math';
import phy from 'physics';
import Scene from './scene';

const stackHeight = 2;
const boxSize = 0.5;

export default class Stack extends Scene {
  static sceneName = "Stack";

  constructor() {
    super();

    this.ground.addShape(new phy.shapes.Plane([0, 0, 1], 0));

    for (let i = 0; i < stackHeight; ++i) {
      const box = new phy.RigidBody(`box${i}`);
      vec3.set(box.position, -boxSize / 2, -boxSize / 2, (boxSize + phy.config.delta) * i);
      if (i) {
        //quat.adjustVec3(box.orientation, box.orientation, [0.6, 0.8, 0], 1);
      }
      box.calculateTransform();
      box.addShape(new phy.shapes.Box(boxSize, boxSize, boxSize));
      //box.addShape(new phy.shapes.Sphere([boxSize/2, boxSize/2, boxSize/2], boxSize/2));
      this.world.addBody(box);
    }
  }
}
