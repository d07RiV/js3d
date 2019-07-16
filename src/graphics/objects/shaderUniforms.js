import * as WebGL from '../constants';

const $pending = Symbol("pending");

function plainType(func, initial) {
  return (context, location, name) => {
    const {pending, gl} = context;
    let holder = initial;
    function updater() {
      gl[func](location, holder);
    }
    return {
      enumerable: true,
      get: function() {
        return holder;
      },
      set: function(value) {
        pending.set(name, updater);
        holder = value;
      },
    };
  };
}
function arrayType(func, view, size) {
  return (context, location, name, count=1) => {
    const {pending, gl} = context;
    const holder = new view(size * count);
    function updater() {
      gl[func](location, holder);
    }
    return {
      enumerable: true,
      get: function() {
        pending.set(name, updater);
        return holder;
      },
      set: function(value) {
        pending.set(name, updater);
        holder.set(value);
      },
    };
  };
}

const samplerType = (context, location, name) => {
  const pending = context.pending;
  const slot = context.samplers++;
  context.gl.uniform1i(location, )
  let holder = initial;
  return {
    descriptor: {
      enumerable: true,
      get: function() {
        return holder;
      },
      set: function(value) {
        pending.add(name);
        holder = value;
      },
    },
    updater: function(gl) {
      gl[func](gl, location, holder);
    },
  };
};

const UniformTypes = {
  [WebGL.FLOAT]: plainType("uniform1f", 0.0),
  [WebGL.INT]: plainType("uniform1i", 0),
  [WebGL.BOOL]: plainType("uniform1i", false),
  [WebGL.UNSIGNED_INT]: plainType("uniform1u", 0),
  [WebGL.]
};

export default class ShaderUniforms {
  constructor(gl, program) {
    this[$pending] = new Set();

    const context = {
      pending: this[$pending],
    }

    // Loop over regular uniforms
    const numUniforms = gl.getProgramParameter(program, WebGL.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; ++i) {
      const info = gl.getActiveUniform(program, i);
      const location = gl.getUniformLocation(program, info.name);
      // Memeber of a uniform block will not have a location
      if (!location || !UniformTypes[info.type]) {
        continue;
      }
      let target = this;
      // Process structs
      const parts = info.name.split(".");
      const field = parts.pop();
      parts.forEach(part => {
        const [, name, index] = part.match(/^(\w+)\[(\d+)\]$/) || [];
        if (name) {
          // Array of structs
          target = (target[name] = target[name] || []);
          target = (target[index] = target[index] || {});
        } else {
          target = (target[part] = target[part] || {});
        }
      });
      // Now process the field itself
      const [, name, index] = field.match(/^(\w+)\[(\d+)\]$/) || ["", field];
      
      if (location && UniformTypes[info.type]) {
        f
      }
    }
  }
}
