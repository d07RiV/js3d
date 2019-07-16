import config from './config';
import checkSleep from './checkSleep';
import Performance from './perf';
import BroadPhase from './broad';

export default class World {
  bodies = [];
  generators = [];
  constraints = [];
  awake = [];
  broadPhase = new BroadPhase();
  frame = 0;
  perf = new Performance();

  addBody(body) {
    this.bodies.push(body);
    body.world = this;
    body.shapes.forEach(shape => this.addShape(shape));
  }
  removeBody(body) {
    body.shapes.forEach(shape => this.removeShape(shape));
    this.constraints = this.constraints.filter(c => c.body1 !== body && c.body2 !== body);
    this.bodies.splice(this.bodies.indexOf(body), 1);
    delete body.world;
  }

  addShape(shape) {
    this.broadPhase.addShape(shape);
  }
  removeShape(shape) {
    this.broadPhase.removeShape(shape);
  }

  addConstraint(constraint) {
    this.constraints.push(constraint);
  }
  removeConstraint(constraint) {
    this.constraints.splice(this.constraints.indexOf(constraint), 1);
  }

  addGenerator(generator) {
    this.generators.push(generator);
  }
  removeGenerator(generator) {
    this.generators.splice(this.generators.indexOf(generator), 1);
  }

  beginStep(delta) {
    this.frame += 1;

    this.bodies.forEach(body => body.beginFrame(delta));
    this.generators.forEach(gen => checkSleep(gen.body1, gen.body2) && gen.resolve());
    this.bodies.forEach(body => body.applyForces(delta));

    let start = performance.now();
    this.contacts = this.broadPhase.run();
    this.perf.add("broad", performance.now() - start);

    let sleeping = [...this.contacts, ...this.constraints];
    this.awake.length = 0;
    for (let j = 0; j < config.iterations; ++j) {
      sleeping = sleeping.filter(ct => {
        if (checkSleep(ct.body1, ct.body2)) {
          ct.init();
          this.awake.push(ct);
          return false;
        } else {
          return true;
        }
      });
      this.awake.forEach(ct => {
        if (ct.body1.moves && ct.body2.moves) {
          if ((ct.body1.motion > config.sleepWakeThreshold && ct.body2.sleeping) ||
              (ct.body2.motion > config.sleepWakeThreshold && ct.body1.sleeping)) {
            return;
          }
        }
        ct.resolve()
      });
    }

    this.perf.add("resolve", performance.now() - start);
  }

  endStep(delta) {
    let start = performance.now();
    if (config.positionIterations) {
      const pos = [], bodies = new Set();
      this.awake.forEach(ct => {
        ct.initPosition();
        pos.push(ct);
        bodies.add(ct.body1);
        bodies.add(ct.body2);
      });
      for (let j = 0; j < config.positionIterations; ++j) {
        pos.forEach(ct => ct.resolvePosition());
      }
      bodies.forEach(body => body.calculateTransform());
    }
    this.perf.add("position", performance.now() - start);

    this.bodies.forEach(body => body.endFrame(delta));
  }

  update(time) {
    const start = performance.now();
    this.time = time;
    if (this.frame) {
      this.endStep(config.step);
    }
    this.beginStep(config.step);
    this.perf.add("total", performance.now() - start);
  }
}
