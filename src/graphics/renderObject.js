import { vec3, mat4 } from 'math';

const tmp1 = vec3.create();

export default class RenderObject {
  constructor(renderer, mesh, material) {
    this.renderer = renderer;
    this.mesh = mesh;
    this.material = material;
  }

  get transparent() {
    return this.material.diffuse[3] < 0.99;
  }

  distance(pos) {
    let mid = this.mesh.center;
    if (this.transform) {
      mid = vec3.transformMat4(tmp1, mid, this.transform);
    }
    return vec3.squaredDistance(mid, pos);
  }

  boxMatrix(out) {
    mat4.fromAABB(out, this.mesh.box);
    if (this.transform) {
      mat4.multiply(out, this.transform, out);
    }
    return out;
  }

  render() {
    if (this.transform) {
      this.renderer.pushMatrix(this.transform);
    }
    this.material.apply();
    this.mesh.render();
    if (this.transform) {
      this.renderer.popMatrix(false);
    }
  }
}
