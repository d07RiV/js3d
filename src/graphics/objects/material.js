import { vec3, vec4 } from 'math';
import UniformStruct from './uniformBuffer';

const MaterialStruct = UniformStruct(null, [
  ["vec4", "baseColorFactor"],
  ["vec3", "emissiveFactor"],
  ["float", "metallicFactor"],
  ["float", "roughnessFactor"],
  ["float", "normalScale"],
  ["float", "occlusionStrength"],
  ["float", "alphaCutoff"],
]);

export default class Material extends MaterialStruct {
  baseColorTexture = null;
  metallicRoughnessTexture = null;
  normalTexture = null;
  occlussionTexture = null;
  emissiveTexture = null;

  alphaMode = "OPAQUE";
  doubleSided = false;

  constructor(renderer, name) {
    super(renderer, name);
    vec4.set(this.baseColorFactor, 1.0, 1.0, 1.0, 1.0);
    vec3.set(this.emissiveFactor, 0.0, 0.0, 0.0);
    this.metallicFactor = 1.0;
    this.roughnessFactor = 1.0;
    this.normalScale = 1.0;
    this.occlussionStrength = 1.0;
    this.alphaCutoff = 0.5;
  }

  setColor(r, g, b, a=1.0) {
    vec4.set(this.baseColorFactor, r, g, b, a);
    return this;
  }
  setEmissive(r, g, b) {
    vec3.set(this.emissiveFactor, r, g, b);
    return this;
  }

  get defines() {
    const result = {};
    if (this.baseColorTexture && this.baseColorTexture.texture) {
      result.MATERIAL_BASE_COLOR_TEXTURE = this.baseColorTexture.texCoord || 0;
    }
    if (this.metallicRoughnessTexture && this.metallicRoughnessTexture.texture) {
      result.MATERIAL_METALLIC_ROUGHNESS_TEXTURE = this.metallicRoughnessTexture.texCoord || 0;
    }
    if (this.normalTexture && this.normalTexture.texture) {
      result.MATERIAL_NORMAL_TEXTURE = this.normalTexture.texCoord || 0;
    }
    if (this.occlussionTexture && this.occlussionTexture.texture) {
      result.MATERIAL_OCCLUSION_TEXTURE = this.occlussionTexture.texCoord || 0;
    }
    if (this.emissiveTexture && this.emissiveTexture.texture) {
      result.MATERIAL_EMISSIVE_TEXTURE = this.emissiveTexture.texCoord || 0;
    }
    if (this.alphaMode === "BLEND") {
      result.MATERIAL_ALPHA_BLEND = 1;
    } else if (this.alphaMode === "MASK") {
      result.MATERIAL_ALPHA_MASK = 1;
    } else {
      result.MATERIAL_OPAQUE = 1;
    }
    if (this.doubleSided) {
      result.MATERIAL_DOUBLE_SIDED = 1;
    }
    return result;
  }

  apply(shader) {
    shader.uniforms("MaterialBlock", this);
    if (this.baseColorTexture) {
      shader.sampler("u_BaseColorTexture", this.baseColorTexture.texture);
    }
    if (this.metallicRoughnessTexture) {
      shader.sampler("u_MetallicRoughnessTexture", this.metallicRoughnessTexture.texture);
    }
    if (this.normalTexture) {
      shader.sampler("u_NormalTexture", this.normalTexture.texture);
    }
    if (this.occlussionTexture) {
      shader.sampler("u_OcclussionTexture", this.occlussionTexture.texture);
    }
    if (this.emissiveTexture) {
      shader.sampler("u_EmissiveTexture", this.emissiveTexture.texture);
    }
  }
}
