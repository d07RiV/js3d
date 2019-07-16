#include "program.h"
#include "shader.h"

namespace WebGL
{

Program* Program::create(Shader* vertex, Shader* fragment) {
  Program* program = new Program;
  glCreateProgram(program);
  glAttachShader(program, vertex);
  glAttachShader(program, fragment);
  glLinkProgram(program);
  glDetachShader(program, vertex);
  glDetachShader(program, fragment);
}

Program* Program::build(char const* vertex, char const* fragment) {
  Shader* vshader = Shader::create(GL_VERTEX_SHADER);
  vshader->compile(vertex);
  Shader* fshader = Shader::create(GL_FRAGMENT_SHADER);
  fshader->compile(fragment);
  Program* program = create(vshader, fshader);
  vshader->release();
  fshader->release();
  return program;
}

}
