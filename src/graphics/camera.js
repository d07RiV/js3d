import { vec3, mat4 } from 'math';
// import { plane, Frustum, Ray } from 'math';

const tmp1 = vec3.create(), tmp2 = vec3.create();

export default class Camera {
  view = mat4.create();
  projection = mat4.create();
  corners = [vec3.create(), vec3.create(), vec3.create(), vec3.create()];
  cornerScale = 1.0;

  constructor(props, worldMatrix=mat4.create()) {
    this.name = props.name;
    this.props = props;
    this.type = props.type || "perspective";

    this.world = worldMatrix;
    this.pos = this.world.subarray(12, 15);
    this.dirX = this.world.subarray(0, 3);
    this.dirY = this.world.subarray(4, 7);
    this.dirZ = this.world.subarray(8, 11);

    // this.frustum = new Frustum([
    //   new Ray(this.pos, this.corners[0]),
    //   new Ray(this.pos, this.corners[1]),
    //   new Ray(this.pos, this.corners[2]),
    //   new Ray(this.pos, this.corners[3]),
    // ], plane.create(), plane.create());
  }

  update(aspect) {
    mat4.invert(this.view, this.world);

    if (this.type === "perspective") {
      const { xfov, yfov, znear, zfar=Infinity, aspectRatio=aspect } = this.props;
      this.aspect = aspectRatio;
      if (xfov) {
        this.fovX = xfov;
        this.tanX = Math.tan(this.fovX / 2);
        this.tanY = this.tanX / this.aspect;
        this.fovY = Math.atan(this.tanY) * 2;
      } else {
        this.fovY = yfov;
        this.tanY = Math.tan(this.fovY / 2);
        this.tanX = this.tanY * this.aspect;
        this.fovX = Math.atan(this.tanX) * 2;
      }
      this.near = znear;
      this.far = zfar;

      mat4.perspective(this.projection, this.fovY, aspectRatio, znear, zfar);

      this.cornerScale = 1.0 / Math.sqrt(1.0 + this.tanX * this.tanX + this.tanY * this.tanY);
      vec3.scale(tmp1, this.dirZ, -this.cornerScale);
      vec3.scaleAndAdd(tmp2, tmp1, this.dirX, -this.tanX * this.cornerScale);
      vec3.scaleAndAdd(this.corners[0], tmp2, this.dirY, this.tanY * this.cornerScale);
      vec3.scaleAndAdd(this.corners[1], tmp2, this.dirY, -this.tanY * this.cornerScale);
      vec3.scaleAndAdd(tmp2, tmp1, this.dirX, this.tanX * this.cornerScale);
      vec3.scaleAndAdd(this.corners[2], tmp2, this.dirY, -this.tanY * this.cornerScale);
      vec3.scaleAndAdd(this.corners[3], tmp2, this.dirY, this.tanY * this.cornerScale);
    } else {
      const { xmag, ymag, znear, zfar } = this.props;
      this.aspect = xmag / ymag;
      this.viewX = xmag;
      this.viewY = ymag;
      this.near = znear;
      this.far = zfar;

      mat4.ortho(this.projection, -xmag, xmag, -ymag, ymag, znear, zfar);

      vec3.scaleAndAdd(tmp1, this.pos, this.dirX, -xmag);
      vec3.scaleAndAdd(this.corners[0], tmp1, this.dirY, ymag);
      vec3.scaleAndAdd(this.corners[1], tmp1, this.dirY, -ymag);
      vec3.scaleAndAdd(tmp1, this.pos, this.dirX, xmag);
      vec3.scaleAndAdd(this.corners[2], tmp1, this.dirY, -ymag);
      vec3.scaleAndAdd(this.corners[3], tmp1, this.dirY, ymag);
    }

    // vec3.scaleAndAdd(tmp2, this.pos, this.dirZ, -this.near);
    // plane.setDirPoint(this.frustum.near, tmp1, tmp2);
    // vec3.scaleAndAdd(tmp2, this.pos, this.dirZ, -this.far);
    // plane.setDirPoint(this.frustum.far, this.dirZ, tmp2);
  }

  getCorners(out, depth) {
    const { pos, corners, dirZ } = this;
    if (this.type === "perspective") {
      depth /= this.cornerScale;
      vec3.scaleAndAdd(out[0], pos, corners[0], depth);
      vec3.scaleAndAdd(out[1], pos, corners[1], depth);
      vec3.scaleAndAdd(out[2], pos, corners[2], depth);
      vec3.scaleAndAdd(out[3], pos, corners[3], depth);
    } else {
      vec3.scaleAndAdd(out[0], corners[0], dirZ, -depth);
      vec3.scaleAndAdd(out[1], corners[1], dirZ, -depth);
      vec3.scaleAndAdd(out[2], corners[2], dirZ, -depth);
      vec3.scaleAndAdd(out[3], corners[3], dirZ, -depth);
    }
  }

  inverseProj() {
    const { tanX, tanY, near, far } = this;
    if (far !== Infinity) {
      return [tanX, tanY, (near - far) / (near * far), 1.0 / near];
    } else {
      return [tanX, tanY, -1.0 / near, 1.0 / near];
    }
  }
}
