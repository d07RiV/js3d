import { vec3 } from 'math';
import phy from 'physics';
import Scene from './scene';

const ballRadius = 0.4;

export default class Billiard extends Scene {
  static sceneName = "Billiard";
  numBalls = 0;

  addBall(x, y) {
    const ball = new phy.RigidBody(`ball${++this.numBalls}`);
    vec3.set(ball.position, x, y, ballRadius);
    ball.calculateTransform();
    ball.addShape(new phy.shapes.Sphere([0, 0, 0], ballRadius));
    this.world.addBody(ball);
    return ball;
  }

  constructor() {
    super();

    this.ground.addShape(new phy.shapes.Plane([0, 0, 1], 0));

    this.addBall(-ballRadius, 0);
    this.addBall(ballRadius, 0);
    const b3 = this.addBall(0, 10);
    vec3.set(b3.velocity, 0, -5, 0);
  }
}
