import * as GL from './constants';

export default function createBindings(renderer, memory) {
  const {
    context: gl,
    objects_,
    objectsReverse_,
    uniformLocations_,
    uniformLocationsReverse_,
  } = renderer;

  // Memory access functions
  const {
    arrayBuffer,
    uint8View,
    uint16View,
    int32View, uint32View,
    float32View,

    readString, writeString,
    writeInt32, writeUint32,
    writeFloat32, writeFloat64,
  } = memory;
  const tmpArray = [];

  // Checking for WebGL2RenderingContext is obviously a bad idea
  const isWebGL2 = !(gl instanceof WebGLRenderingContext);

  // Typed views
  function typedData(type, offset) {
    const array = arrayBuffer();
    switch (type) {
    case GL.UNSIGNED_BYTE:
    case GL.BYTE:
      return new Uint8Array(array, offset);
    case GL.UNSIGNED_SHORT:
    case GL.SHORT:
    case GL.UNSIGNED_SHORT_5_6_5:
    case GL.UNSIGNED_SHORT_4_4_4_4:
    case GL.UNSIGNED_SHORT_5_5_5_1:
    case GL.HALF_FLOAT:
      return new Uint16Array(array, offset);
    case GL.UNSIGNED_INT:
    case GL.INT:
    case GL.UNSIGNED_INT_2_10_10_10_REV:
    case GL.UNSIGNED_INT_10F_11F_11F_REV:
    case GL.UNSIGNED_INT_5_9_9_9_REV:
    case GL.UNSIGNED_INT_24_8:
      return new Uint32Array(array, offset);
    case GL.FLOAT:
      return new Float32Array(array, offset);
    }
  }
  function typedView(type) {
    switch (type) {
    case GL.UNSIGNED_BYTE:
    case GL.BYTE:
      return uint8View();
    case GL.UNSIGNED_SHORT:
    case GL.SHORT:
    case GL.UNSIGNED_SHORT_5_6_5:
    case GL.UNSIGNED_SHORT_4_4_4_4:
    case GL.UNSIGNED_SHORT_5_5_5_1:
    case GL.HALF_FLOAT:
      return uint16View();
    case GL.UNSIGNED_INT:
    case GL.INT:
    case GL.UNSIGNED_INT_2_10_10_10_REV:
    case GL.UNSIGNED_INT_10F_11F_11F_REV:
    case GL.UNSIGNED_INT_5_9_9_9_REV:
    case GL.UNSIGNED_INT_24_8:
      return uint32View();
    case GL.FLOAT:
      return float32View();
    }
  }
  // getParameter wrapper to convert GL objects to indices
  function getParameter(pname) {
    const result = gl.getParameter(pname);
    switch (pname) {
    case GL.ARRAY_BUFFER_BINDING:
    case GL.ELEMENT_ARRAY_BUFFER_BINDING:
    case GL.COPY_READ_BUFFER_BINDING:
    case GL.COPY_WRITE_BUFFER_BINDING:
    case GL.PIXEL_PACK_BUFFER_BINDING:
    case GL.PIXEL_UNPACK_BUFFER_BINDING:
    case GL.TRANSFORM_FEEDBACK_BUFFER_BINDING:
    case GL.UNIFORM_BUFFER_BINDING:
    case GL.CURRENT_PROGRAM:
    case GL.FRAMEBUFFER_BINDING:
    case GL.DRAW_FRAMEBUFFER_BINDING:
    case GL.READ_FRAMEBUFFER_BINDING:
    case GL.RENDERBUFFER_BINDING:
    case GL.TEXTURE_BINDING_2D:
    case GL.TEXTURE_BINDING_CUBE_MAP:
    case GL.TEXTURE_BINDING_2D_ARRAY:
    case GL.TEXTURE_BINDING_3D:
    case GL.SAMPLER_BINDING:
    case GL.TRANSFORM_FEEDBACK_BINDING:
    case GL.VERTEX_ARRAY_BINDING:
      return objectsReverse_.get(result);
    default:
      return result;
    }
  }
  function getIndexedParameter(target, index) {
    const result = gl.getIndexedParameter(target, index);
    switch (target) {
    case GL.TRANSFORM_FEEDBACK_BUFFER_BINDING:
    case GL.UNIFORM_BUFFER_BINDING:
      return objectsReverse_.get(result);
    default:
      return result;
    }
  }
  function getVertexAttrib(index, pname) {
    const result = gl.getVertexAttrib(index, pname);
    if (pname === GL.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING) {
      return objectsReverse_.get(result);
    } else {
      return result;
    }
  }

  // Bind optional (WebGL2) function, or return a dummy that throws an exception when called
  function bindOptional(func) {
    return func ? func.bind(gl) : function() { func.apply(gl, arguments); };
  }
  // Explicit uniform setter
  function bindUniform(func) {
    return function(location, ...args) {
      func.call(gl, uniformLocations_.get(location), ...args);
    };
  }
  // Uniform 
  function bindUniformv(func, type, getView, size) {
    if (isWebGL2) {
      return function(location, count, offset) {
        func.call(gl, uniformLocations_.get(location), getView(), offset / type.BYTES_PER_ELEMENT, count * size);
      };
    } else {
      return function(location, count, offset) {
        func.call(gl, uniformLocations_.get(location), new type(arrayBuffer(), offset, count * size));
      };
    }
  }
  // Uniform matrix setter
  // Use garbage-free overload for WebGL2
  function bindUniformMatrixv(func, size) {
    if (isWebGL2) {
      return function(location, count, transpose, offset) {
        func.call(gl, uniformLocations_.get(location), transpose, float32View(), offset >> 2, count * size);
      };
    } else {
      return function(location, count, transpose, offset) {
        func.call(gl, uniformLocations_.get(location), transpose, new Float32Array(arrayBuffer(), offset, count * size));
      };
    }
  }

  const bindings = this.bindings = {
    glVersion() {
      return isWebGL2 ? 2 : 1;
    },
    glCanvasWidth() {
      return gl.drawingBufferWidth;
    },
    glCanvasHeight() {
      return gl.drawingBufferHeight;
    },
    glIsContextLost: gl.isContextLost.bind(gl),

    // Viewing and clipping
    glScissor: gl.scissor.bind(gl),
    glViewport: gl.viewport.bind(gl),

    // State information
    glActiveTexture: gl.activeTexture.bind(gl),
    glBlendColor: gl.blendColor.bind(gl),
    glBlendEquation: gl.blendEquation.bind(gl),
    glBlendEquationSeparate: gl.blendEquationSeparate.bind(gl),
    glBlendFunc: gl.blendFunc.bind(gl),
    glBlendFuncSeparate: gl.blendFuncSeparate.bind(gl),
    glClearColor: gl.clearColor.bind(gl),
    glClearDepth: gl.clearDepth.bind(gl),
    glClearStencil: gl.clearStencil.bind(gl),
    glColorMask: gl.colorMask.bind(gl),
    glCullFace: gl.cullFace.bind(gl),
    glDepthFunc: gl.depthFunc.bind(gl),
    glDepthMask: gl.depthMask.bind(gl),
    glDepthRange: gl.depthRange.bind(gl),
    glDisable: gl.disable.bind(gl),
    glEnable: gl.enable.bind(gl),
    glFrontFace: gl.frontFace.bind(gl),
    glGetError: gl.getError.bind(gl),
    glHint: gl.hint.bind(gl),
    glIsEnabled: gl.isEnabled.bind(gl),
    glLineWidth: gl.lineWidth.bind(gl),
    glPixelStorei: gl.pixelStorei.bind(gl),
    glPolygonOffset: gl.polygonOffset.bind(gl),
    glSampleCoverage: gl.sampleCoverage.bind(gl),
    glStencilFunc: gl.stencilFunc.bind(gl),
    glStencilFuncSeparate: gl.stencilFuncSeparate.bind(gl),
    glStencilMask: gl.stencilMask.bind(gl),
    glStencilMaskSeparate: gl.stencilMaskSeparate.bind(gl),
    glStencilOp: gl.stencilOp.bind(gl),
    glStencilOpSeparate: gl.stencilOpSeparate.bind(gl),

    // getParameter wrappers
    glGetBoolean: getParameter,
    glGetInteger: getParameter,
    glGetFloat: getParameter,
    glGetDouble: getParameter,
    glGetIntegerv(pname, data) {
      writeUint32(getParameter(pname), data);
    },
    glGetBooleanv(pname, data) {
      writeUint32(getParameter(pname), data);
    },
    glGetFloatv(pname, data) {
      writeFloat32(getParameter(pname), data);
    },
    glGetDoublev(pname, data) {
      writeFloat64(getParameter(pname), data);
    },
    glGetString(pname, maxLength, length, data) {
      writeString(getParameter(pname), maxLength, length, data);
    },
    // WebGL2
    glGetIntegeri: getIndexedParameter,
    glGetIntegeri_v(target, index, data) {
      writeUint32(getIndexedParameter(target, index), data);
    },

    // Buffers
    glBindBuffer(target, buffer) {
      gl.bindBuffer(target, objects_.get(buffer));
    },
    glBufferData(target, size, data, usage) {
      if (data) {
        gl.bufferData(target, new Uint8Array(arrayBuffer(), data, size), usage);
      } else {
        gl.bufferData(target, size, usage);
      }
    },
    glBufferSubData(target, offset, size, data) {
      gl.bufferSubData(target, offset, new Uint8Array(arrayBuffer(), data, size));
    },
    glCreateBuffer(index) {
      const buffer = gl.createBuffer();
      objects_.set(index, buffer);
      objectsReverse_.set(buffer, index);
    },
    glDeleteBuffer(index) {
      const buffer = objects_.get(index);
      objects_.delete(index);
      objectsReverse_.delete(buffer);
      gl.deleteBuffer(buffer);
    },
    glGetBufferParameter: gl.getBufferParameter.bind(gl),
    glIsBuffer(buffer) {
      return objects_.has(buffer) && gl.isBuffer(objects_.get(buffer));
    },
    // WebGL2
    glCopyBufferSubData: bindOptional(gl.copyBufferSubData),
    glGetBufferSubData(target, offset, size, data) {
      gl.getBufferSubData(target, offset, uint8View(), data, size);
    },

    // Framebuffers
    glBindFramebuffer(target, framebuffer) {
      gl.bindFramebuffer(target, objects_.get(framebuffer));
    },
    glCheckFramebufferStatus: gl.checkFramebufferStatus.bind(gl),
    glCreateFramebuffer(index) {
      const framebuffer = gl.createFramebuffer();
      objects_.set(index, framebuffer);
      objectsReverse_.set(framebuffer, index);
    },
    glDeleteFramebuffer(index) {
      const framebuffer = objects_.get(index);
      objects_.delete(index);
      objectsReverse_.delete(framebuffer);
      gl.deleteFramebuffer(framebuffer);
    },
    glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer) {
      gl.framebufferRenderbuffer(target, attachment, renderbuffertarget, objects_.get(renderbuffer));
    },
    glFramebufferTexture2D(target, attachment, textarget, texture, level) {
      gl.framebufferTexture2D(target, attachment, textarget, objects_.get(texture), level);
    },
    glGetFramebufferAttachmentParameter(target, attachment, pname) {
      const result = gl.getFramebufferAttachmentParameter(target, attachment, pname);
      if (pname === GL.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME) {
        return objectsReverse_.get(result);
      }
      return result;
    },
    glIsFramebuffer(framebuffer) {
      return objects_.has(framebuffer) && gl.isFramebuffer(objects_.get(framebuffer));
    },
    glReadPixels(x, y, width, height, format, type, pixels) {
      gl.readPixels(x, y, width, height, format, type, typedData(type, pixels));
    },
    glReadPixelsBuffer: gl.readPixels.bind(gl),
    // WebGL2
    glBlitFramebuffer: bindOptional(gl.blitFramebuffer),
    glFramebufferTextureLayer(target, attachment, texture, level, layer) {
      gl.framebufferTextureLayer(target, attachment, objects_.get(texture), level, layer);
    },
    glInvalidateFramebuffer(target, numAttachments, attachments) {
      const view = uint32View();
      attachments >>= 2;
      tmpArray.length = numAttachments;
      for (let i = 0; i < numAttachments; ++i) {
        tmpArray[i] = view[attachments + i];
      }
      gl.invalidateFramebuffer(target, tmpArray);      
    },
    glInvalidateSubFramebuffer(target, numAttachments, attachments, x, y, width, height) {
      const view = uint32View();
      attachments >>= 2;
      tmpArray.length = numAttachments;
      for (let i = 0; i < numAttachments; ++i) {
        tmpArray[i] = view[attachments + i];
      }
      gl.invalidateSubFramebuffer(target, tmpArray, x, y, width, height);      
    },
    glReadBuffer: bindOptional(gl.readBuffer),

    // Renderbuffers
    glBindRenderbuffer(target, renderbuffer) {
      gl.bindRenderbuffer(target, objects_.get(renderbuffer));
    },
    glCreateRenderbuffer(index) {
      const renderbuffer = gl.createRenderbuffer();
      objects_.set(index, renderbuffer);
      objectsReverse_.set(renderbuffer, index);
    },
    glDeleteRenderbuffer(index) {
      const renderbuffer = objects_.get(index);
      objects_.delete(index);
      objectsReverse_.delete(renderbuffer);
      gl.deleteRenderbuffer(renderbuffer);
    },
    glGetRenderbufferParameter: gl.getRenderbufferParameter.bind(gl),
    glIsRenderbuffer(renderbuffer) {
      return objects_.has(renderbuffer) && gl.isRenderbuffer(objects_.get(renderbuffer));
    },
    glRenderbufferStorage: gl.renderbufferStorage.bind(gl),
    // WebGL2
    glGetInternalformativ(target, internalformat, pname, bufSize, params) {
      let results = gl.getInternalformatParameter(target, internalformat, pname);
      if (results.length > bufSize) {
        results = results.subarray(0, bufSize);
      }
      uint32View().set(results, params >> 2);
    },
    glRenderbufferStorageMultisample: bindOptional(gl.renderbufferStorageMultisample),

    // Textures
    glBindTexture(target, texture) {
      gl.bindTexture(target, objects_.get(texture));
    },
    glCompressedTexImage2D(target, level, internalformat, width, height, border, imageSize, data) {
      gl.compressedTexImage2D(target, level, internalformat, width, height, border, new Uint8Array(arrayBuffer(), data, imageSize));
    },
    glCompressedTexImage2DBuffer: gl.compressedTexImage2D.bind(gl),
    glCompressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, imageSize, data) {
      gl.compressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, new Uint8Array(arrayBuffer(), data, imageSize));
    },
    glCompressedTexSubImage2DBuffer: gl.compressedTexSubImage2D.bind(gl),
    glCopyTexImage2D: gl.copyTexImage2D.bind(gl),
    glCopyTexSubImage2D: gl.copyTexSubImage2D.bind(gl),
    glCreateTexture(index) {
      const texture = gl.createTexture();
      objects_.set(index, texture);
      objectsReverse_.set(texture, index);
    },
    glDeleteTexture(index) {
      const texture = objects_.get(index);
      objects_.delete(index);
      objectsReverse_.delete(texture);
      gl.deleteTexture(texture);
    },
    glGenerateMipmap: gl.generateMipmap.bind(gl),
    glGetTexParameteri: gl.getTexParameter.bind(gl),
    glGetTexParameterf: gl.getTexParameter.bind(gl),
    glGetTexParameteriv(target, pname, params) {
      int32View()[params >> 2] = gl.getTexParameter(target, pname);
    },
    glGetTexParameterfv(target, pname, params) {
      float32View()[params >> 2] = gl.getTexParameter(target, pname);
    },
    glIsTexture(texture) {
      return objects_.has(texture) && gl.isTexture(objects_.get(texture));
    },
    glTexImage2D(target, level, internalformat, width, height, border, format, type, data) {
      if (data) {
        return gl.texImage2D(target, level, internalformat, width, height, border, format, type, typedData(type, data));
      } else {
        return gl.texImage2D(target, level, internalformat, width, height, border, format, type, null);
      }
    },
    glTexImage2DBuffer: gl.texImage2D.bind(gl),
    glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, data) {
      return gl.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, typedData(type, data));
    },
    glTexSubImage2DBuffer: gl.texSubImage2D.bind(gl),
    glTexParameteri: gl.texParameteri.bind(gl),
    glTexParameterf: gl.texParameterf.bind(gl),
    // WebGL2
    glTexStorage2D: bindOptional(gl.texStorage2D),
    glTexStorage3D: bindOptional(gl.texStorage3D),
    glTexImage3D(target, level, internalformat, width, height, depth, border, format, type, data) {
      if (data) {
        const view = typedView(type);
        gl.texImage3D(target, level, internalformat, width, height, depth, border, format, type, view, data / view.BYTES_PER_ELEMENT);
      } else {
        gl.texImage3D(target, level, internalformat, width, height, depth, border, format, type, null);
      }
    },
    glTexImage3DBuffer: bindOptional(gl.texImage3D),
    glTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, data) {
      const view = typedView(type);
      gl.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, view, data / view.BYTES_PER_ELEMENT);
    },
    glTexSubImage3DBuffer: bindOptional(gl.texSubImage3D),
    glCompressedTexImage3D(target, level, internalformat, width, height, border, imageSize, data) {
      gl.compressedTexImage3D(target, level, internalformat, width, height, border, uint8View(), data, imageSize);
    },
    glCompressedTexImage3DBuffer: bindOptional(gl.compressedTexImage3D),
    glCompressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, imageSize, data) {
      gl.compressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, uint8View(), data, imageSize);
    },
    glCompressedTexSubImage3DBuffer: bindOptional(gl.compressedTexSubImage3D),

    // Programs and shaders
    glAttachShader(program, shader) {
      gl.attachShader(objects_.get(program), objects_.get(shader));
    },
    glBindAttribLocation(program, index, name) {
      gl.bindAttribLocation(objects_.get(program), index, readString(name));
    },
    glCompileShader(shader) {
      gl.compileShader(objects_.get(shader));
    },
    glCreateProgram(index) {
      const program = gl.createProgram();
      objects_.set(index, program);
      objectsReverse_.set(program, index);
    },
    glCreateShader(index, type) {
      const shader = gl.createShader(type);
      objects_.set(index, shader);
      objectsReverse_.set(shader, index);
    },
    glDeleteProgram(index) {
      const program = objects_.get(index);
      objects_.delete(index);
      objectsReverse_.delete(program);
      gl.deleteProgram(program);
    },
    glDeleteShader(index) {
      const shader = objects_.get(index);
      objects_.delete(index);
      objectsReverse_.delete(shader);
      gl.deleteShader(shader);
    },
    glDetachShader(program, shader) {
      gl.detachShader(objects_.get(program), objects_.get(shader));
    },
    glGetAttachedShaders(program, maxCount, count, shaders) {
      const result = gl.getAttachedShaders(program);
      const length = Math.min(maxCount, result.length);
      const view = uint32View();
      shaders >>= 2;
      for (let i = 0; i < length; ++i) {
        view[shaders + i] = objects_.get(result[i]);
      }
      if (count) {
        view[count >> 2] = length;
      }
    },
    glGetProgrami(program, pname) {
      return gl.getProgramParameter(objects_.get(program), pname);
    },
    glGetProgramInfoLog(program, maxLength, length, infoLog) {
      writeString(gl.getProgramInfoLog(objects_.get(program)), maxLength, length, infoLog);
    },
    glGetShaderi(shader, pname) {
      return gl.getShaderParameter(objects_.get(shader), pname);
    },
    glGetShaderPrecisionFormat(shaderType, precisionType, range, precision) {
      const format = gl.getShaderPrecisionFormat(shaderType, precisionType);
      const view = uint32View();
      range >>= 2;
      view[range] = format.rangeMin;
      view[range + 1] = format.rangeMax;
      view[precision >> 2] = format.precision;
    },
    glGetShaderInfoLog(shader, maxLength, length, infoLog) {
      writeString(gl.getShaderInfoLog(objects_.get(shader)), maxLength, length, infoLog);
    },
    glGetShaderSource(shader, bufSize, length, source) {
      writeString(gl.getShaderSource(objects_.get(shader)), bufSize, length, source);
    },
    glIsProgram(program) {
      return objects_.has(program) && gl.isProgram(objects_.get(program));
    },
    glIsShader(shader) {
      return objects_.has(shader) && gl.isShader(objects_.get(shader));
    },
    glLinkProgram(program) {
      gl.linkProgram(objects_.get(program));
    },
    glShaderSource(shader, source) {
      gl.shaderSource(objects_.get(shader), readString(source));
    },
    glUseProgram(program) {
      gl.useProgram(objects_.get(program));
    },
    glValidateProgram(program) {
      gl.validateProgram(objects_.get(program));
    },
    // WebGL2
    glGetFragDataLocation(program, name) {
      return gl.getFragDataLocation(program, readString(name));
    },

    // Uniforms and attributes
    glDisableVertexAttribArray: gl.disableVertexAttribArray.bind(gl),
    glEnableVertexAttribArray: gl.enableVertexAttribArray.bind(gl),
    glGetActiveAttrib(program, index, bufSize, length, size, type, name) {
      const info = gl.getActiveAttrib(objects_.get(program), index);
      const view = uint32View();
      view[size >> 2] = info.size;
      view[type >> 2] = info.type;
      writeString(info.name, bufSize, length, name);
    },
    glGetActiveUniform(program, index, bufSize, length, size, type, name) {
      const info = gl.getActiveUniform(objects_.get(program), index);
      const view = uint32View();
      view[size >> 2] = info.size;
      view[type >> 2] = info.type;
      writeString(info.name, bufSize, length, name);
    },
    glGetAttribLocation(program, name) {
      return gl.getAttribLocation(objects_.get(program), readString(name));
    },
    glGetUniformfv(program, location, params) {
      const result = gl.getUniform(objects_.get(program), uniformLocations_.get(location));
      writeFloat32(result, params);
    },
    glGetUniformiv(program, location, params) {
      const result = gl.getUniform(objects_.get(program), uniformLocations_.get(location));
      writeInt32(result, params);
    },
    glGetUniformuiv(program, location, params) {
      const result = gl.getUniform(objects_.get(program), uniformLocations_.get(location));
      writeUint32(result, params);
    },
    glGetUniformLocation(program, name) {
      const location = gl.getUniformLocation(objects_.get(program), readString(name));
      let index = uniformLocationsReverse_.get(location);
      if (index == null) {
        index = uniformLocations_.size + 1;
        uniformLocations_.set(index, location);
        uniformLocationsReverse_.set(location, index);
      }
      return index;
    },
    glGetVertexAttribi: getVertexAttrib,
    glGetVertexAttribiv(index, pname, params) {
      writeInt32(getVertexAttrib(index, pname), params);
    },
    glGetVertexAttribIiv(index, pname, params) {
      writeInt32(getVertexAttrib(index, pname), params);
    },
    glGetVertexAttribIuiv(index, pname, params) {
      writeUint32(getVertexAttrib(index, pname), params);
    },
    glGetVertexAttribfv(index, pname, params) {
      writeFloat32(getVertexAttrib(index, pname), params);
    },
    glGetVertexAttribdv(index, pname, params) {
      writeFloat64(getVertexAttrib(index, pname), params);
    },
    glGetVertexAttribOffset: gl.getVertexAttribOffset.bind(gl),
    glUniform1f: bindUniform(gl.uniform1f),
    glUniform2f: bindUniform(gl.uniform2f),
    glUniform3f: bindUniform(gl.uniform3f),
    glUniform4f: bindUniform(gl.uniform4f),
    glUniform1i: bindUniform(gl.uniform1i),
    glUniform2i: bindUniform(gl.uniform2i),
    glUniform3i: bindUniform(gl.uniform3i),
    glUniform4i: bindUniform(gl.uniform4i),
    glUniform1ui: bindUniform(gl.uniform1ui),
    glUniform2ui: bindUniform(gl.uniform2ui),
    glUniform3ui: bindUniform(gl.uniform3ui),
    glUniform4ui: bindUniform(gl.uniform4ui),
    glUniform1fv: bindUniformv(gl.uniform1fv, Float32Array, float32View, 1),
    glUniform2fv: bindUniformv(gl.uniform2fv, Float32Array, float32View, 2),
    glUniform3fv: bindUniformv(gl.uniform3fv, Float32Array, float32View, 3),
    glUniform4fv: bindUniformv(gl.uniform4fv, Float32Array, float32View, 4),
    glUniform1iv: bindUniformv(gl.uniform1iv, Int32Array, int32View, 1),
    glUniform2iv: bindUniformv(gl.uniform2iv, Int32Array, int32View, 2),
    glUniform3iv: bindUniformv(gl.uniform3iv, Int32Array, int32View, 3),
    glUniform4iv: bindUniformv(gl.uniform4iv, Int32Array, int32View, 4),
    glUniform1uiv: bindUniformv(gl.uniform1uiv, Uint32Array, uint32View, 1),
    glUniform2uiv: bindUniformv(gl.uniform2uiv, Uint32Array, uint32View, 2),
    glUniform3uiv: bindUniformv(gl.uniform3uiv, Uint32Array, uint32View, 3),
    glUniform4uiv: bindUniformv(gl.uniform4uiv, Uint32Array, uint32View, 4),
    glUniformMatrix2fv: bindUniformMatrixv(gl.uniformMatrix2fv, 4),
    glUniformMatrix3fv: bindUniformMatrixv(gl.uniformMatrix3fv, 9),
    glUniformMatrix4fv: bindUniformMatrixv(gl.uniformMatrix4fv, 16),
    glUniformMatrix2x3fv: bindUniformMatrixv(gl.uniformMatrix2x3fv, 6),
    glUniformMatrix3x2fv: bindUniformMatrixv(gl.uniformMatrix3x2fv, 6),
    glUniformMatrix2x4fv: bindUniformMatrixv(gl.uniformMatrix2x4fv, 8),
    glUniformMatrix4x2fv: bindUniformMatrixv(gl.uniformMatrix4x2fv, 8),
    glUniformMatrix3x4fv: bindUniformMatrixv(gl.uniformMatrix3x4fv, 12),
    glUniformMatrix4x3fv: bindUniformMatrixv(gl.uniformMatrix4x3fv, 12),
    glVertexAttrib1f: gl.vertexAttrib1f.bind(gl),
    glVertexAttrib2f: gl.vertexAttrib2f.bind(gl),
    glVertexAttrib3f: gl.vertexAttrib3f.bind(gl),
    glVertexAttrib4f: gl.vertexAttrib4f.bind(gl),
    glVertexAttrib1fv(index, value) {
      const view = float32View();
      gl.vertexAttrib1f(index, view[value >> 2]);
    },
    glVertexAttrib2fv(index, value) {
      const view = float32View();
      value >>= 2;
      gl.vertexAttrib2f(index, view[value], view[value + 1]);
    },
    glVertexAttrib3fv(index, value) {
      const view = float32View();
      value >>= 2;
      gl.vertexAttrib3f(index, view[value], view[value + 1], view[value + 2]);
    },
    glVertexAttrib4fv(index, value) {
      const view = float32View();
      value >>= 2;
      gl.vertexAttrib4f(index, view[value], view[value + 1], view[value + 2], view[value + 3]);
    },
    glVertexAttribPointer: gl.vertexAttribPointer.bind(gl),
    // WebGL2
    glVertexAttribI4i: bindOptional(gl.vertexAttribI4i),
    glVertexAttribI4ui: bindOptional(gl.vertexAttribI4ui),
    glVertexAttribI4iv(index, value) {
      const view = int32View();
      value >>= 2;
      gl.vertexAttribI4iv(index, view[value], view[value + 1], view[value + 2], view[value + 3]);
    },
    glVertexAttribI4uiv(index, value) {
      const view = uint32View();
      value >>= 2;
      gl.vertexAttribI4uiv(index, view[value], view[value + 1], view[value + 2], view[value + 3]);
    },
    glVertexAttribIPointer: bindOptional(gl.vertexAttribIPointer),

    // Drawing buffers
    glClear: gl.clear.bind(gl),
    glDrawArrays: gl.drawArrays.bind(gl),
    glDrawElements: gl.drawElements.bind(gl),
    glFinish: gl.finish.bind(gl),
    glFlush: gl.flush.bind(gl),
    // WebGL2
    glVertexAttribDivisor: bindOptional(gl.vertexAttribDivisor),
    glDrawArraysInstanced: bindOptional(gl.drawArraysInstanced),
    glDrawElementsInstanced: bindOptional(gl.drawElementsInstanced),
    glDrawRangeElements: bindOptional(gl.drawRangeElements),
    glDrawBuffers(n, bufs) {
      const view = uint32View();
      bufs >>= 2;
      tmpArray.length = n;
      for (let i = 0; i < n; ++i) {
        tmpArray[i] = view[bufs + i];
      }
      gl.drawBuffers(tmpArray);
    },
    glClearBufferiv(buffer, drawbuffer, value) {
      return gl.clearBufferiv(buffer, drawbuffer, int32View(), value >> 2);
    },
    glClearBufferuiv(buffer, drawbuffer, value) {
      return gl.clearBufferuiv(buffer, drawbuffer, uint32View(), value >> 2);
    },
    glClearBufferfv(buffer, drawbuffer, value) {
      return gl.clearBufferfv(buffer, drawbuffer, float32View(), value >> 2);
    },
    glClearBufferfi: bindOptional(gl.clearBufferfi),

    // Query objects (WebGL2)
    glCreateQuery(index) {
      const query = gl.createQuery();
      objects_.set(index, query);
      objectsReverse_.set(query, index);
    },
    glDeleteQuery(index) {
      const query = objects_.get(index);
      objects_.delete(index);
      objectsReverse_.delete(query);
      gl.deleteQuery(query);
    },
    glIsQuery(query) {
      return objects_.has(query) && gl.isQuery(objects_.get(query));
    },
    glBeginQuery(target, query) {
      gl.beginQuery(target, objects_.get(query));
    },
    glEndQuery: bindOptional(gl.endQuery),
    glGetQuery(target, pname) {
      const result = gl.getQuery(target, pname);
      switch (pname) {
      case GL.CURRENT_QUERY:
        return objectsReverse_.get(result);
      default:
        return result;
      }
    },
    glGetQueryiv(target, pname, params) {
      let result = gl.getQuery(target, pname);
      if (pname === GL.CURRENT_QUERY) {
        result = objectsReverse_.get(result);
      }
      int32View()[params >> 2] = result;
    },
    glGetQueryParameter(query, pname) {
      return gl.getQueryParameter(objects_.get(query), pname);
    },
    glGetQueryObjectiv(id, pname, params) {
      int32View()[params >> 2] = gl.getQueryParameter(objects_.get(id), pname);
    },
    glGetQueryObjectuiv(id, pname, params) {
      uint32View()[params >> 2] = gl.getQueryParameter(objects_.get(id), pname);
    },

    // Sampler objects (WebGL2)
    glCreateSampler(index) {
      const sampler = gl.createSampler();
      objects_.set(index, sampler);
      objectsReverse_.set(sampler, index);
    },
    glDeleteSampler(index) {
      const sampler = objects_.get(index);
      objects_.delete(index);
      objectsReverse_.delete(sampler);
      gl.deleteSampler(sampler);
    },
    glBindSampler(unit, sampler) {
      gl.bindSampler(unit, objects_.get(sampler));
    },
    glIsSampler(sampler) {
      return objects_.has(sampler) && gl.isSampler(objects_.get(sampler));
    },
    glSamplerParameteri: bindOptional(gl.samplerParameteri),
    glSamplerParameterf: bindOptional(gl.samplerParameterf),
    glGetSamplerParameteri(sampler, pname) {
      return gl.getSamplerParameter(objects_.get(sampler), pname);
    },
    glGetSamplerParameterf(sampler, pname) {
      return gl.getSamplerParameter(objects_.get(sampler), pname);
    },
    glGetSamplerParameteriv(sampler, pname, params) {
      int32View()[params >> 2] = gl.getSamplerParameter(objects_.get(sampler), pname);
    },
    glGetSamplerParameterfv(sampler, pname, params) {
      float32View()[params >> 2] = gl.getSamplerParameter(objects_.get(sampler), pname);
    },

    // Sync objects (WebGL2)
    glFenceSync(index, condition, flags) {
      const sync = gl.fenceSync(condition, flags);
      objects_.set(index, sync);
      objectsReverse_.set(sync, index);
    },
    glDeleteSync(index) {
      const sync = objects_.get(index);
      objects_.delete(index);
      objectsReverse_.delete(sync);
      gl.deleteSync(sync);
    },
    glIsSync(sync) {
      return objects_.has(sync) && gl.isSync(objects_.get(sync));
    },
    glClientWaitSync(sync, flags, timeout) {
      return gl.clientWaitSync(objects_.get(sync), flags, timeout);
    },
    glWaitSync(sync, flags, timeout) {
      return gl.waitSync(objects_.get(sync), flags, timeout);
    },
    glGetSynci(sync, pname) {
      return gl.getSyncParameter(objects_.get(sync), pname);
    },
    glGetSynciv(sync, pname, bufSize, length, values) {
      const view = int32View();
      view[values >> 2] = gl.getSyncParameter(objects_.get(sync), pname);
      if (length) {
        view[length >> 2] = 1;
      }
    },

    // Transform feedback (WebGL2)
    glCreateTransformFeedback(index) {
      const transformFeedback = gl.createTransformFeedback();
      objects_.set(index, transformFeedback);
      objectsReverse_.set(transformFeedback, index);
    },
    glDeleteTransformFeedback(index) {
      const transformFeedback = objects_.get(index);
      objects_.delete(index);
      objectsReverse_.delete(transformFeedback);
      gl.deleteTransformFeedback(transformFeedback);
    },
    glIsTransformFeedback(transformFeedback) {
      return objects_.has(transformFeedback) && gl.isTransformFeedback(objects_.get(transformFeedback));
    },
    glBindTransformFeedback(target, transformFeedback) {
      gl.bindTransformFeedback(target, objects_.get(transformFeedback));
    },
    glBeginTransformFeedback: bindOptional(gl.beginTransformFeedback),
    glEndTransformFeedback: bindOptional(gl.endTransformFeedback),
    glTransformFeedbackVaryings(program, count, varyings, bufferMode) {
      const view = uint32View();
      varyings >>= 2;
      tmpArray.length = count;
      for (let i = 0; i < count; ++i) {
        tmpArray[i] = readString(view[varyings + i]);
      }
      gl.transformFeedbackVaryings(objects_.get(program), tmpArray, bufferMode);
    },
    glGetTransformFeedbackVarying(program, index, bufSize, length, size, type, name) {
      const info = gl.getTransformFeedbackVarying(objects_.get(program), index);
      const view = uint32View();
      view[size >> 2] = info.size;
      view[type >> 2] = info.type;
      writeString(info.name, bufSize, length, name);
    },
    glPauseTransformFeedback: bindOptional(gl.pauseTransformFeedback),
    glResumeTransformFeedback: bindOptional(gl.resumeTransformFeedback),

    // Uniform buffer objects (WebGL2)
    glBindBufferBase(target, index, buffer) {
      gl.bindBufferBase(target, index, objects_.get(buffer));
    },
    glBindBufferRange(target, index, buffer, offset, size) {
      gl.bindBufferRange(target, index, objects_.get(buffer), offset, size);
    },
    glGetUniformIndices(program, uniformCount, uniformNames, uniformIndices) {
      const view = uint32View();
      uniformNames >>= 2;
      tmpArray.length = uniformCount;
      for (let i = 0; i < uniformCount; ++i) {
        tmpArray[i] = readString(view[uniformNames + i]);
      }
      view.set(gl.getUniformIndices(objects_.get(program), tmpArray), uniformIndices >> 2);
    },
    glGetActiveUniformsiv(program, uniformCount, uniformIndices, pname, params) {
      const view = uint32View();
      uniformIndices >>= 2;
      tmpArray.length = uniformCount;
      for (let i = 0; i < uniformCount; ++i) {
        tmpArray[i] = view[uniformIndices + i];
      }
      const results = gl.getActiveUniforms(objects_.get(program), tmpArray, pname);
      view.set(results, params >> 2);
    },
    glGetUniformBlockIndex(program, uniformBlockName) {
      gl.getUniformBlockIndex(objects_.get(program), readString(uniformBlockName));
    },
    glGetActiveUniformBlockiv(program, uniformBlockIndex, pname, params) {
      writeInt32(params, gl.getActiveUniformBlockParameter(objects_.get(program), uniformBlockIndex, pname));
    },
    glGetActiveUniformBlockName(program, uniformBlockIndex, bufSize, length, uniformBlockName) {
      writeString(gl.getActiveUniformBlockName(objects_.get(program), uniformBlockIndex), bufSize, length, uniformBlockName);
    },
    glUniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding) {
      gl.uniformBlockBinding(objects_.get(program), uniformBlockIndex, uniformBlockBinding);
    },

    // Vertex array objects (WebGL2)
    glCreateVertexArray() {
      const vertexArray = gl.createVertexArray();
      objects_.set(index, vertexArray);
      objectsReverse_.set(vertexArray, index);
    },
    glDeleteVertexArray(index) {
      const vertexArray = objects_.get(index);
      objects_.delete(index);
      objectsReverse_.delete(vertexArray);
      gl.deleteVertexArray(vertexArray);
    },
    glIsVertexArray(vertexArray) {
      return objects_.has(vertexArray) && gl.isVertexArray(objects_.get(vertexArray));
    },
    glBindVertexArray(vertexArray) {
      gl.bindVertexArray(objects_.get(vertexArray));
    },

    // Working with extensions
    glGetExtension(name) {
      return renderer.getExtension(readString(name)) != null;
    },
  };

  if (isWebGL2) {
    // Override some functions to make use of garbage-free overloads
    Object.assign(bindings, {
      glBufferData(target, size, data, usage) {
        if (data) {
          gl.bufferData(target, uint8View(), usage, data, size);
        } else {
          gl.bufferData(target, size, usage);
        }
      },
      glBufferSubData(target, offset, size, data) {
        gl.bufferSubData(target, offset, uint8View(), data, size);
      },

      glReadPixels(x, y, width, height, format, type, pixels) {
        const view = typedView(type);
        gl.readPixels(x, y, width, height, format, type, view, pixels / view.BYTES_PER_ELEMENT);
      },

      // Textures
      glCompressedTexImage2D(target, level, internalformat, width, height, border, imageSize, data) {
        gl.compressedTexImage2D(target, level, internalformat, width, height, border, uint8View(), data, imageSize);
      },
      glCompressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, imageSize, data) {
        gl.compressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, uint8View(), data, imageSize);
      },
      glTexImage2D(target, level, internalformat, width, height, border, format, type, data) {
        if (data) {
          const view = typedView(type);
          return gl.texImage2D(target, level, internalformat, width, height, border, format, type, view, data / view.BYTES_PER_ELEMENT);
        } else {
          return gl.texImage2D(target, level, internalformat, width, height, border, format, type, null);
        }
      },
      glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, data) {
        const view = typedView(type);
        return gl.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, view, data / view.BYTES_PER_ELEMENT);
      },
    });
  }

  function bindExtension(extname, funcs) {
    let ext = undefined;
    Object.entries(funcs).forEach(([name, func]) => {
      if (typeof func === "function") {
        bindings[name] = function(...args) {
          if (ext === undefined) {
            ext = renderer.getExtension(extname);
          }
          return func(ext, ...args);
        };
      } else {
        bindings[name] = function(...args) {
          if (ext === undefined) {
            ext = renderer.getExtension(extname);
          }
          return ext[func](...args);
        };
      }
    });
  }

  if (!isWebGL2) {
    bindExtension("ANGLE_instanced_arrays", {
      glDrawArraysInstanced: "drawArraysInstancedANGLE",
      glDrawElementsInstanced: "drawElementsInstancedANGLE",
      glVertexAttribDivisor: "vertexAttribDivisorANGLE",
    });

    bindExtension("EXT_disjoint_timer_query", {
      glCreateQuery(ext, index) {
        const query = ext.createQueryEXT();
        objects_.set(index, query);
        objectsReverse_.set(query, index);
      },
      glDeleteQuery(ext, index) {
        const query = objects_.get(index);
        objects_.delete(index);
        objectsReverse_.delete(query);
        ext.deleteQueryEXT(query);
      },
      glIsQuery(ext, query) {
        return objects_.has(query) && ext.isQueryEXT(objects_.get(query));
      },
      glBeginQuery(ext, target, query) {
        ext.beginQueryEXT(target, objects_.get(query));
      },
      glEndQuery: "endQueryEXT",
      glQueryCounter(ext, query, target) {
        ext.queryCounterEXT(objects_.get(query), target);
      },
      glGetQuery(ext, target, pname) {
        const result = ext.getQueryEXT(target, pname);
        switch (pname) {
        case GL.CURRENT_QUERY:
          return objectsReverse_.get(result);
        default:
          return result;
        }
      },
      glGetQueryiv(ext, target, pname, params) {
        let result = ext.getQueryEXT(target, pname);
        if (pname === GL.CURRENT_QUERY) {
          result = objectsReverse_.get(result);
        }
        int32View()[params >> 2] = result;
      },
      glGetQueryParameter(ext, query, pname) {
        return ext.getQueryObjectEXT(objects_.get(query), pname);
      },
      glGetQueryObjectiv(id, pname, params) {
        int32View()[params >> 2] = gl.ext.getQueryObjectEXT(objects_.get(id), pname);
      },
      glGetQueryObjectuiv(id, pname, params) {
        uint32View()[params >> 2] = gl.ext.getQueryObjectEXT(objects_.get(id), pname);
      },
    });

    bindExtension("OES_vertex_array_object", {
      glCreateVertexArray(ext, index) {
        const vertexArray = ext.createVertexArrayOES();
        objects_.set(index, vertexArray);
        objectsReverse_.set(vertexArray, index);
      },
      glDeleteVertexArray(ext, index) {
        const vertexArray = objects_.get(index);
        objects_.delete(index);
        objectsReverse_.delete(vertexArray);
        ext.deleteVertexArrayOES(vertexArray);
      },
      glIsVertexArray(ext, vertexArray) {
        return objects_.has(vertexArray) && ext.isVertexArrayOES(objects_.get(vertexArray));
      },
      glBindVertexArray(ext, vertexArray) {
        ext.bindVertexArrayOES(objects_.get(vertexArray));
      },
    });

    bindExtension("WEBGL_draw_buffers", {
      glDrawBuffers(ext, n, bufs) {
        const view = uint32View();
        bufs >>= 2;
        tmpArray.length = n;
        for (let i = 0; i < n; ++i) {
          tmpArray[i] = view[bufs + i];
        }
        ext.drawBuffersWEBGL(tmpArray);
      },
    });
  } else {
    bindExtension("EXT_disjoint_timer_query_webgl2", {
      glQueryCounter(ext, query, target) {
        ext.queryCounterEXT(objects_.get(query), target);
      },
    });
  }

  bindExtension("WEBGL_debug_shaders", {
    glGetTranslatedShaderSource(ext, shader, maxSize, length, data) {
      writeString(ext.getTranslatedShaderSource(objects_.get(shader)), maxSize, length, data);
    },
  });

  bindExtension("WEBGL_lose_context", {
    glLoseContext(ext) {
      ext.loseContext();
    },
    glRestoreContext(ext) {
      ext.restoreContext();
    },
  });

  return bindings;
}
