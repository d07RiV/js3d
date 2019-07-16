import phy from 'physics';
import PointObject from './point.js';

export default function renderConstraint(renderer, constraint, material) {
  if (constraint instanceof phy.constraints.Point) {
    return new PointObject(renderer, constraint, material);
  } else {
    return null;
  }
}
