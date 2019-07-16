import Shader from '../objects/shader';

import sourceVert from './geometry.vert';

export default class GeometryShader extends Shader {
  constructor(renderer, attributes, fragment, options={}) {
    let { defines={}, filter, fragments={}, ...otherOptions } = options;
    defines = {...defines};
    attributes.forEach((attr, index) => {
      if (!filter || filter(attr)) {
        defines[`ATTRIBUTE_${attr}`] = index;
      }
    });
    fragments = {...fragments};
    if (!fragments.declarations) {
      fragments.declarations = 'uniform mat4 u_ViewProjectionMatrix;';
    }
    if (!fragments.output_func) {
      fragments.output_func = 'gl_Position = u_ViewProjectionMatrix * posW;';
    }
    super(renderer, sourceVert, fragment, {defines, fragments, ...otherOptions});
  }
}
