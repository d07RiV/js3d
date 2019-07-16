import dedent from 'dedent';

import { vec3, mat4, AABB } from 'math';
import Light from './light';

const tmp1 = vec3.create(), tmp2 = vec3.create(), tmp3 = vec3.create();
const fPoints = [
  vec3.create(), vec3.create(), vec3.create(), vec3.create(),
  vec3.create(), vec3.create(), vec3.create(), vec3.create()
];
const tmpm = mat4.create();
const tbox = AABB.create(), obox = AABB.create(), cbox = AABB.create();

export default class SpotLight extends Light(
  ["vec3", "color"],
  ["vec3", "position"],
  ["vec3", "direction"],
  ["vec2", "minSize"], // (radius, tan)
  ["vec2", "maxSize"], // (radius, tan)
  ["mat4", "shadowmap"],
  ["vec4", "penumbra"],
) {
  static type = "SpotLight";
  // bool getLightInfo(in vec4 pos, out LightInfo info)
  static shaderFunc = dedent`{
    info.shadow = u_Light.shadowmap * pos;
    vec2 xy = info.shadow.xy / info.shadow.w;
    vec3 dir = pos.xyz - u_Light.position;
    info.distance = dot(u_Light.direction, dir);
    float rDistance = length(dir);
    vec2 atten = 1.0 - smoothstep(u_Light.minSize, u_Light.maxSize, vec2(rDistance, length(xy)));
    if (info.distance < 0.0) {
      info.color = vec3(0.0);
    } else {
      info.color = u_Light.color * (atten.x * atten.y);
    }
    info.direction = dir / rDistance;
    info.penumbra = u_Light.penumbra;
    return true;
  }`;

  view = mat4.create();

  constructor(renderer, worldMatrix, color=[1, 1, 1]) {
    super(renderer);

    this.world = worldMatrix;

    vec3.copy(this.color, color);
    this.minAngle = 60;
    this.maxAngle = 90;
    this.minRadius = Infinity;
    this.maxRadius = Infinity;
    this.lightSize = 0.5;
  }

  prepare(camera, list, params) {
    const minAngle = this.minAngle * Math.PI / 180.0;
    const maxAngle = this.maxAngle * Math.PI / 180.0;

    vec3.normalize(this.direction, this.world.slice(8, 11));
    vec3.negate(this.direction, this.direction);
    vec3.copy(this.position, this.world.slice(12, 15));
    mat4.invert(this.view, this.world);

    let maxTan = Math.tan(maxAngle / 2) * params.resolution / (params.resolution - params.padding - 2);
    let angSize = Math.atan(maxTan) * 2;
    const transform = this.shadowmap;
    mat4.perspective(transform, angSize, 1.0, this.lightSize, this.maxRadius);

    const minSize = this.minSize, maxSize = this.maxSize;
    minSize[0] = (this.minRadius == Infinity ? 1000000 : this.minRadius);
    minSize[1] = Math.tan(minAngle / 2) / maxTan;
    maxSize[0] = (this.maxRadius == Infinity ? 2000000 : this.maxRadius);
    maxSize[1] = Math.tan(maxAngle / 2) / maxTan;

    const penumbra = this.penumbra;
    penumbra[0] = this.lightSize;
    penumbra[1] = 0.0;
    penumbra[2] = -2.0 * transform[11] / (transform[0] * params.resolution);
    penumbra[3] = 0.0;

    mat4.multiply(transform, transform, this.view);

    return list;
  }
};
