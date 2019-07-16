#pragma once
#include "webgl.h"

namespace WebGL
{

class UniformBuffer : public Object<UniformBuffer> {
public:
  static UniformBuffer* create(GLenum type) {
    Shader* shader = new Shader;
    glCreateShader(shader, type);
    shader->type_ = type;
    return shader;
  }
  ~Shader() {
    glDeleteShader(this);
  }

  void compile(char const* source) {
    glShaderSource(this, source);
    glCompileShader(this);
  }

private:
  UniformBuffer() {}
  GLenum type_;
};

class UniformBlock {
public:
  UniformBuffer* create();

private:
};

}
