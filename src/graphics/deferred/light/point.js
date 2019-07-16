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

const sideMats = [
  mat4.fromRows(vec3.negY, vec3.posZ, vec3.negX),
  mat4.fromRows(vec3.posY, vec3.posZ, vec3.posX),
  mat4.fromRows(vec3.posX, vec3.posZ, vec3.negY),
  mat4.fromRows(vec3.negX, vec3.posZ, vec3.posY),
  mat4.fromRows(vec3.posX, vec3.negY, vec3.negZ),
  mat4.fromRows(vec3.posX, vec3.posY, vec3.posZ),
];

export default class PointLight extends Light(
  ["vec3", "color"],
  ["vec3", "position"],
  ["vec2", "radius"], // min,max
  ["mat4", "view"],
  ["mat4", "shadowmap", 6],
  ["vec4", "penumbra"],
) {
  static type = "PointLight";
  static arraySize = 6;
  static providesDerivatives = true;

  // bool getLightInfo(in vec4 pos, out LightInfo info)
  static shaderFunc = dedent`{
    vec4 local = u_Light.view * pos;
  #ifdef RENDER_SHADOWMAP
    info.shadow = u_Light.shadowmap[u_ShadowMapIndex] * local;
    info.shadowLayer = u_ShadowMapIndex;
    info.distance = -info.shadow.w;
  #elif NEEDS_DERIVATIVES
    vec4 localAbs = abs(local);
    int layerX = int(1.5 - step(0.0, local.x));
    int layerY = 2 + int(1.5 - step(0.0, local.y));
    int layerZ = 4 + int(1.5 - step(0.0, local.z));
    vec4 posX = u_Light.shadowmap[layerX] * local;
    vec4 posY = u_Light.shadowmap[layerY] * local;
    vec4 posZ = u_Light.shadowmap[layerZ] * local;
    posX = (posX / posX.w) * 0.5 + 0.5;
    posY = (posY / posY.w) * 0.5 + 0.5;
    posZ = (posZ / posZ.w) * 0.5 + 0.5;
    vec3 dXdx = dFdx(posX.xyz), dXdy = dFdy(posX.xyz);
    vec3 dYdx = dFdx(posY.xyz), dYdy = dFdy(posY.xyz);
    vec3 dZdx = dFdx(posZ.xyz), dZdy = dFdy(posZ.xyz);
    if (localAbs.x > localAbs.y && localAbs.x > localAbs.z) {
      info.shadowLayer = layerX;
      info.shadowDx = dXdx;
      info.shadowDy = dXdy;
      info.distance = localAbs.x;
    } else if (localAbs.y > localAbs.z) {
      info.shadowLayer = layerY;
      info.shadowDx = dYdx;
      info.shadowDy = dYdy;
      info.distance = localAbs.y;
    } else {
      info.shadowLayer = layerZ;
      info.shadowDx = dZdx;
      info.shadowDy = dZdy;
      info.distance = localAbs.z;
    }
    info.shadow = u_Light.shadowmap[info.shadowLayer] * local;
  #else
    vec4 localAbs = abs(local);
    int index;
    if (localAbs.x > localAbs.y && localAbs.x > localAbs.z) {
      index = (local.x > 0.0 ? 0 : 1);
      info.distance = localAbs.x;
    } else if (localAbs.y > localAbs.z) {
      index = (local.y > 0.0 ? 2 : 3);
      info.distance = localAbs.y;
    } else {
      index = (local.z > 0.0 ? 4 : 5);
      info.distance = localAbs.z;
    }
    info.shadow = u_Light.shadowmap[index] * local;
    info.shadowLayer = index;
  #endif
    vec3 dir = pos.xyz - u_Light.position;
    float rDistance = length(dir);
    info.color = u_Light.color * (1.0 - smoothstep(u_Light.radius.x, u_Light.radius.y, rDistance));
    info.direction = dir / rDistance;
    info.penumbra = u_Light.penumbra;
    return true;
  }`;

  constructor(renderer, worldMatrix, color=[1, 1, 1]) {
    super(renderer);

    this.world = worldMatrix;

    vec3.copy(this.color, color);
    this.minRadius = Infinity;
    this.maxRadius = Infinity;
    this.lightSize = 0.5;
  }

  prepare(camera, list, params) {
    vec3.copy(this.position, this.world.slice(12, 15));
    mat4.invert(this.view, this.world);

    let maxTan = params.resolution / (params.resolution - params.padding - 2);
    let angSize = Math.atan(maxTan) * 2;
    const transform = this.shadowmap;
    mat4.perspective(tmpm, angSize, 1.0, this.lightSize, this.maxRadius);
    for (let i = 0; i < 6; ++i) {
      const sub = transform.subarray(i * 16, i * 16 + 16);
      mat4.multiply(sub, tmpm, sideMats[i]);
    }

    const radius = this.radius;
    radius[0] = (this.minRadius == Infinity ? 1000000 : this.minRadius);
    radius[1] = (this.maxRadius == Infinity ? 2000000 : this.maxRadius);

    const penumbra = this.penumbra;
    penumbra[0] = this.lightSize;
    penumbra[1] = 0.0;
    penumbra[2] = -2.0 * tmpm[11] / (tmpm[0] * params.resolution);
    penumbra[3] = 0.0;

    //mat4.multiply(transform, transform, this.view);

    return list;
  }
};
