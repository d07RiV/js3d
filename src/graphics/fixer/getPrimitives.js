import { mat4 } from 'math';

export default function getPrimitives(...nodes) {
  const results = new Set();
  const collector = {
    add(mat, prim) {
      results.add(prim);
    }
  };

  const worldMatrix = mat4.create();
  nodes.forEach(node => node.resolve(worldMatrix, collector));

  return [...results];
}
