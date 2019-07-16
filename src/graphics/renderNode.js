import { mat4 } from 'math';

export default class RenderNode {
  visible = true;
  children = [];
  worldMatrix = mat4.create();

  constructor(name) {
    this.name = name;
  }

  addChild(...args) {
    args.forEach(node => {
      const idx = this.children.indexOf(node);
      if (idx < 0) {
        this.children.push(node);
      }
    });
  }
  removeChild(...args) {
    args.forEach(node => {
      const idx = this.children.indexOf(node);
      if (idx >= 0) {
        this.children.splice(idx, 1);
      }
    });
  }

  resolve(worldMatrix, renderList=null, lightList=null) {
    if (!this.visible) {
      return;
    }

    //TODO: timestamp transforms to avoid full recalculation
    if (this.matrix) {
      mat4.multiply(this.worldMatrix, worldMatrix, this.matrix);
    } else if (this.translation || this.rotation || this.scale) {
      // Trying to save some calculations... maybe we should just always use the full version?
      if (this.scale) {
        if (this.translation || this.rotation) {
          mat4.fromRotationTranslationScale(this.worldMatrix, this.rotation || [0, 0, 0, 1], this.translation || [0, 0, 0], this.scale);
        } else {
          mat4.fromScaling(this.worldMatrix, this.scale);
        }
      } else if (this.rotation) {
        if (this.translation) {
          mat4.fromRotationTranslation(this.worldMatrix, this.rotation, this.translation);
        } else {
          mat4.fromQuat(this.worldMatrix, this.rotation);
        }
      } else {
        mat4.fromTranslation(this.worldMatrix, this.translation || [0, 0, 0]);
      }
      mat4.multiply(this.worldMatrix, worldMatrix, this.worldMatrix);
    } else {
      mat4.copy(this.worldMatrix, worldMatrix);
    }

    if (renderList && this.mesh) {
      //TODO: support skins
      this.mesh.primitives.forEach(primitive => {
        renderList.add(this.worldMatrix, primitive, this.morphWeights || this.mesh.morphWeights);
      });
    }
    if (lightList && this.light) {
      lightList.push(this.light);
    }

    this.children.forEach(child => child.resolve(this.worldMatrix, renderList, lightList));
  }
}
