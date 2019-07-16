// Loosely based on Oimo's DBVT
// https://github.com/lo-th/Oimo.js/blob/gh-pages/src/dev/collision/broadphase/dbvt/

import { AABB } from 'math';
import ContactSet from './contactSet';
import checkSleep from './checkSleep';

class Node {
  constructor(p, a, b) {
    this.parent = p;
    if (b) {
      this.left = a;
      this.right = b;
      this.aabb = AABB.create();
      a.parent = this;
      b.parent = this;
      this.update();
    } else {
      this.shape = a;
      this.aabb = AABB.clone(a.aabb);
      AABB.grow(this.aabb, this.aabb, 0.1);
      this.area = 0;
      this.height = 0;
    }
  }

  update() {
    const a = this.left, b = this.right;
    AABB.combine(this.aabb, a.aabb, b.aabb);
    this.area = AABB.area(this.aabb);
    this.height = Math.max(a.height, b.height) + 1;
  }
}

const tmpbox = AABB.create();

export default class BroadPhase {
  root = null;
  shapeId = 0;
  shapes = new Map();
  stack = [];

  addShape(shape) {
    const node = new Node(null, shape);
    this.shapes.set(shape, {
      id: ++this.shapeId,
      contacts: [],
      node,
    });
    this.insertLeaf(node);
    if (this.contacts) {
      this.collide(node);
    }
  }
  removeShape(shape) {
    this.removeLeaf(this.shapes.get(shape).node);
    this.shapes.delete(shape);
    for (let i = 0; i < this.contacts.length; ++i) {
      const ct = this.contacts[i];
      if (ct.shape1 === shape || ct.shape2 === shape) {
        const next = this.contacts.pop();
        if (next !== ct) this.contacts[i--] = next;
      }
    }
  }

  allowed(sh1, sh2) {
    if (!sh1.body.moves && !sh2.body.moves) return false;
    if (sh1.body === sh2.body) return false;
    if (sh1.body.parent === sh2.body || sh2.body.parent === sh1.body) return false;
    return true;
  }

  addPair(sh1, sh2) {
    if (!this.allowed(sh1, sh2)) {
      return;
    }
    let info1 = this.shapes.get(sh1), info2 = this.shapes.get(sh2), tmp;
    if (info1.id > info2.id) {
      tmp = sh1;
      sh1 = sh2;
      sh2 = tmp;
      tmp = info1;
      info1 = info2;
      info2 = tmp;
    }
    const ct1 = info1.contacts, ct2 = info2.contacts;
    if (ct1.length < ct2.length) {
      if (ct1.some(ct => ct.shape2 === sh2)) return;
    } else {
      if (ct2.some(ct => ct.shape1 === sh1)) return;
    }
    const ct = new ContactSet(sh1, sh2);
    this.contacts.push(ct);
    ct1.push(ct);
    ct2.push(ct);
  }

  run() {
    if (this.contacts) {
      this.shapes.forEach(sh => sh.contacts.length = 0);
      for (let i = 0; i < this.contacts.length; ++i) {
        const ct = this.contacts[i], sh1 = this.shapes.get(ct.shape1), sh2 = this.shapes.get(ct.shape2);
        if (sh1.node && sh2.node && AABB.intersects(sh1.node.aabb, sh2.node.aabb)) {
          sh1.contacts.push(ct);
          sh2.contacts.push(ct);
        } else {
          checkSleep(ct.body1, ct.body2);
          const next = this.contacts.pop();
          if (next != ct) this.contacts[i--] = next;
        }
      }
      this.shapes.forEach(({node}, shape) => {
        if (!AABB.contains(node.aabb, shape.aabb)) {
          this.removeLeaf(node);
          AABB.grow(node.aabb, shape.aabb, 0.1);
          this.insertLeaf(node);
          this.collide(node);
        }
      });
    } else {
      this.contacts = [];
      this.collideAll();
    }
    return this.contacts;
  }

