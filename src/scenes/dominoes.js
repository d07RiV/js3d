import { vec2, vec3 } from 'math';
import phy from 'physics';
import Scene from './scene';

const r0 = 1, rt = 0.2;
const boxWidth = 0.5;
const boxDepth = 0.2;
const boxHeight = 1;
const boxDist = 0.6;
const numBoxes = 500;
const boxImpulse = 10;

const tmp1 = vec3.create();

function getPos(pt, t) {
  const r = r0 + rt * t;
  pt[0] = Math.cos(t) * r;
  pt[1] = Math.sin(t) * r;
}
function getDir(pt, t) {
  const r = r0 + rt * t;
  const c = Math.cos(t), s = Math.sin(t);
  pt[0] = -s * r + rt * c;
  pt[1] = c * r + rt * s;
}
function nextT(pt, t) {
  const r = r0 + rt * t;
  let t0 = t, t1 = t + boxDist / r;
  while (r * (t1 - t0) > 0.01) {
    const tm = (t0 + t1) / 2;
    getPos(tmp1, tm);
    if (vec2.squaredDistance(pt, tmp1) > boxDist) {
      t1 = tm;
    } else {
      t0 = tm;
    }
  }
  return (t0 + t1) / 2;
}

export default class Dominoes extends Scene {
  static sceneName = "Dominoes";

  constructor() {
    super();

    this.ground.addShape(new phy.shapes.Plane([0, 0, 1], 0));

    let t = 0;
    const pos = vec3.create(), fwd = vec3.create(), right = vec3.create(), top = vec3.fromValues(0, 0, boxHeight / 2);
    for (let i = 0; i < numBoxes; ++i) {
      if (i) {
        t = nextT(pos, t);
      }
      getPos(pos, t);
      getDir(fwd, t);
      vec3.normalize(fwd, fwd);
      vec3.cross(right, fwd, top);
      vec3.normalize(right, right);
      vec3.scale(right, right, boxWidth / 2);
      vec3.scale(fwd, fwd, boxDepth / 2);

      const box = new phy.RigidBody(`box${i}`);
      vec3.copy(box.position, pos);
      box.position[2] = boxHeight / 2;
      box.calculateTransform();
      box.addShape(new phy.shapes.Box([0, 0, 0], fwd, right, top));
      this.world.addBody(box);

      if (i === 0) {
        vec3.subtract(tmp1, pos, fwd);
        tmp1[2] = boxHeight;
        vec3.scale(fwd, fwd, 2 * boxImpulse / boxDepth);
        box.addImpulseAt(fwd, tmp1);
      }
    }
  }
}
