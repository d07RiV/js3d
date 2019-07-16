#pragma once
#include "webgl.h"

namespace WebGL
{

class Buffer : public Object<Buffer> {
public:
  static Buffer* create(size_t size, const void* data = nullptr, GLenum usage = GL_STATIC_DRAW, GLenum target = GL_ARRAY_BUFFER) {
    Buffer* buffer = new Buffer;
    glCreateBuffer(buffer);
    buffer->target_ = target;
    buffer->size_ = size;
    buffer->usage_ = usage;
    WebGL::bindBuffer(target, buffer);
    glBufferData(target, size, data, usage);
    return buffer;
  }
  ~Buffer() {
    glDeleteBuffer(this);
  }

  GLenum target() const {
    return target_;
  }
  size_t size() const {
    return size_;
  }
  GLenum usage() const {
    return usage_;
  }

  void setData(size_t offset, size_t size, const void* data) {
    WebGL::bindBuffer(target_, this);
    glBufferSubData(target_, offset, size, data);
  }

  void getData(size_t offset, size_t size, void* data) {
    WebGL::bindBuffer(target_, this);
    glGetBufferSubData(target_, offset, size, data);
  }

  void copyData(Buffer* from, size_t srcOffset, size_t dstOffset, size_t size) {
    WebGL::bindBuffer(GL_COPY_READ_BUFFER, from);
    WebGL::bindBuffer(GL_COPY_WRITE_BUFFER, this);
    glCopyBufferSubData(GL_COPY_READ_BUFFER, GL_COPY_WRITE_BUFFER, srcOffset, dstOffset, size);
  }

  void onBind(GLenum target) {
    glBindBuffer(target, this);
  }

private:
  Buffer() {}
  GLenum target_;
  size_t size_;
  GLenum usage_;
};

}
