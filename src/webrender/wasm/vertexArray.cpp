#include "vertexArray.h"
#include "buffer.h"

namespace WebGL
{

ui32 VertexArray::enabledMask_ = 0;


void VertexArray::setAttribute(int index, Buffer* buffer, size_t size, GLenum type, bool normalized, size_t stride, size_t offset, size_t divisor) {
  Attribute& info = attributes_[index];
  bool wasEnabled = (info.buffer != nullptr);
  info.buffer = buffer;
  info.size = size;
  info.type = type;
  info.normalized = normalized;
  info.stride = stride;
  info.offset = offset;
  info.divisor = divisor;
  if (isCurrent_()) {
    if (!wasEnabled) {
      glEnableVertexAttribArray(index);
      enabledMask_ |= (1 << index);
    }
    WebGL::bindBuffer(GL_ARRAY_BUFFER, buffer);
    glVertexAttribPointer(index, size, type, normalized, stride, offset);
    if (WebGL::getFeature(FEATURE_INSTANCED_RENDERING)) {
      glVertexAttribDivisor(index, divisor);
    }
  } else {
    dirtyFlags_ |= (1 << index);
  }
}

void VertexArray::unsetAttribute(int index) {
  if (attributes_[index].buffer) {
    attributes_[index].buffer = nullptr;
    if (isCurrent_()) {
      glDisableVertexAttribArray(index);
      enabledMask_ &= ~(1 << index);
    } else {
      dirtyFlags_ |= (1 << index);
    }
  }
}

void VertexArray::setIndices(Buffer* indices) {
  if (indices_ != indices) {
    indices_ = indices;
    if (isCurrent_()) {
      WebGL::bindBuffer(GL_ELEMENT_ARRAY_BUFFER, indices);
    } else {
      dirtyFlags_ |= fINDICES;
    }
  }
}

void VertexArray::onBind() {
  bool instanced = WebGL::getFeature(FEATURE_INSTANCED_RENDERING);
  if (WebGL::getFeature(FEATURE_VERTEX_ARRAY)) {
    glBindVertexArray(this);
    if (dirtyFlags_) {
      if (dirtyFlags_ & (~fINDICES)) {
        for (int i = 0; i < MAX_ATTRIBUTES; ++i) {
          if (dirtyFlags_ & (1 << i)) {
            Attribute& info = attributes_[i];
            if (info.buffer) {
              glEnableVertexAttribArray(i);
              WebGL::bindBuffer(GL_ARRAY_BUFFER, info.buffer);
              glVertexAttribPointer(i, info.size, info.type, info.normalized, info.stride, info.offset);
              if (instanced) {
                glVertexAttribDivisor(i, info.divisor);
              }
            } else {
              glDisableVertexAttribArray(i);
            }
          }
        }
      }
      if (dirtyFlags_ & fINDICES) {
        // Can't use WebGL::bindBuffer because it doesn't correctly track VAO bindings
        glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, indices_);
      }
      dirtyFlags_ = 0;
    }
  } else {
    for (int i = 0; i < MAX_ATTRIBUTES; ++i) {
      Attribute& info = attributes_[i];
      if (info.buffer) {
        if (!(enabledMask_ & (1 << i))) {
          glEnableVertexAttribArray(i);
          enabledMask_ |= (1 << i);
        }
        WebGL::bindBuffer(GL_ARRAY_BUFFER, info.buffer);
        glVertexAttribPointer(i, info.size, info.type, info.normalized, info.stride, info.offset);
        if (instanced) {
          glVertexAttribDivisor(i, info.divisor);
        }
      } else if (enabledMask_ & (1 << i)) {
        glDisableVertexAttribArray(i);
        enabledMask_ &= ~(1 << i);
      }
      WebGL::bindBuffer(GL_ELEMENT_ARRAY_BUFFER, indices_);
    }
  }
}

bool VertexArray::isCurrent_() const {
  return WebGL::getVertexArrayBinding() == this;
}

}
