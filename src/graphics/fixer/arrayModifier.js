import VertexReader from './vertexReader';
import buildNormals from './buildNormals';
import buildTangents from './buildTangents';
import VertexType from '../vertexType';
import VertexData from '../vertexData';
import * as WebGL from '../constants';
import { vec3, vec4 } from 'math';

import { getIndexView, restartIndex, readIndices } from './indexUtils';

export default class ArrayModifier {
  constructor(array, primitives) {
    const gl = array.renderer.gl;
    this.array = array;
    this.primitives = primitives;

    // Get index data
    this.arrayIndices = array.getIndices();
    const indexArray = readIndices(gl, this.arrayIndices);

    this.attributes = array.getAttributes();
    this.noNormals = !this.attributes.hasOwnProperty("NORMAL");
    this.noTangents = !this.attributes.hasOwnProperty("TANGENT");

    if (!this.noNormals && !this.noTangents) {
      // Don't need to do anything
      return;
    }

    // List of indices for each primitive
    this.triangles = [];
    this.indexSet = new Set();
    this.texCoords = new Set();
    primitives.forEach(p => {
      if (p.mode !== WebGL.TRIANGLES && p.mode !== WebGL.TRIANGLE_STRIP && p.mode !== WebGL.TRIANGLE_FAN) {
        // We don't want lines or points
        return;
      }
      let texCoord = null;
      if (p.material.normalTexture && this.attributes.hasOwnProperty(`TEXCOORD_${p.material.normalTexture.texCoord || 0}`)) {
        this.texCoords.add(texCoord = (p.material.normalTexture.texCoord || 0));
      } else if (!this.noNormals) {
        // If we don't need to reconstruct normals, then we're only interested in triangles with normal map
        return;
      }
      let elements;
      if (p.indices) {
        if (!indexArray) {
          throw new Error(`indexed primitive, but no indices in vertex array`);
        }
        const view = getIndexView(p.indices.type);
        elements = p.elements_ = new view(indexArray, p.indices.offset || 0, p.count);
      } else {
        elements = Object.keys([...new Array(p.count)]);
      }
      const tri = [];
      let consecutive = 0;
      const restart = restartIndex(elements);
      p.triangles_ = [];
      elements.forEach(index => {
        if (index === restart) {
          tri.length = 0;
          consecutive = 0;
        } else {
          this.indexSet.add(index);
          tri.push(index);
          if (tri.length >= 3) {
            consecutive += 1;
            const triangle = {...tri, texCoord, primitive: p};
            this.triangles.push(triangle);
            p.triangles_.push(triangle);
            if (p.mode === WebGL.TRIANGLE_STRIP) {
              // Dark magic
              tri[consecutive & 1] = tri[2];
              tri.length = 2;
            } else if (p.mode === WebGL.TRIANGLE_FAN) {
              tri[1] = tri[2];
              tri.length = 2;
            } else {
              tri.length = 0;
            }
          }
        }
      });
    });
    if (!this.triangles.length) {
      // No valid primitives.. not much we can do here
      return;
    }

    // Filter attributes we need
    this.attributesFetch = {POSITION: this.attributes.POSITION};
    if (!this.noNormals) {
      this.attributesFetch.NORMAL = this.attributes.NORMAL;
    }
    this.texCoords.forEach(coord => {
      const name = `TEXCOORD_${coord}`;
      if (this.attributes[name]) {
        this.attributesFetch[name] = this.attributes[name];
      }
    });
    this.minIndex = Math.min(...this.indexSet);
    this.maxIndex = Math.max(...this.indexSet);
    const reader = new VertexReader(gl, this.attributesFetch, this.minIndex, this.maxIndex);
    this.vertices = {};
    this.indexSet.forEach(index => this.vertices[index] = reader.getVertex(index, true));
    this.nextIndex = this.maxIndex;
  }

  cloneVertex(index) {
    const newIndex = ++this.nextIndex;
    const src = this.vertices[index];
    const dst = this.vertices[newIndex] = {...src};
    dst.source = (src.source == null ? index : src.source);
    return newIndex;
  }

  // Build missing normals
  buildNormals() {
    this.noNormals = false;
    this.newNormals = buildNormals(this.vertices, this.triangles, this.minIndex, this.maxIndex);
  }

  // Build missing tangents
  buildTangents() {
    if (!this.texCoords.size) {
      // Can't do anything without normal maps
      return;
    }
    this.noTangents = false;
    // Allocate an array for tangents
    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
    this.newTangents = new ArrayBuffer((this.maxIndex - this.minIndex + 1) * stride);
    this.texCoords.forEach(texCoord => buildTangents(this, texCoord));
    // Make sure every vertex has some tangent
    const tvec = vec3.create();
    for (let index in this.vertices) {
      if (!this.vertices[index].TANGENT) {
        if (index <= this.maxIndex) {
          this.vertices[index].TANGENT = new Float32Array(this.newTangents, (index - this.minIndex) * stride, 4);
        } else {
          this.vertices[index].TANGENT = vec4.create();
        }
        const { NORMAL, TANGENT } = this.vertices[index];
        if (NORMAL) {
          vec3.makeBasis(NORMAL, TANGENT, tvec);
          TANGENT[3] = 1.0;
        } else {
          vec4.set(TANGENT, 1.0, 0.0, 0.0, 1.0);
        }
      }
    }
  }

