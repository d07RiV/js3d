import dedent from 'dedent';
import { mat4 } from 'math';
import * as WebGL from '../../constants';
import ShadowTechnique from './shadow';
import PoissonDisc from 'math/poisson';

const tmpm = mat4.create();

export default class SummedAreaVarianceShadowMap extends ShadowTechnique {
  static shadowmapTypes = ["usampler2D", "sampler2D"];
  get type() {
    return `SAVSM_${this.samples}_${this.maxSize}`;
  }

  shadowmapFrag = dedent`
    #version 300 es
    precision mediump float;
    in float depth;
    out vec2 moments;
    void main() {
      float dx = dFdx(depth);
      float dy = dFdy(depth);
      moments = clamp(vec2(depth, depth * depth + 0.25 * (dx * dx + dy * dy)), 0.0, 1.0);
    }
  `;
  // float shadowFunc(in usampler2D map, in sampler2D map2, in LightInfo light)
  get shadowFunc() {
    const disc = PoissonDisc(this.samples);
    //console.log(disc.map(([x, y]) => Math.sqrt(x * x + y * y)).sort((a, b) => b - a));
    //debugger;
    return dedent`{
      vec2 uv = (light.shadow.xy / light.shadow.w) * 0.5 + 0.5;
      vec2 texSize = vec2(textureSize(map, 0));
      //uv = clamp(uv, 2.0 * ${this.maxSize}.0 / texSize, 1.0 - 2.0 * ${this.maxSize}.0 / texSize);

      // angle = 1 / (penumbra.x * dist + penumbra.y)
      // texelsizeZ = penumbra.z * dist + penumbra.w
      vec4 lp = light.penumbra;
      float lightAngle = 1.0 / (lp.x * light.distance + lp.y);
      float searchRadius = min(light.distance * lightAngle / lp.w, ${this.maxSize}.0);
      float blockerDepth = 0.0, sampleDepth;
      ${disc.map(([x, y]) => dedent`
        sampleDepth = textureLod(map2, uv + searchRadius * vec2(${x.toFixed(6)}, ${y.toFixed(6)}) / texSize, 0.0).x;
        blockerDepth = max(blockerDepth, (light.distance - sampleDepth) * ${(1 - Math.pow(Math.max(Math.abs(x), Math.abs(y)), 1.5)).toFixed(6)});
      `).join("\n")}
      blockerDepth = light.distance - blockerDepth;

      float penumbraRadius = (light.distance - blockerDepth) / (lp.x * blockerDepth + lp.y);
      float kernelSize = penumbraRadius / (lp.z * light.distance + lp.w);
      kernelSize = clamp(kernelSize, 1.5, ${this.maxSize}.0);

      uv = uv * texSize;

      ivec2 uva = ivec2(uv - kernelSize);
      vec2 f0 = fract(uv - kernelSize);
      ivec2 uvd = ivec2(uv + kernelSize);
      vec2 f1 = fract(uv + kernelSize);
      ivec2 uvb = ivec2(uvd.x, uva.y);
      ivec2 uvc = ivec2(uva.x, uvd.y);

      uvec2 a00 = texelFetchOffset(map, uva, 0, ivec2(-1,-1)).xy;
      uvec2 a01 = texelFetchOffset(map, uva, 0, ivec2(-1, 0)).xy;
      uvec2 a10 = texelFetchOffset(map, uva, 0, ivec2( 0,-1)).xy;
      uvec2 a11 = texelFetchOffset(map, uva, 0, ivec2( 0, 0)).xy;
      uvec2 b00 = texelFetchOffset(map, uvb, 0, ivec2(-1,-1)).xy;
      uvec2 b01 = texelFetchOffset(map, uvb, 0, ivec2(-1, 0)).xy;
      uvec2 b10 = texelFetchOffset(map, uvb, 0, ivec2( 0,-1)).xy;
      uvec2 b11 = texelFetchOffset(map, uvb, 0, ivec2( 0, 0)).xy;
      uvec2 c00 = texelFetchOffset(map, uvc, 0, ivec2(-1,-1)).xy;
      uvec2 c01 = texelFetchOffset(map, uvc, 0, ivec2(-1, 0)).xy;
      uvec2 c10 = texelFetchOffset(map, uvc, 0, ivec2( 0,-1)).xy;
      uvec2 c11 = texelFetchOffset(map, uvc, 0, ivec2( 0, 0)).xy;
      uvec2 d00 = texelFetchOffset(map, uvd, 0, ivec2(-1,-1)).xy;
      uvec2 d01 = texelFetchOffset(map, uvd, 0, ivec2(-1, 0)).xy;
      uvec2 d10 = texelFetchOffset(map, uvd, 0, ivec2( 0,-1)).xy;
      uvec2 d11 = texelFetchOffset(map, uvd, 0, ivec2( 0, 0)).xy;

      vec2 moments = (vec2(d00 - c00 - b00 + a00)
                    - vec2(c10 - c00 - a10 + a00) * f0.x
                    - vec2(b01 - a01 - b00 + a00) * f0.y
                    + vec2(a11 - a01 - a10 + a00) * f0.x * f0.y
                    + vec2(d10 - d00 - b10 + b00) * f1.x
                    - vec2(b11 - b01 - b10 + b00) * f1.x * f0.y
                    + vec2(d01 - c01 - d00 + c00) * f1.y
                    - vec2(c11 - c01 - c10 + c00) * f0.x * f1.y
                    + vec2(d11 - d01 - d10 + d00) * f1.x * f1.y) / ${this.intScale}.0;
      moments /= 4.0 * kernelSize * kernelSize;

      float p = smoothstep(light.distance - 0.001, light.distance, moments.x);
      float variance = max(moments.y - moments.x * moments.x, -0.00005);
      float d = light.distance - moments.x;
      float p_max = clamp((variance / (variance + d * d) - 0.3) / 0.7, 0.0, 1.0);
      return clamp(max(p, p_max), 0.0, 1.0);
    }`;
  }