  collide(node) {
    this.stack.push(this.root);
    while (this.stack.length) {
      const cur = this.stack.pop();
      if (cur.shape) {
        if (cur.shape !== node.shape && AABB.intersects(cur.aabb, node.aabb)) {
          this.addPair(node.shape, cur.shape);
        }
      } else {
        if (AABB.intersects(cur.aabb, node.aabb)) {
          this.stack.push(cur.left);
          this.stack.push(cur.right);
        }
      }
    }
  }

  collideAll() {
    if (!this.root) return;
    this.stack.push(this.root);
    this.stack.push(this.root);
    while (this.stack.length) {
      const a = this.stack.pop();
      const b = this.stack.pop();
      if (a.shape && b.shape) {
        if (a.shape !== b.shape && AABB.intersects(a.aabb, b.aabb)) {
          this.addPair(a.shape, b.shape);
        }
      } else {
        if (AABB.intersects(a.aabb, b.aabb)) {
          if (b.shape || !a.shape && a.area > b.area) {
            this.stack.push(a.left);
            this.stack.push(b);
            this.stack.push(a.right);
            this.stack.push(b);
          } else {
            this.stack.push(a);
            this.stack.push(b.left);
            this.stack.push(a);
            this.stack.push(b.right);
          }
        }
      }
    }
  }

  insertLeaf(leaf) {
    if (!this.root) {
      this.root = leaf;
      return;
    }
    let cur = this.root;
    while (!cur.shape) {
      let leftCost = -2 * cur.area, rightCost = leftCost;
      leftCost += AABB.area(AABB.combine(tmpbox, cur.left.aabb, leaf.aabb));
      rightCost += AABB.area(AABB.combine(tmpbox, cur.right.aabb, leaf.aabb));
      if (!cur.left.shape) {
        leftCost -= cur.left.area;
      }
      if (!cur.right.shape) {
        rightCost -= cur.right.area;
      }
      if (leftCost < rightCost) {
        if (leftCost > 0) break;
        cur = cur.left;
      } else {
        if (rightCost > 0) break;
        cur = cur.right;
      }
    }
    const parent = cur.parent;
    let node = new Node(parent, leaf, cur);
    if (cur === this.root) {
      this.root = node;
    } else if (parent.left === cur) {
      parent.left = node;
    } else {
      parent.right = node;
    }
    do {
      node = this.balance(node);
      node.update();
      node = node.parent;
    } while (node);
  }

  removeLeaf(leaf) {
    if (leaf === this.root) {
      this.root = null;
      return;
    }
    const parent = leaf.parent;
    const sibling = (parent.left === leaf ? parent.right : parent.left);
    if (parent === this.root) {
      this.root = sibling;
      sibling.parent = null;
      return;
    }
    let grandParent = parent.parent;
    sibling.parent = grandParent;
    if (grandParent.left === parent) {
      grandParent.left = sibling;
    } else {
      grandParent.right = sibling;
    }
    // delete `parent'
    do {
      grandParent = this.balance(grandParent);
      grandParent.update();
      grandParent = grandParent.parent;
    } while (grandParent);
  }

  balance(node) {
    const h = node.height;
    if (h < 2) return node;
    const l = node.left, r = node.right, p = node.parent;
    const balance = l.height - r.height;
    if (balance > 1) {
      const ll = l.left, lr = l.right;
      if (ll.height > lr.height) {
        l.right = node;
        node.parent = l;
        node.left = lr;
        lr.parent = node;
      } else {
        l.left = node;
        node.parent = l;
        node.left = ll;
        ll.parent = node;
      }
      node.update();
      l.update();
      if (p) {
        if (p.left === node) {
          p.left = l;
        } else {
          p.right = l;
        }
      } else {
        this.root = l;
      }
      l.parent = p;
      return l;
    } else if (balance < -1) {
      const rl = r.left, rr = r.right;
      if (rl.height > rr.height) {
        r.right = node;
        node.parent = r;
        node.right = rr;
        rr.parent = node;
      } else {
        r.left = node;
        node.parent = r;
        node.right = rl;
        rl.parent = node;
      }
      node.update();
      r.update();
      if (p) {
        if (p.left === node) {
          p.left = r;
        } else {
          p.right = r;
        }
      } else {
        this.root = r;
      }
      r.parent = p;
      return r;
    }
    return node;
  }
}
