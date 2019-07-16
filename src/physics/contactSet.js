import { vec3 } from 'math';
import Contact from './contact';
import * as collisionTable from './collision';

function flipFunc(func) {
  if (!func) return;
  return function(sh1, sh2) {
    return func.call(this, sh2, sh1);
  };
}
function _collisionFunc(type1, type2) {
  return collisionTable[type1 + type2] || flipFunc(collisionTable[type2 + type1]);
}
function collisionFunc(type1, type2) {
  const res = _collisionFunc(type1, type2);
  if (res) {
    return res;
  }
  if (type1 === "Box") {
    return collisionFunc("Hull", type2);
  }
  if (type2 === "Box") {
    return collisionFunc(type1, "Hull");
  }
}

export default class ContactSet {
  inverted = false;
  normal = vec3.fromValues(1, 0, 0);
  contacts = {};

  constructor(sh1, sh2) {
    this.shape1 = sh1;
    this.body1 = sh1.body;
    this.shape2 = sh2;
    this.body2 = sh2.body;
    this.generator = collisionFunc(sh1.type, sh2.type);
  }

  sync(sh1/*, sh2*/) {
    var inverted = (sh1 !== this.shape1);
    if (inverted !== this.inverted) {
      this.contacts = {};
      this.inverted = inverted;
    }
    if (inverted) {
      vec3.negate(this.normal, this.normal);
    }
  }

  add(pos, pen, id) {
    if (this.contacts[id]) {
      const c = this.newContacts[id] = this.contacts[id];
      vec3.copy(c.pos, pos);
      c.penetration = pen;
      vec3.copy(c.normal, this.normal);
      c.cached = true;
      c.init();
      return c;
    } else {
      return this.newContacts[id] = new Contact(this.shape1, this.shape2, pos, pen, this.normal);
    }
  }

  init() {
    if (!this.generator) {
      return;
    }
    this.newContacts = {};
    this.generator(this.shape1, this.shape2);
    this.contacts = this.newContacts;
  }

  resolve() {
    for (let id in this.contacts) {
      this.contacts[id].resolve();
    }
  }

  initPosition() {
    for (let id in this.contacts) {
      this.contacts[id].initPosition();
    }
  }
  resolvePosition() {
    for (let id in this.contacts) {
      this.contacts[id].resolvePosition();
    }
  }
}
