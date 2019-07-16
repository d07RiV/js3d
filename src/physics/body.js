import { vec3, quat, mat3, mat4 } from 'math';
import config from './config';

function addInertia(out, m, v) {
  const x = v[0], y = v[1], z = v[2];
  out[0] += m * (y * y + z * z); out[1] -= m * 2 * x * y; out[2] -= m * 2 * x * z;
  out[3] -= m * 2 * x * y; out[4] += m * (x * x + z * z); out[5] -= m * 2 * y * z;
  out[6] -= m * 2 * x * z; out[7] -= m * 2 * y * z; out[8] += m * (x * x + y * y);
}
const tmpvec = vec3.create(), tmpmat = mat3.create(), zeromat = new Float32Array(9);

export default class RigidBody {
  moveEnabled = true; // whether object is allowed to move
  rotateEnabled = true; // whether object is allowed to rotate
  lockAxis_ = null; // lock object movement to given axis
  shapes = [];

  needRecomputeShape = false; // internal flag that invalidates when a shape is added/removed
  mass = 0; // mass
  invMass_ = mat3.create(); // 1 / mass
  center = vec3.create(); // center of mass in local coordinates
  position = vec3.create(); // center of mass in world coordinates
  orientation = quat.create(); // rotation around center of mass (local -> world)
  localInvInertia = mat3.create(); // inverse inertia tensor in local coordinates
  sleepTime = 0; // how long body has been stationary for
  motion_ = 0; // measure of body speed for sleep detection

  velocity = vec3.create(); // object velocity in world coordinates
  angVelocity = vec3.create(); // angular velocity in world coordinates
  invInertia_ = mat3.create(); // inverse inertia tensor in world coordinates
  lastVelocity = vec3.create(); // velocity at start of frame
  lastAngVelocity = vec3.create(); // angular velocity at start of frame

  force = vec3.create(); // force to be applied in applyForces
  torque = vec3.create(); // torque to be applied in applyForces

  localInertia = mat3.create(); // local inertia tensor - only used during shape update
  inertia = mat3.create(); // world inertia tensor - currently not used
  angMomentum = vec3.create(); // angular momentum vector - used in angular momentum mode (unstable)

  gravity = config.defaultGravity; // gravity force affecting this object

  // transform: either automatically updated matrix that determines local -> world transform
  // or input matrix in animated mode

  constructor(name, transform) {
    this.name = name;
    this.transform = transform || mat4.create();
  }

  setMoves(moves, rotates) {
    this.moveEnabled = moves;
    this.rotateEnabled = (rotates === undefined ? moves : rotates);
    this.needRecomputeShape = true;
  }
  get moves() {
    return this.moveEnabled && this.shapes.length !== 0;
  }
  get rotates() {
    return this.rotateEnabled && this.shapes.length !== 0;
  }

  lockAxis(vec) {
    if (vec) {
      this.lockAxis_ = vec3.clone(vec);
    } else {
      this.lockAxis_ = null;
    }
    this.needRecomputeShape = true;
  }

  get invMass() {
    return this.sleeping ? zeromat : this.invMass_;
  }
  get invInertia() {
    return this.sleeping ? zeromat : this.invInertia_;
  }

  get motion() {
    const speed = vec3.squaredLength(this.velocity) + vec3.squaredLength(this.angVelocity);
    return this.motion_ * 0.9 + speed * 0.1;
  }

  addShape(shape) {
    shape.body = this;
    this.shapes.push(shape);
    this.needRecomputeShape = true;
    if (this.world) {
      this.world.addShape(shape);
    }
    shape.update();
  }

  removeShape(shape) {
    if (this.world) {
      this.world.removeShape(shape);
    }
    delete shape.body;
    this.shapes.splice(this.shapes.indexOf(shape), 1);
    this.needRecomputeShape = true;
  }

