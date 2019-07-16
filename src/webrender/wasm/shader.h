#pragma once
#include "webgl.h"

namespace WebGL
{

class Shader : public Object<Shader> {
public:
  static Shader* create(GLenum type) {
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
  Shader() {}
  GLenum type_;
};

}
