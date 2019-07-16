import dedent from 'dedent';
import formatCompilerError from 'gl-format-compiler-error';
import * as WebGL from '../constants';
import GraphicsObject from './object';

export default class Shader extends GraphicsObject {
  uniformCache = {};
  samplers = {};
  samplerUnits = [];
  uboCache = {};
  uboUnits = 0;

  constructor(renderer, vertex, fragment, options={}) {
    super(renderer);

    const { version=300, defines={}, fragments={} } = options;
    let header = `#version ${version} es`;
    for (let name in defines) {
      header += `\n#define ${name} ${defines[name]}`;
    }
    vertex = vertex.replace(/\${(.*?)}/g, (_, name) => fragments[name]);
    fragment = fragment.replace(/\${(.*?)}/g, (_, name) => fragments[name]);
    this.vertSource = dedent`
      ${header}
      ${vertex}
    `;
    this.fragSource = dedent`
      ${header}
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      #define PRECISION highp
      #else
      #define PRECISION mediump
      #endif
      precision PRECISION float;
      ${fragment}
    `;
    const gl = renderer.gl;
    this.program = gl.createProgram();
    this.vertex = this.compileShader(WebGL.VERTEX_SHADER, this.vertSource);
    this.fragment = this.compileShader(WebGL.FRAGMENT_SHADER, this.fragSource);
    gl.attachShader(this.program, this.vertex);
    gl.attachShader(this.program, this.fragment);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, WebGL.LINK_STATUS)) {
      throw new Error(`*** Error linking program: ${gl.getProgramInfoLog(this.program)}`);
    }
  }

  destroy() {
    this.renderer.gl.deleteProgram(this.program);
    this.renderer.gl.deleteShader(this.vertex);
    this.renderer.gl.deleteShader(this.fragment);
  }

  compileShader(type, source) {
    const gl = this.renderer.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, WebGL.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      const fmt = formatCompilerError(log, source, type);
      console.warn(fmt.long);
      throw new Error(fmt.short);
    }
    return shader;
  }

  use() {
    if (this.renderer.activeProgram !== this) {
      this.renderer.activeProgram = this;
      this.renderer.gl.useProgram(this.program);
    }
    return this;
  }

  uniformLocation(name) {
    let location;
    if (this.uniformCache.hasOwnProperty(name)) {
      location = this.uniformCache[name];
    } else {
      location = this.uniformCache[name] = this.renderer.gl.getUniformLocation(this.program, name);
      if (!location) {
        console.warn(`undefined uniform ${name}`);
      }
    }
    return location;
  }

  sampler(name, texture) {
    let unit = this.samplers[name];
    if (unit == null) {
      unit = this.samplers[name] = this.samplerUnits.length;
      this.int(name, unit);
    }
    if (texture) texture.bind(unit);
    this.samplerUnits[unit] = texture;
    return this;
  }

  uniforms(name, buffer, data) {
    let unit = this.uboCache[name];
    if (unit == null) {
      unit = this.uboCache[name] = this.uboUnits++;
      const index = this.renderer.gl.getUniformBlockIndex(this.program, name);
      if (index === WebGL.INVALID_INDEX) {
        console.warn(`undefined uniform block ${name}`);
      }
      this.renderer.gl.uniformBlockBinding(this.program, index, unit);
    }
    this.use();
    buffer.bind(unit, data);
    return this;
  }

  int(name, value) {
    const loc = this.uniformLocation(name);
    this.use();
    if (loc) this.renderer.gl.uniform1i(loc, value);
    return this;
  }
  int2(name, value) {
    const loc = this.uniformLocation(name);
    this.use();
    if (loc) this.renderer.gl.uniform2iv(loc, value);
    return this;
  }
  int3(name, value) {
    const loc = this.uniformLocation(name);
    this.use();
    if (loc) this.renderer.gl.uniform3iv(loc, value);
    return this;
  }
  int4(name, value) {
    const loc = this.uniformLocation(name);
    this.use();
    if (loc) this.renderer.gl.uniform4iv(loc, value);
    return this;
  }

  float(name, value) {
    const loc = this.uniformLocation(name);
    this.use();
    if (loc) this.renderer.gl.uniform1f(loc, value);
    return this;
  }
  vec2(name, value) {
    const loc = this.uniformLocation(name);
    this.use();
    if (loc) this.renderer.gl.uniform2fv(loc, value);
    return this;
  }
  vec3(name, value) {
    const loc = this.uniformLocation(name);
    this.use();
    if (loc) this.renderer.gl.uniform3fv(loc, value);
    return this;
  }
  vec4(name, value) {
    const loc = this.uniformLocation(name);
    this.use();
    if (loc) this.renderer.gl.uniform4fv(loc, value);
    return this;
  }

  mat2(name, value) {
    const loc = this.uniformLocation(name);
    this.use();
    if (loc) this.renderer.gl.uniformMatrix2fv(loc, false, value);
    return this;
  }
  mat3(name, value) {
    const loc = this.uniformLocation(name);
    this.use();
    if (loc) this.renderer.gl.uniformMatrix3fv(loc, false, value);
    return this;
  }
  mat4(name, value) {
    const loc = this.uniformLocation(name);
    this.use();
    if (loc) this.renderer.gl.uniformMatrix4fv(loc, false, value);
    return this;
  }

  render(primitive) {
    this.use();
    this.samplerUnits.forEach((tex, unit) => tex && tex.bind(unit));
    primitive.vertexArray.bind();
    primitive.render();
    this.renderer.gl.bindVertexArray(null);
  }
}
