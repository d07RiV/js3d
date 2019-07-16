import { vec3 } from 'math';
import phy from 'physics';
import Scene from './scene';

const wallRows = 12;
const wallCols = 16;
const boxWidth = 1;
const boxHeight = 0.4;
const boxDepth = 0.6;

const ballRadius = 2;
const ballVelocity = 10;
const ballDensity = 2;

export default class Wall extends Scene {
  static sceneName = "Wall";

  constructor() {
    super();
    this.ground.addShape(new phy.shapes.Plane([0, 0, 1], 0));

    const boxGap = phy.config.delta / 2;
    const ew = boxWidth + boxGap;
    const eh = boxHeight + boxGap;
    const width = ew * wallCols - boxGap;
    //const height = eh * wallRows;

    //this.ground.addShape(new phy.shapes.Box(-width * 1.5 - boxGap, -boxDepth / 2, 0, width, boxDepth, height + boxGap));
    //this.ground.addShape(new phy.shapes.Box(width * 0.5 + boxGap, -boxDepth / 2, 0, width, boxDepth, height + boxGap));
    //this.ground.addShape(new phy.shapes.Box(-width * 1.5 - boxGap, -boxDepth / 2, height + boxGap, width * 3 + boxGap * 2, boxDepth, height));
    
    for (let i = 0; i < wallRows; ++i) {
      const count = wallCols + (i % 2);
      const start = (i & 1 ? -(boxWidth + boxGap) / 2: 0);
      for (let j = 0; j < count; ++j) {
        const box = new phy.RigidBody(`box${i}_${j}`);
        if (j < count / 4 || j > count * 3 / 4) {
          box.setMoves(false);
        }
        const x0 = Math.max(-boxGap, start + j * ew);
        const x1 = Math.min(width + boxGap, start + j * ew + boxWidth);
        vec3.set(box.position, x0 - width / 2, -boxDepth / 2, boxGap + eh * i);
        box.calculateTransform();
        box.addShape(new phy.shapes.Box(x1 - x0, boxDepth, boxHeight));
        this.world.addBody(box);
      }
      //box.addShape(new phy.shapes.Sphere([boxSize/2, boxSize/2, boxSize/2], boxSize/2));
    }

    const ball = new phy.RigidBody("ball");
    vec3.set(ball.position, -6, 8, ballRadius);
    vec3.set(ball.velocity, 3 / 5 * ballVelocity, -4 / 5 * ballVelocity, 0);
    ball.calculateTransform();
    ball.addShape(new phy.shapes.Sphere([0, 0, 0], ballRadius));
    ball.shapes[0].material.density = ballDensity;
    ball.updateShape();
    this.world.addBody(ball);
  }
}
