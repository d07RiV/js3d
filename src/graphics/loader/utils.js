import * as WebGL from '../constants';

const readBlob = (blob, type) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  function complete() {
    if (reader.result) {
      resolve(reader.result);
    } else {
      reject(reader.error);
    }
    reader.removeEventListener("load", complete);
    reader.removeEventListener("error", complete);
  }
  reader.addEventListener("load", complete);
  reader.addEventListener("error", complete);
  reader[type](blob);
});

const loadImageFromUrl = url => new Promise((resolve, reject) => {
  const image = new Image();
  image.src = url;
  if (image.naturalWidth) {
    resolve(image);
  } else if (image.complete) {
    reject(image);
  } else {
    function complete() {
      if (image.naturalWidth) {
        resolve(image);
      } else {
        reject(image);
      }
      image.removeEventListener("load", complete);
      image.removeEventListener("error", complete);
    }
    image.addEventListener("load", complete);
    image.addEventListener("error", complete);
  }
});

export function blobToArray(blob) {
  return readBlob(blob, "readAsArrayBuffer");
}
export function blobToText(blob) {
  return readBlob(blob, "readAsText");
}
export function blobToJson(blob) {
  return blobToText(blob).then(text => JSON.parse(text));
}

export function blobToImage(blob) {
  const url = URL.createObjectURL(blob);
  return loadImageFromUrl(url).finally(() => URL.revokeObjectURL(url));
}

/**
 * Decorator function for GLTF loader.
 * Uses legacy decorator spec - needs babel-plugin-transform-decorators-legacy
 * @param {string} name glTF array name
 */
export function transform(name) {
  return function(target, property, descriptor) {
    const key = Symbol("__cache_" + property);
    if (typeof descriptor.value !== "function") {
      throw new Error("only functions can be cached");
    }
    return {
      ...descriptor,
      value(index) {
        let map = this[key];
        if (!map) {
          map = this[key] = new Map();
        }

        if (map.has(index)) {
          const result = map.get(index);
          if (result === key) {
            return Promise.reject(new Error(`encountered a loop while accessing ${property}(${index})`));
          }
          return result;
        }

        const info = this.data[name][index];
        if (!info) {
          const result = Promise.reject(new Error(`invalid ${name} index ${index}`));
          map.set(index, result);
          return result;
        }

        map.set(index, key);
        const result = descriptor.value.call(this, info, index);
        map.set(index, result);
        return result;
      }
    };
  };
}

/**
 * Returns typed array constructor for given GL type
 * @param {int} componentType GL type
 */
export function componentArray(componentType) {
  switch (componentType) {
  case WebGL.BYTE:
    return Int8Array;
  case WebGL.UNSIGNED_BYTE:
    return Uint8Array;
  case WebGL.SHORT:
    return Int16Array;
  case WebGL.UNSIGNED_SHORT:
    return Uint16Array;
  case WebGL.UNSIGNED_INT:
    return Uint32Array;
  case WebGL.FLOAT:
    return Float32Array;
  default:
    throw new Error(`invalid component type ${componentType}`);
  }
}

/**
 * Calculates number of (padded) components for given accessor type and element size
 * @param {string} type accessor type
 * @param {int size element size in bytes
 */
export function componentCount(type, size) {
  switch (type) {
  case "SCALAR":
    return 1;
  case "VEC2":
    return Math.ceil(size * 2 / 4) * 4 / size;
  case "VEC3":
    return Math.ceil(size * 3 / 4) * 4 / size;
  case "VEC4":
    return 4;
  case "MAT2":
    return Math.ceil(size * 2 / 4) * 4 / size * 2;
  case "MAT3":
    return Math.ceil(size * 3 / 4) * 4 / size * 3;
  case "MAT4":
    return 16;
  default:
    throw new Error(`invalid attribute type ${type}`);
  }
}

export function vertexComponentCount(type) {
  switch (type) {
  case "SCALAR":
    return 1;
  case "VEC2":
    return 2;
  case "VEC3":
    return 3;
  case "VEC4":
    return 4;
  default:
    throw new Error(`invalid vertex attribute type ${type}`);
  }
}
