#version 300 es
precision mediump float;
layout(std140, column_major) uniform;

uniform Matrices {
  mat4 uMVPMatrix;
  mat3 uNormalMatrix;
};

layout(location=0) in vec3 position;
layout(location=1) in vec4 normal;
layout(location=2) in vec2 texcoord;

out vec3 vNormal;
out vec2 vTex;

void main() {
  gl_Position = uMVPMatrix * vec4(position, 1);
  vNormal = uNormalMatrix * normal.xyz;
  vTex = texcoord;
}
