import { vec3, vec4 } from 'math';

import { blobToJson, blobToArray, transform, componentArray, componentCount, vertexComponentCount, blobToImage } from './utils';
import * as WebGL from '../constants';
import Mesh from '../mesh';
import RenderNode from '../renderNode';
import Camera from '../camera';

export default class GLTFLoader {
  constructor(renderer, url) {
    this.renderer = renderer;
    this.base = new URL(url, document.location).href;
  }

  async fetch(uri) {
    const response = await fetch(new URL(uri, this.base).href);
    if (response.ok) {
      return response.blob();
    } else {
      throw new Error(response.statusText);
    }
  }

  /**
   * Returns Promise that resolves to scene object
   */
  async load() {
    const blob = await this.fetch(this.base);
    if (blob.type === "model/gltf+json") {
      return this.loadJson(await blobToJson(blob));
    } else if (blob.type === "model/gltf-binary") {
      return this.loadBinary(await blobToArray(blob));
    } else {
      const binary = await blobToArray(blob);
      if (this.isBinary(binary)) {
        return this.loadBinary(binary);
      } else {
        const decoder = new TextDecoder();
        const text = decoder.decode(binary);
        const json = JSON.parse(text);
        return this.loadJson(json);
      }
    }
  }

  isBinary(array) {
    const view = new DataView(array);
    return view.getUint32(0, true) === 0x46546C67;
  }

  async loadBinary(array) {
    const view = new DataView(array);
    if (view.getUint32(0, true) !== 0x46546C67) {
      throw new Error("GLTFParser: invalid binary signature");
    }
    if (view.getUint32(4, true) > 2) {
      throw new Error("GLTFParser: unsupported format version");
    }
    if (view.getUint32(8, true) !== array.byteLength || array.byteLength < 20) {
      throw new Error("GLTFParser: invalid length");
    }

    const jsonLength = view.getUint32(12, true);
    if (view.getUint32(16, true) !== 0x4E4F534A) {
      throw new Error("GLTFParser: missing JSON chunk");
    }
    if (20 + jsonLength > array.byteLength) {
      throw new Error("GLTFParser: invalid JSON length");
    }

    const decoder = new TextDecoder();
    const text = decoder.decode(new Uint8Array(array, 20, jsonLength));
    const json = JSON.parse(text);

    const bufferPos = 20 + jsonLength;
    if (bufferPos + 8 <= array.byteLength) {
      const bufferLength = view.getUint32(bufferPos, true);
      if (view.getUint32(bufferPos + 4, true) !== 0x004E4942) {
        throw new Error("GLTFParser: invalid chunk signature");
      }
      if (bufferPos + 8 + bufferLength > array.byteLength) {
        throw new Error("GLTFParser: invalid buffer length");
      }
      this.binaryBuffer = array.slice(bufferPos + 8, bufferPos + 8 + bufferLength);
    }

    return this.loadJson(json);
  }

  async loadJson(data) {
    this.data = data;

    const [scenes, animations] = await Promise.all([
      data.scenes && Promise.all(data.scenes.map((scene, index) => this.scene(index))),
      data.animations && Promise.all(data.animations.map((animation, index) => this.animation(index))),
    ]);
    return {
      scenes,
      animations,
      scene: data.scene,
      asset: data.asset,
    };
  }

  /**
   * Returns ArrayBuffer for a given `buffer`
   * @param {int} index buffer index
   */
  @transform("buffers")
  async buffer({byteLength, uri}, index) {
    let buffer;
    if (!uri) {
      if (index === 0 && this.binaryBuffer) {
        buffer = this.binaryBuffer;
      } else {
        throw new Error(`buffer ${index} missing uri property`);
      }
    } else {
      buffer = await blobToArray(await this.fetch(uri));
    }
    if (buffer.byteLength < byteLength) {
      throw new Error(`insufficient length for buffer ${index}`);
    }
    return buffer;
  }

  /**
   * Returns Uint8Array for a given `bufferView`
   * @param {int} index bufferView index
   */
  @transform("bufferViews")
  async bufferView({buffer: bufferIndex, byteOffset=0, byteLength}, index) {
    const buffer = await this.buffer(bufferIndex);
    // We compare to original buffer's length, because the ArrayBuffer is sometimes longer than indended (due to padding)
    if (byteOffset + byteLength > this.data.buffers[bufferIndex].byteLength) {
      throw new Error(`bufferView ${index} out of bounds`);
    }
    return new Uint8Array(buffer, byteOffset, byteLength);
  }

