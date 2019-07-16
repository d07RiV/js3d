import dedent from 'dedent';
import ShadowTechnique from './shadow';

export default class NoShadow extends ShadowTechnique {
  shadowFunc = dedent`{
    return 1.0;
  }`;

  constructor(renderer, name) {
    super(renderer, name);
    this.resolution = 1024;
    this.padding = 4;
  }
}
