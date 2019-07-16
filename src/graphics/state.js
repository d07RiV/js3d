import * as WebGL from './constants';

const $gl = Symbol("gl");

function _flag(param) {
  return {
    get: function() {
      return this[$gl].isEnabled(param);
    },
    set: function(flag) {
      if (flag) {
        this[$gl].enable(param);
      } else {
        this[$gl].disable(param);
      }
    }
  };
}
function _value(param, func) {
  return {
    get: function() {
      return this[$gl].getParameter(param);
    },
    set: function(value) {
      this[$gl][func](value);
    }
  };
}
function _array(param, func) {
  return {
    get: function() {
      return this[$gl].getParameter(param);
    },
    set: function(values) {
      this[$gl][func](...values);
    }
  };
}
function _array2(params, func) {
  return {
    get: function() {
      return params.map(p => this[$gl].getParameter(p));
    },
    set: function(values) {
      this[$gl][func](...values);
    }
  };
}
function _array_or_value(params, func, funca) {
  return {
    get: function() {
      return params.map(p => this[$gl].getParameter(p));
    },
    set: function(value) {
      if (Array.isArray(value)) {
        this[$gl][funca](...value);
      } else {
        this[$gl][func](value);
      }
    }
  };
}
function _pixel(param) {
  return {
    get: function() {
      return this[$gl].getParameter(param);
    },
    set: function(value) {
      this[$gl].pixelStorei(param, value);
    }
  };
}

