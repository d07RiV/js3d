#version 300 es
precision mediump float;
layout(std140, column_major) uniform;

layout(location=0) in vec3 position;

uniform mat4 uMVPMatrix;
uniform vec4 uInvProj;

out vec2 pos2d;

void main() {
  gl_Position = uMVPMatrix * vec4(position, 1.0);
  pos2d = gl_Position.xy * uInvProj.xy / gl_Position.w;
}
