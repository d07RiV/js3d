import dedent from 'dedent';
import { mat4 } from 'math';
import * as WebGL from '../../constants';
import ShadowTechnique from './shadow';

const tmpm = mat4.create();

export default class PercentageCloserFilter extends ShadowTechnique {
  static shadowmapType = "sampler2DShadow";
  static shadowmapTypeArray = "sampler2DArrayShadow";
  static needsDerivatives = true;

  get type() {
    return `PCF_${this.kernel}`;
  }

  shadowmapFrag = dedent`
    //in float depth;
    void main() {
      //gl_FragDepth = depth;
    }
  `;
  // float shadowFunc(in LightInfo light)
  get shadowFunc() {
    const coeff = (f, v) => {
      if (f === 0) return "";
      if (f === 1) return ` + ${v}`;
      if (f === -1) return ` - ${v}`;
      if (f > 0) return ` + ${f.toFixed(1)} * ${v}`;
      return ` - ${(-f).toFixed(1)} * ${v}`;
    };
    const lines = [];
    for (let i = -this.kernel; i <= this.kernel; ++i) {
      for (let j = -this.kernel; j <= this.kernel; ++j) {
        if (i !== 0 || j !== 0) {
          lines.push(`accum += texture(u_ShadowMap, uvw${coeff(i, "dx")}${coeff(j, "dy")});`);
        }
      }
    }
    return dedent`{
      vec2 size = vec2(textureSize(u_ShadowMap, 0));
      vec3 pos = (light.shadow.xyz / light.shadow.w) * 0.5 + 0.5;
      vec3 ux = light.shadowDx;
      vec3 uy = light.shadowDy;
      //vec3 ux = dFdx(pos);
      //vec3 uy = dFdy(pos);
      vec2 offset = vec2(ux.z * uy.y - ux.y * uy.z, ux.x * uy.z - ux.z * uy.x) / (ux.x * uy.y - ux.y * uy.x);
    #if SHADOWMAP_ARRAY
      vec4 uvw = vec4(pos.xy, float(light.shadowLayer), pos.z);
      vec4 dx = vec4(1.0, 0.0, 0.0, offset.x) / size.x;
      vec4 dy = vec4(0.0, 1.0, 0.0, offset.y) / size.y;
      uvw.w -= abs(dx.w) + abs(dy.w) + 0.001;
    #else
      vec3 uvw = pos;
      vec3 dx = vec3(1.0, 0.0, offset.x) / size.x;
      vec3 dy = vec3(0.0, 1.0, offset.y) / size.y;
      uvw.z -= abs(dx.z) + abs(dy.z) + 0.001;
    #endif
      float accum = texture(u_ShadowMap, uvw);
      ${lines.join("\n")}
      return accum / ${Math.pow(this.kernel * 2 + 1, 2).toFixed(1)};
    }`;
  }

  constructor(renderer, resolution=1024, kernel=2) {
    super(renderer);

    this.resolution = resolution;
    this.kernel = kernel;
    this.padding = 3 + kernel;
  }

  get target() {
    const { renderer, resolution } = this;
    return renderer.cache(`pcf_target_${resolution}`, () => (
      new renderer.RenderTarget(resolution, resolution, {
        depth: {
          format: WebGL.DEPTH_COMPONENT32F,
          filter: WebGL.LINEAR,
          wrap: WebGL.CLAMP_TO_EDGE,
          compare: WebGL.LEQUAL,
        },
      }, {
        depthTest: true,
        depthMask: true,
        blend: false,
        cull: true,
      })
    ));
  }

  getArrayTargets(count) {
    const { renderer, resolution } = this;
    return renderer.cache(`pcf_target_array_${resolution}_${count}`, () => {
      const texture = new renderer.Texture(WebGL.TEXTURE_2D_ARRAY);
      texture.create3D(resolution, resolution, count, WebGL.DEPTH_COMPONENT32F);
      texture.filter(WebGL.LINEAR);
      texture.wrap(WebGL.CLAMP_TO_EDGE);
      texture.compareMode(WebGL.COMPARE_REF_TO_TEXTURE, WebGL.LEQUAL);

      const targets = [...Array(count)].map((_, layer) => (
        new renderer.RenderTarget(resolution, resolution, {
          depth: {texture, layer},
        }, {
          depthTest: true,
          depthMask: true,
          blend: false,
          cull: true,
        })
      ));

      return { texture, targets };
    });
  }

  renderMap(drawFunction) {
    const { target } = this;
    target.bind().clear();
    drawFunction();
    target.unbind();
    return target.depth;
  }

  renderMapArray(drawFunction, count) {
    const { texture, targets } = this.getArrayTargets(count);
    targets.forEach((target, index) => {
      target.bind().clear();
      drawFunction(index);
      target.unbind();
    });
    return texture;
  }
}
