import shaderFrag1 from './shader.frag';
import shaderFrag2 from './shader2.frag';
import shaderFrag3 from './fxaa.frag';

const shaderVert = `
  layout(location=0) in vec2 a_Position;
  void main() {
    gl_Position = vec4(a_Position, 0.0, 1.0);
  }
`;

export default class FXAAFilter {
  constructor(renderer, quality=14) {
    this.renderer = renderer;
    this.quad = renderer.quad;
    this.plainFilter = new renderer.Filters.Local("return get(0, 0)");
    this.setQuality(quality);
  }

  setQuality(quality) {
    if (quality === this.quality) {
      return;
    }
    if (this.shader) {
      this.shader.destroy();
      delete this.shader;
    }
    this.quality = quality;
    if (quality === 0) {
      return;
    }
    if (quality <= 8) {
      this.shader = new this.renderer.Shader(shaderVert, shaderFrag1);
    } else if (quality === 9) {
      this.shader = new this.renderer.Shader(shaderVert, shaderFrag2);
    } else {
      this.shader = new this.renderer.Shader(shaderVert, shaderFrag3, {
        defines: {FXAA_QUALITY_PRESET: quality}
      });
    }
  }

  apply(source) {
    if (this.shader) {
      this.shader.sampler("u_Texture", source);
      this.shader.render(this.quad);
    } else {
      this.plainFilter.apply(source);
    }
  }
}
