import * as WebGL from '../constants';
import GraphicsObject from './object';

export default class VertexArray extends GraphicsObject {
  constructor(renderer, attributes, indices) {
    super(renderer);

    const gl = renderer.gl;
    this.array = gl.createVertexArray();
    this.setAttributes(attributes, indices);
  }

  getAttributes() {
    const gl = this.renderer.gl;
    const attributes = {};
    gl.bindVertexArray(this.array);
    this.attributes.forEach((attr, index) => {
      attributes[attr] = {
        buffer: gl.getVertexAttrib(index, WebGL.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),
        size: gl.getVertexAttrib(index, WebGL.VERTEX_ATTRIB_ARRAY_SIZE),
        type: gl.getVertexAttrib(index, WebGL.VERTEX_ATTRIB_ARRAY_TYPE),
        normalized: gl.getVertexAttrib(index, WebGL.VERTEX_ATTRIB_ARRAY_NORMALIZED),
        stride: gl.getVertexAttrib(index, WebGL.VERTEX_ATTRIB_ARRAY_STRIDE),
        offset: gl.getVertexAttribOffset(index, WebGL.VERTEX_ATTRIB_ARRAY_POINTER),
      };
    });
    gl.bindVertexArray(null);
    return attributes;
  }

  getIndices() {
    const gl = this.renderer.gl;
    gl.bindVertexArray(this.array);
    const buffer = gl.getParameter(WebGL.ELEMENT_ARRAY_BUFFER_BINDING);
    gl.bindVertexArray(null);
    return buffer;
  }

  setAttributes(attributes, indices) {
    const gl = this.renderer.gl;
    gl.bindVertexArray(this.array);
    const prevCount = this.attributes && this.attributes.length || 0;
    this.attributes = Object.keys(attributes).sort();
    for (let i = this.attributes.length; i < prevCount; ++i) {
      gl.enableVertexAttribArray(i);
    }
    this.attributes.forEach((attr, index) => {
      const { buffer, size, type, normalized=false, stride=0, offset=0 } = attributes[attr];
      gl.bindBuffer(WebGL.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(index);
      if (attr.match(/^JOINTS_\d+$/)) {
        gl.vertexAttribIPointer(index, size, type, stride, offset);
      } else {
        gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
      }
    });
    gl.bindBuffer(WebGL.ELEMENT_ARRAY_BUFFER, indices);
    gl.bindVertexArray(null);
  }

  bind() {
    this.renderer.gl.bindVertexArray(this.array);
    return this;
  }
}
