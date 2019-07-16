#pragma once
#include "webgl.h"

namespace WebGL
{

class RenderBuffer : public Object<RenderBuffer> {
public:
  static RenderBuffer* create(GLenum format, size_t width, size_t height, size_t samples = 1) {
    RenderBuffer* buffer = new RenderBuffer;
    glCreateRenderbuffer(buffer);
    buffer->format_ = format;
    buffer->width_ = width;
    buffer->height_ = height;
    buffer->samples_ = samples;
    WebGL::bindRenderBuffer(buffer);
    if (samples > 1) {
      glRenderbufferStorageMultisample(GL_RENDERBUFFER, samples, format, width, height);
    } else {
      glRenderbufferStorage(GL_RENDERBUFFER, format, width, height);
    }
    return buffer;
  }
  ~RenderBuffer() {
    glDeleteRenderbuffer(this);
  }

  GLenum format() const {
    return format_;
  }
  GLsizei width() const {
    return width_;
  }
  GLsizei height() const {
    return height_;
  }
  GLsizei samples() const {
    return samples_;
  }

  void onBind(GLenum target) {
    glBindRenderbuffer(target, this);
  }

private:
  RenderBuffer() {}
  GLenum format_;
  GLsizei width_;
  GLsizei height_;
  GLsizei samples_;
};

}
