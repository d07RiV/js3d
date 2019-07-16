import GraphicsObject from './object';
import { mat3, mat4, AABB } from 'math';

const nmat = mat3.create(), tmat = mat4.create(), tbox = AABB.create();

export default class RenderList extends GraphicsObject {
  list = [];

  constructor(renderer, list = [], name) {
    super(renderer, name);
    this.list = list;
  }

  clear() {
    this.list.length = 0;
  }
  add(matrix, primitive, morphWeights) {
    this.list.push({matrix, primitive, morphWeights});
  }

  getBoundingBox(transform = null) {
    return this.list.reduce((aabb, {matrix, primitive}) => {
      mat4.fromAABB(tmat, primitive.box);
      mat4.multiply(tmat, matrix, tmat);
      if (transform) {
        mat4.multiply(tmat, transform, tmat);
      }
      AABB.fromMat4(tbox, tmat);
      if (aabb) {
        return AABB.combine(aabb, aabb, tbox);
      } else {
        return AABB.clone(tbox);
      }
    }, null);
  }

  render(shaderClass, uniforms) {
    const mmap = new Map();

    this.list.forEach(({primitive}) => delete primitive.shader_);

    this.list.forEach(({primitive, skin}) => {
      if (primitive.shader_) {
        return;
      }

      const attributes = primitive.vertexArray.attributes;
      let shaderDefines = {};
      if (shaderClass.useMaterials) {
        if (mmap.has(primitive.material)) {
          shaderDefines = mmap.get(primitive.material);
        } else {
          mmap.set(primitive.material, shaderDefines = primitive.material.defines);
        }
      }
      if (skin) {
        //TODO: skins
        shaderDefines = {...shaderDefines, NUM_SKIN_MATRICES: skin.joints.length};
      }
      const shaderKey = `${shaderClass.shaderName || shaderClass.name}|${attributes.join(",")}|${JSON.stringify(shaderDefines)}`;

      primitive.shader_ = this.renderer.cache(shaderKey, () => new shaderClass(this.renderer, attributes, shaderDefines));
      if (uniforms) uniforms(primitive.shader_);
      delete primitive.shader_.skin_;
      delete primitive.shader_.material_;
    });

    this.list.sort(({primitive: a}, {primitive: b}) => {
      const ab = a.material.alphaMode === "BLEND" ? 1 : 0, bb = b.material.alphaMode === "BLEND" ? 1 : 0;
      if (ab !== bb) return ab - bb;
      if (a.shader_ !== b.shader_) return a.shader_.instanceId - b.shader_.instanceId;
      //TODO: sort by skin
      if (a.vertexArray !== b.vertexArray) return a.vertexArray.instanceId - b.vertexArray.instanceId;
      return a.material.instanceId - b.material.instanceId;
    });

    let activeVertexArray = null;
    this.list.forEach(({matrix, primitive, morphWeights, skin}) => {
      const shader = primitive.shader_;
      shader.use();
      if (skin && skin !== shader.skin_) {
        shader.skin_ = skin;
        //TODO: skin matrices
      }
      shader.mat4("u_ModelMatrix", matrix);
      mat3.normalFromMat4(nmat, matrix);
      shader.mat3("u_NormalMatrix", nmat);

      if (shaderClass.useMaterials) {
        if (shader.material_ !== primitive.material) {
          primitive.material.apply(shader);
          shader.material_ = primitive.material;
        }
      }

      if (morphWeights) {
        if (morphWeights.length < 4) {
          const mw = new Float32Array(4);
          mw.set(morphWeights);
          shader.vec4("u_MorphWeights", mw);
        } else if (morphWeights.length > 4) {
          shader.vec4("u_MorphWeights", morphWeights.subarray(0, 4));
        } else {
          shader.vec4("u_MorphWeights", morphWeights);
        }
      }

      if (activeVertexArray !== primitive.vertexArray) {
        activeVertexArray = primitive.vertexArray.bind();
      }
      primitive.render();
    });
    this.renderer.gl.bindVertexArray(null);
  }

  filter(func) {
    return new RenderList(this.renderer, this.list.filter(func), this.name);
  }

  get length() {
    return this.list.length;
  }
}
