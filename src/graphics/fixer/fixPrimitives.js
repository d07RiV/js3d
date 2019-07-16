import { mat4 } from 'math';
import ArrayModifier from './arrayModifier';
//import verifyArray from './verifyArray';

function getPrimitives(...nodes) {
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

export default function fixPrimitives(...nodes) {
  const primitives = getPrimitives(...nodes);

  const vaMap = new Map();
  primitives.forEach(p => {
    if (vaMap.has(p.vertexArray)) {
      vaMap.get(p.vertexArray).push(p);
    } else {
      vaMap.set(p.vertexArray, [p]);
    }
  });
  vaMap.forEach((primitives, array) => {
    if (array.attributes.includes("NORMAL") && array.attributes.includes("TANGENT")) {
      // Everything is already in place!
      return;
    }

    const modifier = new ArrayModifier(array, primitives);
    if (modifier.noNormals) {
      modifier.buildNormals();
    }
    if (modifier.noTangents) {
      modifier.buildTangents();
    }
    modifier.apply();

    //verifyArray(array, primitives);
  });
}
