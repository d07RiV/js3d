#pragma once
#include "webgl.h"

namespace WebGL
{

class VertexArray : public Object<VertexArray> {
public:
  static VertexArray* create() {
    VertexArray* vertexArray = new VertexArray;
    if (WebGL::getFeature(FEATURE_VERTEX_ARRAY)) {
      glCreateVertexArray(vertexArray);
    }
    return vertexArray;
  }
  ~VertexArray() {
    if (WebGL::getFeature(FEATURE_VERTEX_ARRAY)) {
      glDeleteVertexArray(this);
    }
  }

  void setAttribute(int index, Buffer* buffer, size_t size, GLenum type, bool normalized, size_t stride = 0, size_t offset = 0, size_t divisor = 0);
  void unsetAttribute(int index);

  void setIndices(Buffer* buffer);

  void onBind();

private:
  static ui32 enabledMask_;
  VertexArray() {}
  struct Attribute {
    Buffer* buffer = nullptr;
    size_t size;
    GLenum type;
    bool normalized;
    size_t stride;
    size_t offset;
    size_t divisor;
  };
  enum {
    MAX_ATTRIBUTES = 31,
    fINDICES = 0x8000000,
  };
  ui32 dirtyFlags_ = 0;
  Attribute attributes_[MAX_ATTRIBUTES];
  Buffer* indices_ = nullptr;

  bool isCurrent_() const;
};

}
