import dedent from 'dedent';
import { mat4 } from 'math';
import * as WebGL from '../../constants';
import ShadowTechnique from './shadow';

const tmpm = mat4.create();

export default class VarianceShadowMap extends ShadowTechnique {
  static shadowmapType = "sampler2D";
  static shadowmapTypeArray = "sampler2DArray";

  shadowmapFrag = dedent`
    in float v_Depth;
    layout(location=0) out vec2 o_Moments;
    void main() {
      float dx = dFdx(v_Depth);
      float dy = dFdy(v_Depth);
      o_Moments = vec2(v_Depth, v_Depth * v_Depth + 0.25 * (dx * dx + dy * dy));
    }
  `;
  // float shadowFunc(in shadowmapType map, in LightInfo light)
  shadowFunc = dedent`{
    vec2 uv = (light.shadow.xy / light.shadow.w) * 0.5 + 0.5;
    vec2 moments = texture(u_ShadowMap, uv).xy;
    float p = smoothstep(light.distance - 0.001, light.distance, moments.x);
    float variance = max(moments.y - moments.x * moments.x, -0.00005);
    float d = light.distance - moments.x;
    float p_max = clamp((variance / (variance + d * d) - 0.3) / 0.7, 0.0, 1.0);
    return clamp(max(p, p_max), 0.0, 1.0);
  }`;

  constructor(renderer, resolution=1024, msaa=1, filter=true) {
    super(renderer);

    this.resolution = resolution;
    this.padding = 4;
    this.msaa = msaa;
    this.useFilter = filter;
  }

  get target() {
    const { renderer, resolution, msaa } = this;
    return renderer.cache(`vsm_target_${resolution}_${msaa}`, () => (
      new renderer.RenderTarget(resolution, resolution, {
        color: {
          type: "renderbuffer",
          format: WebGL.RG32F,
          samples: msaa,
        },
        depth: {
          type: "renderbuffer",
          format: WebGL.DEPTH_COMPONENT24,
          samples: msaa,
        },
      }, {
        depthTest: true,
        depthMask: true,
        blend: false,
        cull: true,
        clearColor: [1.0, 1.0, 1.0, 1.0],
      })
    ));
  }

  get textureTarget() {
    const { renderer, resolution } = this;
    return renderer.cache(`vsm_color_${resolution}`, () => (
      new renderer.RenderTarget(resolution, resolution, {
        color: {
          format: WebGL.RG32F,
          filter: WebGL.LINEAR,
          wrap: WebGL.CLAMP_TO_EDGE,
        }
      })
    ));
  }

  get filter() {
    const { renderer } = this;
    return renderer.cache("box_filter", () => (
      new renderer.Filters.Local(dedent`
        return (get(-1,-1) + get(-1, 0) + get(-1, 1) +
                get( 0,-1) + get( 0, 0) + get( 0, 1) +
                get( 1,-1) + get( 1, 0) + get( 1, 1)) / 9.0;
      `)
    ));
  }

  get filterTarget() {
    const { renderer, resolution } = this;
    return renderer.cache(`vsm_filter_${resolution}`, () => (
      new renderer.RenderTarget(resolution, resolution, {
        color: {
          format: WebGL.RG32F,
          filter: WebGL.LINEAR,
          wrap: WebGL.CLAMP_TO_EDGE,
        }
      }, {
        depthTest: false,
        depthMask: false,
        blend: false,
      })
    ));
  }

  renderMap(drawFunction) {
    const { target, textureTarget } = this;

    target.bind().clear();
    drawFunction();
    target.unbind();

    textureTarget.bind();
    textureTarget.blit(target, WebGL.COLOR_BUFFER_BIT);
    textureTarget.unbind();

    let result = textureTarget.color;
    if (this.useFilter) {
      const { filter, filterTarget } = this;
      result = filter.apply(result, filterTarget).color;
    }
    return result;
  }
}
