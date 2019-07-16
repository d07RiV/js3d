#version 300 es
precision mediump float;
layout(std140, column_major) uniform;

uniform mat4 uLightMatrix;
uniform vec3 uLightDir;
uniform mat4 uModelMatrix;

layout(location=0) in vec3 position;

out float depth;

void main() {
  vec4 pos = uModelMatrix * vec4(position, 1);
  gl_Position = uLightMatrix * pos;
  depth = dot(pos.xyz, uLightDir);
}
