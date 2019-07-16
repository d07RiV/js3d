import * as shapeObjects from './shapes';
import ContactObject from './contact';
import renderConstraint from './constraints';

import RenderNode from 'graphics/renderNode';

import { mat4, vec3 } from 'math';

export default class Visualizer {
  renderNode = new RenderNode("world");

  constructor(renderer, onSelect) {
    this.onSelect = onSelect;
    this.setRenderer(renderer);
  }

  addLight(node, dir, color) {
    const nd = new RenderNode();
    node.children.push(nd);
    nd.matrix = mat4.create();
    let dv = nd.matrix.subarray(8, 11);
    vec3.negate(dv, dir);
    vec3.makeBasis(dv, nd.matrix.subarray(0, 3), nd.matrix.subarray(4, 7));
    const lt = new this.renderer.Lights.Spot(nd.worldMatrix, color);
//    lt.shadow = new this.renderer.Shadows.PCF(256, 1);
    lt.shadow = this.renderer.shadowTypes.vsm;
    lt.node = nd;
    this.renderer.lights.push(lt);
  }

  addLight2(node, color) {
    const lt = new this.renderer.Lights.Point(node.worldMatrix, color);
    lt.shadow = new this.renderer.Shadows.PCF(256, 1);
    lt.node = node;
    this.renderer.lights.push(lt);
  }

  setRenderer(renderer) {
    if (this.renderer === renderer) {
      return;
    }
    this.renderer = renderer;
    this.cache = new WeakMap();
    this.material = new renderer.Material().setColor(0.7, 0.7, 0.7);
    this.material.metallicFactor = 0.7;
    this.material.roughnessFactor = 0.4;
    //this.material.setEmissive(0.3, 0.3, 0.3);
    this.sleepMaterial = new renderer.Material().setColor(0.5, 0.5, 1.0);
    this.selectMaterial = new renderer.Material().setColor(0.5, 1.0, 0.5);
    this.selectSecondaryMaterial = new renderer.Material().setColor(0.6, 0.85, 0.6);
    this.selectTertiaryMaterial = new renderer.Material().setColor(0.55, 0.775, 0.55);
    this.contactMaterial = new renderer.Material().setColor(1.0, 0.5, 0.5);
  }

  onClick(world, config, x, y) {
    const ray = this.renderer.pickRay(x, y);
    this.picked = null;
    if (config.contacts && world.contacts) world.contacts.forEach(cts => Object.values(cts.contacts).forEach(ct => {
      if (ray.distance(ct.pos) < 0.04) {
        const dist = ray.along(ct.pos) - 0.04;
        if (!this.picked || this.picked.dist > dist) {
          this.picked = {dist, contact: ct};
        }
      }
    }));
    if (!this.picked || !config.contactNoDepth) {
      world.bodies.forEach(body => body.shapes.forEach(shape => {
        const dist = shape.intersect(ray);
        if (dist !== false && (!this.picked || this.picked.dist > dist)) {
          this.picked = {dist, shape};
        }
      }));
    }
    this.onSelect(this.picked && (this.picked.shape || this.picked.contact));
  }
  deselect() {
    this.picked = null;
    this.onSelect(null);
  }

  update(world, config) {
    const nodes = this.renderNode.children;
    nodes.length = 0;

    let foundPicked = false;
    world.bodies.forEach(body => {
      let node = this.cache.get(body);
      if (!node) {
        this.cache.set(body, node = new RenderNode(body.name));
        node.matrix = body.transform;

        if (body.shapes.find(s => s.constructor.type === "Sphere")) {
          this.renderer.lights = [];
          this.addLight2(node, [ 1,  1,  1]);
          /*this.addLight(node, [ 1,  0,  0], [ 1,  0,  0]);
          this.addLight(node, [-1,  0,  0], [ 0,  1,  1]);
          this.addLight(node, [ 0,  1,  0], [ 0,  1,  0]);
          this.addLight(node, [ 0, -1,  0], [ 1,  0,  1]);
          this.addLight(node, [ 0,  0,  1], [ 0,  0,  1]);
          this.addLight(node, [ 0,  0, -1], [ 1,  1,  0]);*/
        }
        node.bkChildren = node.children;
      }
      nodes.push(node);
      node.children = [...node.bkChildren];
      //if (node.children.length) return;
      body.shapes.forEach(shape => {
        let obj = this.cache.get(shape);
        if (!obj && shapeObjects[shape.type]) {
          this.cache.set(shape, obj = new shapeObjects[shape.type](this.renderer, shape));
        }
        if (obj) {
          if (this.picked && shape === this.picked.shape) {
            foundPicked = true;
            obj.material = this.selectMaterial;
          } else if (this.picked && this.picked.contact && (this.picked.contact.shape1 === shape || this.picked.contact.shape2 === shape)) {
            obj.material = this.selectSecondaryMaterial;
          } else if (config.sleeping && body.sleeping) {
            obj.material = this.sleepMaterial;
          } else {
            obj.material = this.material;
          }
          node.children.push(obj);
        }
      });
    });
    if (config.contacts && world.contacts) world.contacts.forEach(cts => Object.values(cts.contacts).forEach(ct => {
      let obj = this.cache.get(ct);
      if (!obj) {
        this.cache.set(ct, obj = new ContactObject(this.renderer, ct));
      }
      if (obj.update(config) !== false) {
        if (this.picked && ct === this.picked.contact) {
          foundPicked = true;
          obj.material = this.selectMaterial;
        } else if (this.picked && (ct.shape1 === this.picked.shape || ct.shape2 === this.picked.shape)) {
          obj.material = this.selectSecondaryMaterial;
        } else {
          obj.material = this.contactMaterial;
        }
        nodes.push(obj);
      }
    }));
    world.constraints.forEach(ct => {
      let obj = this.cache.get(ct);
      if (!obj) {
        obj = renderConstraint(this.renderer, ct);
        if (obj) {
          this.cache.set(ct, obj);
        }
      }
      if (obj && obj.update() !== false) {
        nodes.push(obj);
      }
    })
    if (this.picked && !foundPicked) {
      this.picked = null;
      this.onSelect(null);
    }
  }
}
