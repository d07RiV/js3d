#pragma once

#include "common.h"
#include "glbindings.h"

namespace WebGL
{

template<class T>
class Object : public GLBase {
public:
  Object(const Object<T>&) = delete;
  Object(Object<T>&&) = delete;
  Object& operator=(const Object<T>&) = delete;
  Object& operator=(Object<T>&&) = delete;

  static void* operator new(size_t size) {
    return SizedAllocator<sizeof(T)>::alloc();
  }
  static void operator delete(void* ptr) {
    SizedAllocator<sizeof(T)>::free(ptr);
  }

protected:
  Object() {};
};

class Buffer;
class FrameBuffer;
class RenderBuffer;
class Texture;
class Shader;
class Program;
class VertexArray;

enum {
  FEATURE_VERTEX_ARRAY            = 0x0001,
  FEATURE_INSTANCED_RENDERING     = 0x0002,
};

int version();
bool getFeature(ui32 feature);

enum {
  TEXTURE_UNIT_CURRENT = 0xFFFFFFFFU,
};

Buffer* getBufferBinding(GLenum target);
void bindBuffer(GLenum target, Buffer* buffer);

RenderBuffer* getRenderBufferBinding();
void bindRenderBuffer(RenderBuffer* renderBuffer);

FrameBuffer* getFrameBufferBinding(GLenum target);
void bindFrameBuffer(GLenum target, FrameBuffer* frameBuffer);

Texture* getTextureBinding(GLenum target, ui32 unit = TEXTURE_UNIT_CURRENT);
void bindTexture(GLenum target, Texture* texture, ui32 unit = TEXTURE_UNIT_CURRENT);

Program* getProgram();
void useProgram(Program* program);

VertexArray* getVertexArrayBinding();
void bindVertexArray(VertexArray* vertexArray);

}
