#include "webgl.h"
#include "buffer.h"
#include "renderBuffer.h"
#include "frameBuffer.h"
#include "texture.h"
#include "shader.h"
#include "program.h"
#include "vertexArray.h"

namespace WebGL
{

enum {
  NUM_BUFFER_SLOTS = 8,
  NUM_RENDERBUFFER_SLOTS = 1,
  NUM_FRAMEBUFFER_SLOTS = 2,
  NUM_TEXTURE_SLOTS = 4,
};

static struct WebGLInstance {
  WebGLInstance();

  int version_;
  ui32 features_ = 0;
  Buffer* bufferBinding_[NUM_BUFFER_SLOTS];
  FrameBuffer* frameBufferBinding_[NUM_FRAMEBUFFER_SLOTS];
  RenderBuffer* renderBufferBinding_[NUM_RENDERBUFFER_SLOTS];
  size_t maxTextureUnits_;
  ui32 activeTexture_ = 0;
  Texture** textureBindings_[NUM_TEXTURE_SLOTS];
  Program* program_ = nullptr;
  VertexArray* vertexArray_ = nullptr;
} instance_;

static int getBufferSlot(GLenum target) {
  switch (target) {
  case GL_ARRAY_BUFFER:
    return 0;
  case GL_ELEMENT_ARRAY_BUFFER:
    return 1;
  case GL_COPY_READ_BUFFER:
    return 2;
  case GL_COPY_WRITE_BUFFER:
    return 3;
  case GL_TRANSFORM_FEEDBACK_BUFFER:
    return 4;
  case GL_UNIFORM_BUFFER:
    return 5;
  case GL_PIXEL_PACK_BUFFER:
    return 6;
  case GL_PIXEL_UNPACK_BUFFER:
    return 7;
  default:
    return 0;
  }
}

static int getFrameBufferSlot(GLenum target) {
  switch (target) {
  case GL_FRAMEBUFFER:
  case GL_DRAW_FRAMEBUFFER:
    return 0;
  case GL_READ_FRAMEBUFFER:
    return 1;
  default:
    return 0;
  }
}

static int getTextureSlot(GLenum target) {
  switch (target) {
  case GL_TEXTURE_2D:
    return 0;
  case GL_TEXTURE_CUBE_MAP:
    return 1;
  case GL_TEXTURE_3D:
    return 2;
  case GL_TEXTURE_2D_ARRAY:
    return 3;
  default:
    return 0;
  }
}
static GLenum getTextureTarget(int slot) {
  switch (slot) {
  case 0:
    return GL_TEXTURE_2D;
  case 1:
    return GL_TEXTURE_CUBE_MAP;
  case 2:
    return GL_TEXTURE_3D;
  case 3:
    return GL_TEXTURE_2D_ARRAY;
  default:
    return GL_TEXTURE_2D;
  }
}

WebGLInstance::WebGLInstance() {
  version_ = glVersion();

  if (version_ >= 2 || glGetExtension("OES_vertex_array_object")) {
    features_ |= FEATURE_VERTEX_ARRAY;
  }
  if (version_ >= 2 || glGetExtension("ANGLE_instanced_arrays")) {
    features_ |= FEATURE_INSTANCED_RENDERING;
  }
  
  for (int i = 0; i < NUM_BUFFER_SLOTS; ++i) {
    bufferBinding_[i] = nullptr;
  }
  renderBufferBinding_[0] = nullptr;
  maxTextureUnits_ = glGetInteger(GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS);
  Texture** texPtr = (Texture**)sbrk(sizeof(Texture*) * maxTextureUnits_ * NUM_TEXTURE_SLOTS);
  for (int i = 0; i < NUM_TEXTURE_SLOTS; ++i) {
    textureBindings_[i] = texPtr + maxTextureUnits_ * i;
    for (int j = 0; j < maxTextureUnits_; ++j) {
      textureBindings_[i][j] = nullptr;
    }
  }
}

int version() {
  return instance_.version_;
}
bool getFeature(ui32 feature) {
  return (instance_.features_ & feature) != 0;
}

Buffer* getBufferBinding(GLenum target) {
  return instance_.bufferBinding_[getBufferSlot(target)];
}
void bindBuffer(GLenum target, Buffer* buffer) {
  int slot = getBufferSlot(target);
  if (instance_.bufferBinding_[slot] != buffer) {
    instance_.bufferBinding_[slot] = buffer;
    buffer->onBind(target);
  }
}

RenderBuffer* getRenderBufferBinding() {
  return instance_.renderBufferBinding_[0];
}
void bindRenderBuffer(RenderBuffer* renderBuffer) {
  if (instance_.renderBufferBinding_[0] != renderBuffer) {
    instance_.renderBufferBinding_[0] = renderBuffer;
    renderBuffer->onBind(GL_RENDERBUFFER);
  }
}

FrameBuffer* getFrameBufferBinding(GLenum target) {
  return instance_.frameBufferBinding_[getFrameBufferSlot(target)];
}
void bindFrameBuffer(GLenum target, FrameBuffer* frameBuffer) {
  if (target == GL_FRAMEBUFFER) {
    if (instance_.frameBufferBinding_[0] != frameBuffer || instance_.frameBufferBinding_[1] != frameBuffer) {
      instance_.frameBufferBinding_[0] = frameBuffer;
      instance_.frameBufferBinding_[1] = frameBuffer;
      frameBuffer->onBind(target);
    }
  } else {
    int slot = getFrameBufferSlot(target);
    if (instance_.frameBufferBinding_[slot] != frameBuffer) {
      instance_.frameBufferBinding_[slot] = frameBuffer;
      frameBuffer->onBind(target);
    }
  }
}

Texture* getTextureBinding(GLenum target, ui32 unit) {
  if (unit == TEXTURE_UNIT_CURRENT) {
    unit = instance_.activeTexture_;
  }
  if (unit >= instance_.maxTextureUnits_) {
    return nullptr;
  } else {
    return instance_.textureBindings_[getTextureSlot(target)][unit];
  }
}
void bindTexture(GLenum target, Texture* texture, ui32 unit) {
  if (unit == TEXTURE_UNIT_CURRENT) {
    unit = instance_.activeTexture_;
  }
  if (unit >= instance_.maxTextureUnits_) {
    return;
  }
  int slot = getTextureSlot(target);
  if (instance_.textureBindings_[slot][unit] != texture) {
    if (instance_.activeTexture_ != unit) {
      instance_.activeTexture_ = unit;
      glActiveTexture(GL_TEXTURE0 + unit);
      for (int i = 0; i < NUM_TEXTURE_SLOTS; ++i) {
        if (instance_.textureBindings_[i][unit]) {
          instance_.textureBindings_[i][unit]->onBind(getTextureTarget(i));
        }
      }
    }
    instance_.textureBindings_[slot][unit] = texture;
    texture->onBind(target);
  }
}

Program* getProgram() {
  return instance_.program_;
}
void useProgram(Program* program) {
  if (instance_.program_ != program) {
    instance_.program_ = program;
    glUseProgram(program);
  }
}

VertexArray* getVertexArrayBinding() {
  return instance_.vertexArray_;
}
void bindVertexArray(VertexArray* vertexArray) {
  if (instance_.vertexArray_ != vertexArray) {
    instance_.vertexArray_ = vertexArray;
    vertexArray->onBind();
  }
}

}