  updateShape() {
    if (!this.needRecomputeShape) return;
    this.needRecomputeShape = false;
    this.mass = 0;
    if (!this.moves) {
      vec3.set(this.center, 0, 0, 0);
      mat3.zero(this.localInvInertia);
      mat3.zero(this.invInertia_);
      vec3.transformMat4(this.position, this.center, this.transform);
      return;
    }
    const inertia = this.localInertia;
    this.mass = this.shapes[0].getInfo(this.center, inertia);
    if (this.shapes.length > 1) {
      addInertia(inertia, this.mass, this.center);
      vec3.scale(this.center, this.center, this.mass);
      for (var i = 1; i < this.shapes.length; ++i) {
        const mass = this.shapes[i].getInfo(tmpvec, tmpmat);
        this.mass += mass;
        mat3.add(inertia, inertia, tmpmat);
        vec3.scaleAndAdd(this.center, this.center, tmpvec, mass);
        addInertia(inertia, mass, tmpvec);
      }
    }
    if (!this.mass) {
      mat3.zero(this.localInvInertia);
      mat3.zero(this.invInertia_);
      vec3.transformMat4(this.position, this.center, this.transform);
      return;
    }
    const invMass = 1 / this.mass;
    if (this.lockAxis_) {
      mat3.vectorT(this.invMass_, this.lockAxis_, this.lockAxis_);
      mat3.multiplyScalar(this.invMass_, this.invMass_, invMass);
    } else {
      mat3.diagonal(this.invMass_, invMass, invMass, invMass);
    }
    if (this.shapes.length > 1) {
      vec3.scale(this.center, this.center, invMass);
      addInertia(inertia, -this.mass, this.center);
    }
    vec3.transformMat4(this.position, this.center, this.transform);
    if (!this.rotates) {
      mat3.zero(this.localInvInertia);
      mat3.zero(this.invInertia_);
    } else {
      mat3.invert(this.localInvInertia, inertia);
    }
  }

  beginFrame(elapsed) {
    this.updateShape();
    if (this.moves) {
      if (!this.sleeping) {
        vec3.copy(this.lastVelocity, this.velocity);
        vec3.copy(this.lastAngVelocity, this.angVelocity);
        vec3.scaleAndAdd(this.force, this.force, this.gravity, this.mass);
      }
      this.calculateInertia();
    } else if (this.animated) {
      if (this.prevPosition) {
        vec3.copy(this.prevPosition, this.position);
        quat.copy(this.prevOrientation, this.orientation);
      }
      vec3.transformMat4(this.position, this.center, this.transform);
      quat.fromMat3(this.orientation, mat3.fromMat4(tmpmat, this.transform));
      quat.normalize(this.orientation, this.orientation);
      if (elapsed > 1e-6 && this.prevPosition) {
        vec3.subtract(this.velocity, this.position, this.prevPosition);
        const deltaQ = quat.conjugate(quat.create(), this.prevOrientation);
        quat.multiply(deltaQ, this.orientation, deltaQ);
        vec3.fromQuat(this.angVelocity, deltaQ);
        vec3.scale(this.velocity, this.velocity, 1 / elapsed);
        vec3.scale(this.angVelocity, this.angVelocity, 1 / elapsed);
      } else {
        vec3.set(this.velocity, 0, 0, 0);
        vec3.set(this.angVelocity, 0, 0, 0);
      }
      if (!this.prevPosition) {
        this.prevPosition = vec3.clone(this.position);
        this.prevOrientation = quat.clone(this.orientation);
      }
      vec3.copy(this.lastVelocity, this.velocity);
      vec3.copy(this.lastAngVelocity, this.angVelocity);
    }
  }

  applyForces(elapsed) {
    if (this.moves && !this.sleeping) {
      vec3.transformMat3(tmpvec, this.force, this.invMass_);
      vec3.scaleAndAdd(this.velocity, this.velocity, tmpvec, elapsed);
      vec3.transformMat3(tmpvec, this.torque, this.invInertia_);
      vec3.scaleAndAdd(this.angVelocity, this.angVelocity, tmpvec, elapsed);
    }
  }

  endFrame(elapsed) {
    vec3.set(this.force, 0, 0, 0);
    vec3.set(this.torque, 0, 0, 0);
    if (this.moves && !this.sleeping) {
      if (this.linDamping) vec3.scale(this.velocity, this.velocity, Math.pow(this.linDamping, elapsed));
      if (this.angDamping) {
        vec3.scale(this.angVelocity, this.angVelocity, Math.pow(this.angDamping, elapsed));
      }

      vec3.scaleAndAdd(this.position, this.position, this.velocity, elapsed);
      quat.adjustVec3(this.orientation, this.orientation, this.angVelocity, elapsed);
      this.calculateTransform();
      this.calculateInertia();
      this.motion_ = this.motion;
      if (this.motion_ < config.sleepThreshold) {
        this.sleepTime += elapsed;
        if (this.canSleep !== false && config.sleepTime && this.sleepTime > config.sleepTime) {
          this.motion_ = 0;
          this.sleeping = true;
          vec3.set(this.velocity, 0, 0, 0);
          vec3.set(this.angVelocity, 0, 0, 0);
        }
      } else {
        this.wake();
      }
    } else if (!this.moves && !this.animated) {
      this.motion_ = 0;
      this.sleeping = true;
    }
  }