const params = {
  blend: _flag(WebGL.BLEND),
  blendColor: _array(WebGL.BLEND_COLOR, "blendColor"),
  blendEquation: _array_or_value([WebGL.BLEND_EQUATION_RGB, WebGL.BLEND_EQUATION_ALPHA], "blendEquation", "blendEquationSeparate"),
  blendFunc: {
    get: function() {
      return [
        this[$gl].getParameter(WebGL.BLEND_SRC_RGB),
        this[$gl].getParameter(WebGL.BLEND_SRC_ALPHA),
        this[$gl].getParameter(WebGL.BLEND_DST_RGB),
        this[$gl].getParameter(WebGL.BLEND_DST_ALPHA)
      ];
    },
    set: function(values) {
      if (values.length === 2) {
        this[$gl].blendFunc(values[0], values[1]);
      } else {
        this[$gl].blendFuncSeparate(...values);
      }
    },
  },
  clearColor: _array(WebGL.COLOR_CLEAR_VALUE, "clearColor"),
  colorMask: _array(WebGL.COLOR_WRITEMASK, "colorMask"),
  cull: _flag(WebGL.CULL_FACE),
  cullFace: _value(WebGL.CULL_FACE_MODE, "cullFace"),
  clearDepth: _value(WebGL.DEPTH_CLEAR_VALUE, "clearDepth"),
  depthFunc: _value(WebGL.DEPTH_FUNC, "depthFunc"),
  depthRange: _array(WebGL.DEPTH_RANGE, "depthRange"),
  depthMask: _value(WebGL.DEPTH_WRITEMASK, "depthMask"),
  depthTest: _flag(WebGL.DEPTH_TEST),
  dither: _flag(WebGL.DITHER),
  frontFace: _value(WebGL.FRONT_FACE, "frontFace"),
  mipmapHint: {
    get: function() {
      return this[$gl].getParameter(WebGL.GENERATE_MIPMAP_HINT);
    },
    set: function(value) {
      this[$gl].hint(WebGL.GENERATE_MIPMAP_HINT, value);
    },
  },
  lineWidth: _value(WebGL.LINE_WIDTH, "lineWidth"),
  packAlignment: _pixel(WebGL.PACK_ALIGNMENT),
  polygonOffset: _array2([WebGL.POLYGON_OFFSET_FACTOR, WebGL.POLYGON_OFFSET_UNITS], "polygonOffset"),
  polygonOffsetFill: _flag(WebGL.POLYGON_OFFSET_FILL),
  sampleCoverage: _array2([WebGL.SAMPLE_COVERAGE_VALUE, WebGL.SAMPLE_COVERAGE_INVERT], "sampleCoverage"),
  scissorBox: _array(WebGL.SCISSOR_BOX, "scissor"),
  scissorTest: _flag(WebGL.SCISSOR_TEST),
  clearStencil: _value(WebGL.STENCIL_CLEAR_VALUE, "clearStencil"),
  stencilTest: _flag(WebGL.STENCIL_TEST),
  stencilFunc: _array2([WebGL.STENCIL_FUNC, WebGL.STENCIL_REF, WebGL.STENCIL_VALUE_MASK], "stencilFunc"),
  stencilFrontFunc: {
    get: function() {
      return [
        this[$gl].getParameter(WebGL.STENCIL_FUNC),
        this[$gl].getParameter(WebGL.STENCIL_REF),
        this[$gl].getParameter(WebGL.STENCIL_VALUE_MASK)
      ];
    },
    get: function(values) {
      this[$gl].stencilFuncSeparate(WebGL.FRONT, ...values);
    },
  },
  stencilBackFunc: {
    get: function() {
      return [
        this[$gl].getParameter(WebGL.STENCIL_BACK_FUNC),
        this[$gl].getParameter(WebGL.STENCIL_BACK_REF),
        this[$gl].getParameter(WebGL.STENCIL_BACK_VALUE_MASK)
      ];
    },
    get: function(values) {
      this[$gl].stencilFuncSeparate(WebGL.BACK, ...values);
    },
  },
  stencilMask: _value(WebGL.STENCIL_WRITEMASK, "stencilMask"),
  stencilFrontMask: {
    get: function() {
      return this[$gl].getParameter(WebGL.STENCIL_WRITEMASK);
    },
    set: function(value) {
      this[$gl].stencilMaskSeparate(WebGL.FRONT, value);
    },
  },
  stencilBackMask: {
    get: function() {
      return this[$gl].getParameter(WebGL.STENCIL_BACK_WRITEMASK);
    },
    set: function(value) {
      this[$gl].stencilMaskSeparate(WebGL.BACK, value);
    },
  },
  stencilOp: _array2([WebGL.STENCIL_FAIL, WebGL.STENCIL_PASS_DEPTH_FAIL, WebGL.STENCIL_PASS_DEPTH_PASS], "stencilOp"),
  stencilFrontOp: {
    get: function() {
      return [
        this[$gl].getParameter(WebGL.STENCIL_FAIL),
        this[$gl].getParameter(WebGL.STENCIL_PASS_DEPTH_FAIL),
        this[$gl].getParameter(WebGL.STENCIL_PASS_DEPTH_PASS)
      ];
    },
    get: function(values) {
      this[$gl].stencilOpSeparate(WebGL.FRONT, ...values);
    },
  },
  stencilBackOp: {
    get: function() {
      return [
        this[$gl].getParameter(WebGL.STENCIL_BACK_FAIL),
        this[$gl].getParameter(WebGL.STENCIL_BACK_PASS_DEPTH_FAIL),
        this[$gl].getParameter(WebGL.STENCIL_BACK_PASS_DEPTH_PASS)
      ];
    },
    get: function(values) {
      this[$gl].stencilOpSeparate(WebGL.BACK, ...values);
    },
  },
  unpackAlignment: _pixel(WebGL.UNPACK_ALIGNMENT),
  unpackColorspaceConversion: _pixel(WebGL.UNPACK_COLORSPACE_CONVERSION_WEBGL),
  unpackFlipY: _pixel(WebGL.UNPACK_FLIP_Y_WEBGL),
  unpackPremultiplyAlpha: _pixel(WebGL.UNPACK_PREMULTIPLY_ALPHA_WEBGL),
  viewport: _array(WebGL.VIEWPORT, "viewport"),

  fragmentShaderDerivativeHint: {
    get: function() {
      return this[$gl].getParameter(WebGL.FRAGMENT_SHADER_DERIVATIVE_HINT);
    },
    set: function(value) {
      this[$gl].hint(WebGL.FRAGMENT_SHADER_DERIVATIVE_HINT, value);
    },
  },
  packRowLength: _pixel(WebGL.PACK_ROW_LENGTH),
  packSkipPixels: _pixel(WebGL.PACK_SKIP_PIXELS),
  packSkipRows: _pixel(WebGL.PACK_SKIP_ROWS),
  unpackRowLength: _pixel(WebGL.PACK_ROW_LENGTH),
  packRowLength: _pixel(WebGL.UNPACK_ROW_LENGTH),
  unpackImageHeight: _pixel(WebGL.UNPACK_IMAGE_HEIGHT),
  unpackSkipPixels: _pixel(WebGL.UNPACK_SKIP_PIXELS),
  unpackSkipRows: _pixel(WebGL.UNPACK_SKIP_ROWS),
  unpackSkipImages: _pixel(WebGL.UNPACK_SKIP_IMAGES),
  rasterizerDiscard: _flag(WebGL.RASTERIZER_DISCARD),
  sampleCoverageEnable: _flag(WebGL.SAMPLE_COVERAGE),
  sampleAlphaToCoverage: _flag(WebGL.SAMPLE_ALPHA_TO_COVERAGE),
};

export default function WebGLState(gl) {
  this[$gl] = gl;
  Object.preventExtensions(this);
}
Object.defineProperties(WebGLState.prototype, params);
