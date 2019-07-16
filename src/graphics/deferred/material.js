import { vec2, vec3 } from 'math';
import * as WebGL from '../constants';

const loadImage = url => new Promise((resolve, reject) => {
  const image = new Image();
  image.src = url;
  if (image.naturalWidth) {
    resolve(image);
  } else if (image.complete) {
    reject(image);
  } else {
    function complete() {
      if (image.naturalWidth) {
        resolve(image);
      } else {
        reject(image);
      }
      image.removeEventListener("load", complete);
      image.removeEventListener("error", complete);
    }
    image.addEventListener("load", complete);
    image.addEventListener("error", complete);
  }
});

export default class Material {
  static material_id = 0;

  constructor(renderer, diffuse, specular) {
    this.renderer = renderer;
    this.id = ++Material.material_id;
    this.texture = renderer.white;
    this.diffuse = vec3.clone(diffuse || [1.0, 1.0, 1.0]);
    this.specular = vec2.clone(specular || [0.0, 2.0]);
  }

  setTexture(url) {
    this.texture = this.renderer.white;
    if (url) {
      return loadImage(url).then(image => {
        let size = 1;
        while (size < image.width || size < image.height) size *= 2;
        let src = image;
        if (size !== image.width || size !== image.height) {
          src = document.createElement("canvas");
          src.width = size;
          src.height = size;
          src.getContext("2d").drawImage(image, 0, 0, size, size);
        }
        this.texture = new this.renderer.Texture();
        this.texture.load(src).filter(WebGL.LINEAR).wrap(WebGL.REPEAT);
      });
    }
  }
}
