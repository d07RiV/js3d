#pragma once
#include "webgl.h"

namespace WebGL
{

class Program : public Object<Program> {
public:
  static Program* create(Shader* vertex, Shader* fragment);
  static Program* build(char const* vertex, char const* fragment);

  ~Program() {
    glDeleteProgram(this);
  }

  void validate() {
    glValidateProgram(this);
  }

private:
  Program() {}
};

}