  wake() {    
    this.sleepTime = 0;
    if (this.sleeping) {
      this.sleeping = false;
      return true;
    }
  }

  addImpulse(impulse) {
    vec3.transformMat3(tmpvec, impulse, this.invMass);
    vec3.add(this.velocity, this.velocity, tmpvec);
  }

  addImpulseAt(impulse, pos) {
    vec3.transformMat3(tmpvec, impulse, this.invMass);
    vec3.add(this.velocity, this.velocity, tmpvec);
    vec3.subtract(tmpvec, pos, this.position);
    vec3.cross(tmpvec, tmpvec, impulse);
    vec3.transformMat3(tmpvec, tmpvec, this.invInertia);
    vec3.add(this.angVelocity, this.angVelocity, tmpvec);
  }

  addForce(force) {
    vec3.add(this.force, this.force, force);
  }

  addForceAt(force, pos) {
    const relPos = vec3.subtract(tmpvec, pos, this.position);
    vec3.cross(relPos, relPos, force);
    vec3.add(this.force, this.force, force);
    vec3.add(this.torque, this.torque, relPos);
  }

  localToWorld(dst, pos) {
    return vec3.transformMat4(dst, pos, this.transform);
  }

  velocityAt(out, pos) {
    vec3.subtract(out, pos, this.position);
    vec3.cross(out, this.angVelocity, out);
    vec3.add(out, out, this.velocity);
    return out;
  }

  lastVelocityAt(out, pos) {
    vec3.subtract(out, pos, this.position);
    vec3.cross(out, this.lastAngVelocity, out);
    vec3.add(out, out, this.lastVelocity);
    return out;
  }

  calculateInertia() {
    if (config.angularMomentum) {
      mat3.invert(tmpmat, this.invInertia_);
      vec3.transformMat3(this.angMomentum, this.angVelocity, tmpmat);
    }
    mat3.fromQuat(tmpmat, this.orientation);
    mat3.transformInv(this.invInertia_, this.localInvInertia, tmpmat);
    if (config.angularMomentum) {
      vec3.transformMat3(this.angVelocity, this.angMomentum, this.invInertia_);
      //mat3.transform(this.inertia, this.localInertia, tmpmat);
    }
  }

  calculateTransform() {
    mat4.fromQuat(this.transform, this.orientation);
    const trCenter = vec3.transformMat4(tmpvec, this.center, this.transform);
    vec3.subtract(trCenter, this.position, trCenter);
    this.transform[12] = trCenter[0];
    this.transform[13] = trCenter[1];
    this.transform[14] = trCenter[2];

    this.shapes.forEach(shape => shape.update());
  }

  unitImpulseMatrix(mat, point) {
    const iit = this.invInertia, im = this.invMass;
    const x = point[0] - this.position[0],
          y = point[1] - this.position[1],
          z = point[2] - this.position[2];
    const m00 = iit[0], m01 = iit[1], m02 = iit[2],
          m10 = iit[3], m11 = iit[4], m12 = iit[5],
          m20 = iit[6], m21 = iit[7], m22 = iit[8];
    const t00 = z * m10 - y * m20, t01 = z * m11 - y * m21, t02 = z * m12 - y * m22,
          t10 = x * m20 - z * m00, t11 = x * m21 - z * m01, t12 = x * m22 - z * m02,
          t20 = y * m00 - x * m10, t21 = y * m01 - x * m11, t22 = y * m02 - x * m12;
    mat[0] = t01 * z - t02 * y + im[0]; mat[1] = t02 * x - t00 * z + im[1]; mat[2] = t00 * y - t01 * x + im[2];
    mat[3] = t11 * z - t12 * y + im[3]; mat[4] = t12 * x - t10 * z + im[4]; mat[5] = t10 * y - t11 * x + im[5];
    mat[6] = t21 * z - t22 * y + im[6]; mat[7] = t22 * x - t20 * z + im[7]; mat[8] = t20 * y - t21 * x + im[8];
    return mat;
  }
}
