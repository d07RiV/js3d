layout(location=0) in vec2 a_Position;
uniform vec4 u_InvProj;
uniform vec4 u_Transform;
out vec2 v_Position;
void main() {
  vec2 pos = a_Position * u_Transform.xy + u_Transform.zw;
  gl_Position = vec4(pos, 0.0, 1.0);
  v_Position = pos * u_InvProj.xy;
}
