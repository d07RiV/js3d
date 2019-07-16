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

export default class DirectionalLight extends Light(
  ["mat4", "shadowmap"],
  ["vec3", "direction"],
  ["vec3", "color"],
  ["float", "iangle"],
  ["float", "scale"],
) {
  static type = "DirectionalLight";
  // bool getLightInfo(in vec4 pos, out LightInfo info)
  static shaderFunc = dedent`{
    info.shadow = u_Light.shadowmap * pos;
    info.distance = info.shadow.z * 0.5 + 0.5;
    info.color = u_Light.color;
    info.direction = u_Light.direction;
    info.penumbra = vec4(0.0, u_Light.iangle, 0.0, u_Light.scale);
    return true;
  }`;

  view = mat4.create();

  constructor(renderer, matrix, color=[1, 1, 1]) {
    super(renderer);

    this.world = matrix;

    vec3.copy(this.color, color);
    this.angularSize = 4.0;
  }

  get angularSize() {
    return 360.0 / this.iangle / Math.PI;
  }
  set angularSize(val) {
    this.iangle = 360.0 / (Math.PI * val);
  }

  prepare(camera, list, params) {
    mat4.invert(this.view, this.world);
    vec3.normalize(this.direction, this.world.slice(8, 11));
    vec3.negate(this.direction, this.direction);

    camera.getCorners(fPoints, params.zNear);
    camera.getCorners(fPoints.slice(4), params.zFar == Infinity ? 100 : params.zFar);
    let diag = 0.0;
    for (let i = 0; i < fPoints.length; ++i) {
      vec3.transformMat4(fPoints[i], fPoints[i], this.view);
      if (i) {
        AABB.combineVec3(cbox, cbox, fPoints[i]);
      } else {
        AABB.setVec3(cbox, fPoints[i]);
      }
      for (let j = 0; j < i; ++j) {
        diag = Math.max(diag, vec3.distance(fPoints[i], fPoints[j]));
      }
    }

    let empty = true;
    list = list.filter(({matrix, primitive}) => {
      mat4.fromAABB(tmpm, primitive.box);
      mat4.multiply(tmpm, matrix, tmpm);
      mat4.multiply(tmpm, this.view, tmpm);
      AABB.fromMat4(obox, tmpm);
      if (cbox[0] < obox[3] && cbox[1] < obox[4] && cbox[3] > obox[0] && cbox[4] > obox[1]) {
        if (empty) {
          AABB.copy(tbox, obox);
          empty = false;
        } else {
          AABB.combine(tbox, tbox, obox);
        }
        return true;
      }
      return false;
    });

    // for any given light/frustum, we expect this to be constant
    const scale = diag / (params.resolution - params.padding - 2);
    const x0 = Math.floor(((tbox[0] + tbox[3]) / scale - params.resolution) / 2);
    const y0 = Math.floor(((tbox[1] + tbox[4]) / scale - params.resolution) / 2);
    tbox[0] = x0 * scale;
    tbox[1] = y0 * scale;
    tbox[3] = (x0 + params.resolution) * scale;
    tbox[4] = (y0 + params.resolution) * scale;

    const transform = this.shadowmap;
    mat4.ortho(transform, tbox[0], tbox[3], tbox[1], tbox[4], -tbox[5], -tbox[2]);
    mat4.multiply(transform, transform, this.view);

    this.scale = scale / (tbox[5] - tbox[2]);
    
    return list;
  }
};
