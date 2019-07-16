import GraphicsObject from './object';
import { AABB } from 'math';
import VertexArray from './vertexArray';
import * as WebGL from '../constants';

export default class Primitive extends GraphicsObject {
  mode = WebGL.TRIANGLES;

  constructor(renderer, vertices, indices, count, box) {
    super(renderer);
    if (vertices instanceof VertexArray) {
      this.vertexArray = vertices;
      if (indices) this.indices = indices;
    } else {
      const { buffer: indexBuffer, ...indexOther } = indices || {};
      this.vertexArray = new renderer.VertexArray(vertices, indexBuffer);
      if (indices) this.indices = indexOther;
    }
    this.count = count;
    this.box = AABB.clone(box);
    this.material = renderer.defaultMaterial;
  }

  clone(material) {
    const pr = new Primitive(this.renderer, this.vertexArray, this.indices, this.count, this.box);
    pr.material = material || this.material;
    return pr;
  }

  render() {
    if (this.indices) {
      this.renderer.gl.drawElements(this.mode, this.count, this.indices.type, this.indices.offset || 0);
    } else {
      this.renderer.gl.drawArrays(this.mode, 0, this.count);
    }
  }
}