  /**
   * Creates GL buffer for a given `bufferView`
   * @param {int} index bufferView index
   */
  @transform("bufferViews")
  async bufferViewGL({target=WebGL.ARRAY_BUFFER}, index) {
    const data = await this.bufferView(index);
    const gl = this.renderer.gl;
    const buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, WebGL.STATIC_DRAW);
    return buffer;
  }

  /**
   * Returns typed array for a given `accessor`. Do not use for vertex attributes!
   * @param {int} index accessor index
   */
  @transform("accessors")
  async accessor({bufferView, byteOffset=0, componentType, count, type, sparse}, index) {
    const [view, indexView, valueView] = await Promise.all([
      this.bufferView(bufferView),
      sparse && this.bufferView(sparse.indices.bufferView),
      sparse && this.bufferView(sparse.values.bufferView),
    ]);

    const ValueArray = componentArray(componentType);
    const compCount = componentCount(type, ValueArray.BYTES_PER_ELEMENT);
    let array;
    if (bufferView != null) {
      // Internally used for sparse vertex attributes to reduce code duplication, so we must support byteStride
      const bufferInfo = this.data.bufferViews[bufferView];
      const stride = bufferInfo.byteStride || (compCount * ValueArray.BYTES_PER_ELEMENT);
      if (byteOffset + stride * (count - 1) + compCount * ValueArray.BYTES_PER_ELEMENT > view.byteLength) {
        throw new Error(`insufficient buffer length for accessor ${index}`);
      }
      if (!sparse) {
        // But if it's not sparse, then don't handle byteStride since we need to return the original array
        if (bufferInfo.byteStride) {
          throw new Error(`byteStride can only be used for vertex attributes`);
        }
        return new ValueArray(view.buffer, view.byteOffset + byteOffset, compCount * count);
      }
      if (bufferInfo.byteStride) {
        // This is an annoying case. Wonder if the spec allows it?
        // It is promised that stride is a multiple of element size, so we can use typed arrays
        const source = new ValueArray(view.buffer, view.byteOffset + byteOffset);
        const sourceStride = stride / ValueArray.BYTES_PER_ELEMENT;
        array = new ValueArray(compCount * count * ValueArray.BYTES_PER_ELEMENT);
        for (let i = 0; i < count; ++i) {
          for (let j = 0; j < compCount; ++j) {
            array[i * compCount + j] = source[i * sourceStride + j];
          }
        }
      } else {
        // Just slice the original buffer. It has to be a new copy!
        const buffer = view.buffer.slice(view.byteOffset + byteOffset, compCount * count * ValueArray.BYTES_PER_ELEMENT);
        array = new ValueArray(buffer);
      }
    } else {
      // Create an array of zeros. If it's not sparse, then we'll just return it, I guess!
      array = new ValueArray(compCount * count);
    }

    if (sparse) {
      // Now populate indices from typed arrays
      const { componentType: indexType, byteOffset: indexOffset = 0 } = sparse.indices;
      const { byteOffset: valueOffset = 0 } = sparse.values;

      const IndexArray = componentArray[indexType];
      if (indexOffset + sparse.count * IndexArray.BYTES_PER_ELEMENT > indexView.byteLength) {
        throw new Error(`insufficient sparse index buffer length for accessor ${index}`);
      }
      const indices = new IndexArray(indexView.buffer, indexView.byteOffset + indexOffset, sparse.count);

      const valueInfo = this.data.bufferViews[sparse.values.bufferView];
      const valueStride = valueInfo.byteStride || (compCount * ValueArray.BYTES_PER_ELEMENT);
      if (valueOffset + valueStride * (sparse.count - 1) + compCount * ValueArray.BYTES_PER_ELEMENT > valueView.byteLength) {
        throw new Error(`insufficient sparse value buffer length for accessor ${index}`);
      }
      const values = new ValueArray(valueView.buffer, valueView.byteOffset + valueOffset);

      for (let i = 0; i < sparse.count; ++i) {
        const dst = indices[i] * compCount, src = indices[i] * valueStride / ValueArray.BYTES_PER_ELEMENT;
        for (let j = 0; j < compCount; ++j) {
          array[dst + j] = values[src + j];
        }
      }
    }

    return array;
  }

  /**
   * Returns a GL buffer for a given `accessor`. Internal structure depends on accessor fields
   * @param {int} index accessor index
   */
  @transform("accessors")
  async accessorGL({bufferView, sparse}, index) {
    const gl = this.renderer.gl;
    if (bufferView == null || sparse) {
      // Build raw array and use it as buffer
      const array = await this.accessor(index);
      const buffer = gl.createBuffer();
      gl.bindBuffer(WebGL.ARRAY_BUFFER, buffer);
      gl.bufferData(WebGL.ARRAY_BUFFER, array, WebGL.STATIC_DRAW);
      return buffer;
    } else {
      // Use the same buffer as bufferView - will need to reference the correct stride/offset
      return this.bufferViewGL(bufferView);
    }
  }

  /**
   * Returns vertex attribute descriptor
   * @param {int} index accessor index
   * @returns function that takes an integer parameter and sets up vertex attribs for that index
   */
  @transform("accessors")
  async accessorVertexAttrib({bufferView, byteOffset=0, componentType, normalized, type, sparse}, index) {
    const buffer = await this.accessorGL(index);
    let offset = 0, stride = 0;
    if (bufferView != null && !sparse) {
      // This is not our buffer, so we have to use the correct offset and stride
      // We use our byteOffset, because bufferView's byteOffset is already baked into the buffer
      stride = this.data.bufferViews[bufferView].byteStride || 0;
      offset = byteOffset;
    }
    return {
      buffer,
      size: vertexComponentCount(type),
      type: componentType,
      normalized,
      stride,
      offset,
    };
  }

  /**
   * Returns an Image object for a given `image`
   * @param {int} index image index
   */
  @transform("images")
  async image({uri, mimeType, bufferView}, index) {
    let blob = null;
    if (bufferView != null) {
      if (!mimeType) {
        throw new Error(`image ${index} is missing mimeType property`);
      }
      blob = new Blob([await this.bufferView(bufferView)], {type: mimeType});
    } else if (uri) {
      blob = await this.fetch(uri);
    } else {
      throw new Error(`image ${index} is missing uri and bufferView properties`)
    }
    return blobToImage(blob);
  }

  async textureSwitch({name, sampler, source}, format) {
    const image = await this.image(source);
    const texture = new this.renderer.Texture();
    texture.load(image, WebGL.RGBA, WebGL.UNSIGNED_BYTE, format);
    texture.generateMipmap();
    texture.name = name;
    if (sampler != null) {
      if (!this.data.samplers[sampler]) {
        throw new Error(`invalid sampler index ${sampler}`);
      }
      const { magFilter=WebGL.LINEAR, minFilter=WebGL.LINEAR, wrapS=WebGL.REPEAT, wrapT=WebGL.REPEAT } = this.data.samplers[sampler];
      texture.filter(magFilter, minFilter).wrap(wrapS, wrapT);
    }
    return texture;
  }

  /**
   * Returns a Texture object for a given `texture`
   * @param {int} index texture index
   */
  @transform("textures")
  texture(info) {
    return this.textureSwitch(info, WebGL.RGBA);
  }

  /**
   * Returns a Texture object for a given `texture` with SRGB color space
   * @param {int} index texture index
   */
  @transform("textures")
  textureSRGB(info) {
    return this.textureSwitch(info, WebGL.SRGB8_ALPHA8);
  }

  /**
   * Returns a Material object for a given `material`
   * @param {int} index material index
   */
  @transform("materials")
  async material(info) {
    const {
      name,
      pbrMetallicRoughness: {
        baseColorFactor = [1, 1, 1, 1],
        baseColorTexture,
        metallicFactor = 1,
        roughnessFactor = 1,
        metallicRoughnessTexture,
      } = {},
      normalTexture,
      occlusionTexture,
      emissiveTexture,
      emissiveFactor = [0, 0, 0],
      alphaMode="OPAQUE",
      alphaCutoff=0.5,
      doubleSided=false,
    } = info;

    // Fetch all textures in parallel
    const [
      texBaseColor,
      texMetallicRoughness,
      texNormal,
      texOcclusion,
      texEmissive,
    ] = await Promise.all([
      baseColorTexture && this.textureSRGB(baseColorTexture.index),
      metallicRoughnessTexture && this.texture(metallicRoughnessTexture.index),
      normalTexture && this.texture(normalTexture.index),
      occlusionTexture && this.texture(occlusionTexture.index),
      emissiveTexture && this.textureSRGB(emissiveTexture.index),
    ]);

    // Kinda repetitive, but oh well
    const material = new this.renderer.Material(name);
    vec4.copy(material.baseColorFactor, baseColorFactor);
    if (baseColorTexture) {
      material.baseColorTexture = {
        texture: texBaseColor,
        texCoord: baseColorTexture.texCoord || 0,
      };
    }
    material.metallicFactor = metallicFactor;
    material.roughnessFactor = roughnessFactor;
    if (metallicRoughnessTexture) {
      material.metallicRoughnessTexture = {
        texture: texMetallicRoughness,
        texCoord: metallicRoughnessTexture.texCoord || 0,
      };
    }
    if (normalTexture) {
      material.normalTexture = {
        texture: texNormal,
        texCoord: normalTexture.texCoord || 0,
        scale: normalTexture.scale || 1,
      };
    }
    if (occlusionTexture) {
      material.occlusionTexture = {
        texture: texOcclusion,
        texCoord: occlusionTexture.texCoord || 0,
        strength: occlusionTexture.strength || 1,
      };
    }
    if (emissiveTexture) {
      material.emissiveTexture = {
        texture: texEmissive,
        texCoord: emissiveTexture.texCoord || 0,
      };
    }
    vec3.copy(material.emissiveFactor, emissiveFactor);
    material.alphaMode = alphaMode;
    material.alphaCutoff = alphaCutoff;
    material.doubleSided = doubleSided;

    return material;
  }

  primitiveCache = {};
  primitive(attributes, indices) {
    const attrList = Object.keys(attributes).sort();
    let attribHash = attrList.map(attr => `${attr}=${attributes[attr]}`).join(",");
    if (indices != null) {
      if (!this.data.accessors[indices]) {
        return Promise.reject(new Error(`invalid accessor ${indices}`));
      }
      const {bufferView, sparse} = this.data.accessors[indices];
      if (sparse) {
        return Promise.reject(new Error(`sparse index buffers not supported`));
      }
      indices = bufferView;
      attribHash += `:${indices}`;
    }
    if (this.primitiveCache[attribHash]) {
      return this.primitiveCache[attribHash];
    }
    return this.primitiveCache[attribHash] = Promise.all([
      Promise.all(attrList.map(attr => this.accessorVertexAttrib(attributes[attr]))),
      indices != null && this.bufferViewGL(indices),
    ]).then(([vertexAttributes, indexBuffer]) => {
      const attrMap = {};
      attrList.forEach((attr, index) => attrMap[attr] = vertexAttributes[index]);
      return new this.renderer.VertexArray(attrMap, indexBuffer);
    });
  }

  /**
   * Returns a Mesh object for a given `mesh`
   * @param {int} index mesh index
   */
  @transform("meshes")
  async mesh({name, primitives, weights}) {
    const mesh = new Mesh(name, await Promise.all(primitives.map(async ({attributes, indices, material, mode=WebGL.TRIANGLES, targets}) => {
      const attrList = Object.keys(attributes);
      if (targets) {
        attributes = {...attributes};
        targets.forEach((target, i) => Object.keys(target).forEach(attr => {
          const name = `${attr}_${i+1}`;
          attributes[name] = target[attr];
          attrList.push(name);
        }));
      }
      const [
        materialObject,
        vertexArray,
      ] = await Promise.all([
        material != null && this.material(material),
        this.primitive(attributes, indices),
      ]);

      let { count: drawCount, min: boxMin, max: boxMax } = this.data.accessors[attributes.POSITION];
      if (indices != null) {
        const {count, componentType, byteOffset} = this.data.accessors[indices];
        indices = {
          offset: byteOffset,
          type: componentType,
        };
        drawCount = count;
      }

      const primitive = new this.renderer.Primitive(vertexArray, indices, drawCount, [...boxMin, ...boxMax]);
      if (materialObject) {
        primitive.material = materialObject;
      }
      primitive.mode = mode;
      return primitive;
    })));
    mesh.morphWeights = weights;
    return mesh;
  }

  /**
   * Returns a property object for a given `camera`
   * @param {int} index camera index
   */
  @transform("cameras")
  async camera({name, type, orthographic, perspective}) {
    if (type === "perspective") {
      return {name, type, ...perspective};
    } else if (type === "orthographic") {
      return {name, type, ...orthographic};
    } else {
      throw new Error(`invalid camera type ${type}`);
    }
  }

  /**
   * Returns a Skin object for a given `skin`
   * @param {int} index skin index
   */
  @transform("skins")
  async skin({}) {
    //TODO: support skins
    return null;
  }

  /**
   * Returns a RenderNode object for a given `node`
   * @param {int} index node index
   */
  @transform("nodes")
  async node(info) {
    let {
      camera,
      children=[],
      skin,
      matrix,
      mesh,
      rotation,
      scale,
      translation,
      weights,
      name,
    } = info;

    [mesh, camera, skin, children] = await Promise.all([
      mesh != null && this.mesh(mesh),
      camera != null && this.camera(camera),
      skin != null && this.skin(skin),
      Promise.all(children.map(child => this.node(child))),
    ]);

    const node = new RenderNode(name);
    node.children.push(...children);
    if (matrix) node.matrix = matrix;
    if (translation) node.translation = translation;
    if (rotation) node.rotation = rotation;
    if (scale) node.scale = scale;
    if (weights) node.morphWeights = weights;
    if (mesh) node.mesh = mesh;
    if (camera) node.camera = new Camera(camera, node.worldMatrix);
    if (skin) node.skin = skin;
    return node;
  }

  /**
   * Returns a Animation object for a given `animation`
   * @param {int} index animation index
   */
  @transform("animations")
  async animation({}) {
    //TODO: support animations
    return null;
  }

  /**
   * Returns a RenderNode object for a given `scene`
   * @param {int} index scene index
   */
  @transform("scenes")
  async scene({nodes=[], name}) {
    const node = new RenderNode(name);
    node.children.push(...await Promise.all(nodes.map(node => this.node(node))));
    return node;
  }
}