  // Write changes back to vertex array
  apply() {
    const gl = this.array.renderer.gl;
    if (this.nextIndex > this.maxIndex) {
      // Case 1: New vertices
      // Do full reindex

      // 1. Get remaining attributes
      const attributesRemain = {};
      for (let name in this.attributes) {
        // If the original attributes had tangents, we discard them
        if (!this.attributesFetch[name] && name !== "TANGENT") {
          attributesRemain[name] = this.attributes[name];
        }
      }
      const reader = new VertexReader(gl, attributesRemain, this.minIndex, this.maxIndex);
      const vertexAdd = {};
      this.indexSet.forEach(index => Object.assign(this.vertices[index], vertexAdd[index] = reader.getVertex(index)));
      for (let index = this.maxIndex + 1; index <= this.nextIndex; ++index) {
        Object.assign(this.vertices[index], vertexAdd[this.vertices[index].source]);
      }

      // 2. Re-index vertices
      const indexMap = new Map();
      const newVertices = [];
      // This needs to stay sorted to support non-indexed primitives
      [...this.indexSet].sort().forEach(index => {
        indexMap.set(index, newVertices.length);
        newVertices.push(this.vertices[index]);
      });
      for (let index = this.maxIndex + 1; index <= this.nextIndex; ++index) {
        indexMap.set(index, newVertices.length);
        newVertices.push(this.vertices[index]);
      }

      // 3. Make new index array
      // Count number of indices required
      const numIndices = this.primitives.reduce((count, p) => {
        if (1 || p.needReindex_) {
          // We will make a set of separate triangles
          return count + p.triangles_.length * 3;
        } else if (p.elements_) {
          // Reuse old indices
          return count + p.count;
        } else {
          // Non-indexed primitive stays that way
          return count;
        }
      }, 0);
      // Check for equality because 65535 is primitive reset index
      const indexType = (newVertices.length >= 65536 ? WebGL.UNSIGNED_INT : WebGL.UNSIGNED_SHORT);
      const indexView = getIndexView(indexType);
      const indexArray = new indexView(numIndices);
      this.primitives.reduce((pos, p) => {
        if (1 || p.needReindex_) {
          p.mode = WebGL.TRIANGLES;
          p.indices = {
            type: indexType,
            offset: pos * indexView.BYTES_PER_ELEMENT,
          };
          p.count = p.triangles_.length * 3;
          p.triangles_.forEach(tri => {
            indexArray[pos++] = indexMap.get(tri[0]);
            indexArray[pos++] = indexMap.get(tri[1]);
            indexArray[pos++] = indexMap.get(tri[2]);
          });
        } else if (p.elements_) {
          p.indices = {
            type: indexType,
            offset: pos * indexView.BYTES_PER_ELEMENT,
          };
          p.elements_.forEach(idx => indexArray[pos++] = indexMap.get(idx));
        }
        return pos;
      }, 0);
      // Create index buffer
      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(WebGL.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(WebGL.ELEMENT_ARRAY_BUFFER, indexArray, WebGL.STATIC_DRAW);

      // 4. Make new attribute arrays
      // Update attribute data
      if (this.newNormals) {
        this.attributes.NORMAL = {
          size: 3,
          type: WebGL.FLOAT,
        };
      }
      if (this.newTangents) {
        this.attributes.TANGENT = {
          size: 4,
          type: WebGL.FLOAT
        };
      }
      // Create new attributes
      const vertexData = new VertexData(newVertices.length, new VertexType(this.attributes));
      newVertices.forEach((v, i) => {
        delete v.source;
        vertexData.set(i, v)
      });
      const newAttributes = vertexData.buildAttributes(gl);
      this.array.setAttributes(newAttributes, indexBuffer);
    } else if (this.newNormals || this.newTangents) {
      // Case 2: New attributes
      // Original attributes/vertices did not change
      // Create new buffers and add them to vertex array
      if (this.newNormals) {
        const buffer = gl.createBuffer();
        const stride = Float32Array.BYTES_PER_ELEMENT * 3;
        gl.bindBuffer(WebGL.ARRAY_BUFFER, buffer);
        gl.bufferData(WebGL.ARRAY_BUFFER, (this.maxIndex + 1) * stride, WebGL.STATIC_DRAW);
        gl.bufferSubData(WebGL.ARRAY_BUFFER, this.minIndex * stride, this.newNormals);
        this.attribtes.NORMAL = {
          buffer,
          size: 3,
          type: WebGL.FLOAT,
        };
      }
      if (this.newTangents) {
        const buffer = gl.createBuffer();
        const stride = Float32Array.BYTES_PER_ELEMENT * 4;
        gl.bindBuffer(WebGL.ARRAY_BUFFER, buffer);
        gl.bufferData(WebGL.ARRAY_BUFFER, (this.maxIndex + 1) * stride, WebGL.STATIC_DRAW);
        gl.bufferSubData(WebGL.ARRAY_BUFFER, this.minIndex * stride, this.newTangents);
        this.attributes.TANGENT = {
          buffer,
          size: 4,
          type: WebGL.FLOAT,
        };
      }
      this.array.setAttributes(this.attributes, this.arrayIndices);
    }
    // Remove helpers
    this.primitives.forEach(p => {
      delete p.elements_;
      delete p.needReindex_;
      delete p.triangles_;
    });
  }
}