  constructor(renderer, resolution=1024, msaa=1, samples=16, maxSize=64) {
    super(renderer);

    this.maxSize = maxSize / 2;
    this.resolution = resolution;
    this.padding = maxSize + 4;
    this.samples = samples;
    this.target = renderer.cache(`vsm_target_${resolution}_${msaa}`, () => (
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
        clearColor: [1.0, 1.0, 1.0, 1.0],
      })
    ));
    this.textureTarget = renderer.cache(`savsm_color_${resolution}`, () => (
      new renderer.RenderTarget(resolution, resolution, {
        color: {
          format: WebGL.RG32F,
          filter: WebGL.NEAREST,
          wrap: WebGL.CLAMP_TO_EDGE,
        }
      })
    ));

    this.sumTarget = renderer.cache(`savsm_sum_${resolution}`, () => (
      new renderer.MultiTarget(resolution, resolution, {
        color: {
          format: WebGL.RG32UI,
          filter: WebGL.NEAREST,
          wrap: WebGL.CLAMP_TO_EDGE,
          clear: new Uint32Array([0, 0, 0, 0]),
        }
      }, {
        depthTest: false,
        depthMask: false,
        blend: false,
      })
    ));
    this.intScale = (32768 / maxSize) * (32768 / maxSize);
    this.convert = renderer.cache(`savsm_filter_convert_${this.intScale}`, () => (
      new renderer.Filters.Local(`return uvec2(get(0, 0).xy * ${this.intScale}.0)`, "uvec2")
    ));

    this.filters = [];
    for (let size = 1; size < resolution; size <<= 1) {
      this.filters.push(renderer.cache(`savsm_filter_${size}`, () => (
        new renderer.Filters.Global(dedent`
          uvec2 result = get(x, y).xy;
          if ((x & ${size}) != 0) {
            result += get((x - ${size}) | ${size - 1}, y).xy;
            if ((y & ${size}) != 0) {
              result += get((x - ${size}) | ${size - 1}, (y - ${size}) | ${size - 1}).xy;
            }
          }
          if ((y & ${size}) != 0) {
            result += get(x, (y - ${size}) | ${size - 1}).xy;
          }
          return result;
        `, "uvec2", "usampler2D")
      )));
    }

    this.minFilters = [];
    for (let i = 1; i <= 4; ++i) {
      const size = resolution >> i;
      this.minFilters.push(renderer.cache(`savsm_min_${size}`, () => ({
        filter: new renderer.Filters.Local("return min(min(get(0, 0), get(0, 1)), min(get(1, 0), get(1, 1)))"),
        target: new renderer.RenderTarget(size, size, {
          color: {
            format: WebGL.R32F,
            filter: WebGL.NEAREST,
            wrap: WebGL.CLAMP_TO_EDGE,
          }
        })
      })));
    }
  }

  renderMap(camera, light, objects) {
    objects = light.prepareShadow(camera, objects, {
      zNear: camera.near,
      zFar: camera.far,
      resolution: this.resolution,
      padding: this.padding,
    });
    if (!objects.length) {
      return null;
    }

    this.target.bind();
    this.target.clear();
    const shader = this.getShadowmapShader(light);
    shader.uniforms("LightUniform", light);
    objects.forEach(obj => {
      if (obj.transform) {
        mat4.multiply(tmpm, camera.view, obj.transform);
        shader.mat4("uModelView", tmpm);
      } else {
        shader.mat4("uModelView", camera.view);
      }
      shader.render(obj.mesh);
    });
    this.target.unbind();

    this.textureTarget.bind();
    this.textureTarget.blit(this.target, WebGL.COLOR_BUFFER_BIT);
    this.textureTarget.unbind();
    let raw = this.textureTarget.color;

    let sat = this.convert.apply(raw, this.sumTarget).color;
    sat = this.filters.reduce((texture, filter) => filter.apply(texture, this.sumTarget).color, sat);
    //raw = this.minFilters.reduce((texture, {filter, target}) => filter.apply(texture, target).color, raw);
    return [sat, raw];
  }
}
