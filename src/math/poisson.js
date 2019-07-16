import { vec2 } from './vector';

const _disc = [
  vec2.fromValues(-0.613392, 0.617481),
  vec2.fromValues(0.170019, -0.040254),
  vec2.fromValues(-0.299417, 0.791925),
  vec2.fromValues(0.645680, 0.493210),
  vec2.fromValues(-0.651784, 0.717887),
  vec2.fromValues(0.421003, 0.027070),
  vec2.fromValues(-0.817194, -0.271096),
  vec2.fromValues(-0.705374, -0.668203),
  vec2.fromValues(0.977050, -0.108615),
  vec2.fromValues(0.063326, 0.142369),
  vec2.fromValues(0.203528, 0.214331),
  vec2.fromValues(-0.667531, 0.326090),
  vec2.fromValues(-0.098422, -0.295755),
  vec2.fromValues(-0.885922, 0.215369),
  vec2.fromValues(0.566637, 0.605213),
  vec2.fromValues(0.039766, -0.396100),
  vec2.fromValues(0.751946, 0.453352),
  vec2.fromValues(0.078707, -0.715323),
  vec2.fromValues(-0.075838, -0.529344),
  vec2.fromValues(0.724479, -0.580798),
  vec2.fromValues(0.222999, -0.215125),
  vec2.fromValues(-0.467574, -0.405438),
  vec2.fromValues(-0.248268, -0.814753),
  vec2.fromValues(0.354411, -0.887570),
  vec2.fromValues(0.175817, 0.382366),
  vec2.fromValues(0.487472, -0.063082),
  vec2.fromValues(-0.084078, 0.898312),
  vec2.fromValues(0.488876, -0.783441),
  vec2.fromValues(0.470016, 0.217933),
  vec2.fromValues(-0.696890, -0.549791),
  vec2.fromValues(-0.149693, 0.605762),
  vec2.fromValues(0.034211, 0.979980),
  vec2.fromValues(0.503098, -0.308878),
  vec2.fromValues(-0.016205, -0.872921),
  vec2.fromValues(0.385784, -0.393902),
  vec2.fromValues(-0.146886, -0.859249),
  vec2.fromValues(0.643361, 0.164098),
  vec2.fromValues(0.634388, -0.049471),
  vec2.fromValues(-0.688894, 0.007843),
  vec2.fromValues(0.464034, -0.188818),
  vec2.fromValues(-0.440840, 0.137486),
  vec2.fromValues(0.364483, 0.511704),
  vec2.fromValues(0.034028, 0.325968),
  vec2.fromValues(0.099094, -0.308023),
  vec2.fromValues(0.693960, -0.366253),
  vec2.fromValues(0.678884, -0.204688),
  vec2.fromValues(0.001801, 0.780328),
  vec2.fromValues(0.145177, -0.898984),
  vec2.fromValues(0.062655, -0.611866),
  vec2.fromValues(0.315226, -0.604297),
  vec2.fromValues(-0.780145, 0.486251),
  vec2.fromValues(-0.371868, 0.882138),
  vec2.fromValues(0.200476, 0.494430),
  vec2.fromValues(-0.494552, -0.711051),
  vec2.fromValues(0.612476, 0.705252),
  vec2.fromValues(-0.578845, -0.768792),
  vec2.fromValues(-0.772454, -0.090976),
  vec2.fromValues(0.504440, 0.372295),
  vec2.fromValues(0.155736, 0.065157),
  vec2.fromValues(0.391522, 0.849605),
  vec2.fromValues(-0.620106, -0.328104),
  vec2.fromValues(0.789239, -0.419965),
  vec2.fromValues(-0.545396, 0.538133),
  vec2.fromValues(-0.178564, -0.596057),
];

export default function PoissonDisc(samples) {
  const ou = [];
  const dr = Math.sqrt(4 / samples);
  const nx = Math.floor(1 / dr);
  for (let x = -nx * dr; x < 1; x += dr) {
    for (let y = -nx * dr; y < 1; y += dr) {
      //if (x * x + y * y < 1) {
        ou.push(vec2.fromValues(x, y));
      //}
    }
  }
  return ou;
  return _disc;
  const output = [vec2.fromValues(0, 0)];
  const minDist = Math.sqrt(2);
  const rqueue = [output[0]];
  const grid = {[0]: output[0]};

  function randomPointAround(point) {
    const r = minDist * (1 + Math.random());
    const a = Math.random() * Math.PI * 2;
    return vec2.fromValues(point[0] + Math.cos(a) * r, point[1] + Math.sin(a) * r);
  }
  function addPoint(point) {
    grid[Math.floor(point[0]) + Math.floor(point[1]) * 65536] = point;
  }
  function checkPoint(point) {
    const x0 = Math.floor(point[0]), y0 = Math.floor(point[1]);
    for (let x = x0 - 2; x <= x0 + 2; ++x) {
      for (let y = y0 - 2; y <= y0 + 2; ++y) {
        const p = grid[x + y * 65536];
        if (p && vec2.squaredDistance(point, p) < 2) {
          return false;
        }
      }
    }
    return true;
  }

  let maxDist = 0;
  while (rqueue.length && output.length < samples) {
    const pindex = Math.floor(Math.random() * rqueue.length);
    const point = rqueue.splice(pindex, 1)[0];
    for (let i = 0; i < 30 && output.length < samples; ++i) {
      const p = randomPointAround(point);
      if (checkPoint(p)) {
        output.push(p);
        rqueue.push(p);
        addPoint(p);
        maxDist = Math.max(maxDist, vec2.squaredLength(p));
      }
    }
  }
  maxDist = 1 / Math.sqrt(maxDist);
  output.forEach(p => vec2.scale(p, p, maxDist));
  return output;
}
