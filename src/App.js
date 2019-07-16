import React from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import { Navbar, Nav, NavItem, Glyphicon, Checkbox } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import { vec3, quat, mat4 } from 'math';
import ObjectInspector from 'react-inspector';
import fixPrimitives from 'graphics/fixer/fixPrimitives';

import './App.scss';
import * as scenes from 'scenes';
import Visualizer from 'visualizer';
import ForwardRenderer from 'graphics/forward';
import DeferredRenderer from 'graphics/deferred';
import Camera from 'graphics/camera';
import RenderNode from 'graphics/renderNode';
import GLTFLoader from './graphics/loader';
import VertexData from 'graphics/vertexData';
import VertexType from 'graphics/vertexType';
import Mesh from 'graphics/mesh';
import * as WebGL from 'graphics/constants';
import { blobToImage } from 'graphics/loader/utils';

class Inspector extends React.PureComponent {
  /*state = {}
  static getDerivedStateFromProps({frame, data}, prevState) {
    if (frame !== prevState.frame || data !== prevState.origData) {
      console.time("clone");
      const tmp = {frame, origData: data, data: deepClone(data)};
      console.timeEnd("clone");
      return tmp;
    } else {
      return null;
    }
  }*/
  render() {
    return <ObjectInspector name="Selection" data={this.props.data}/>;
  }
}

function createScene(name) {
  if (scenes[name]) {
    const scene = new scenes[name]();
    scene.world.update(performance.now() / 1000);
    return scene;
  } else {
    return null;
  }
}

class App extends React.Component {
  perfLabel = {};
  state = {
    perf: {},
    config: {
      contacts: false,
      contactNoDepth: false,
      contactVector: false,
      sleeping: false,
      deferred: true,
      fxaaQuality: 12,
      shadowType: "savsm",
    },
  };
  camYaw = Math.PI / 2;
  camPitch = 0.5;
  camDist = 16;
  renderNode = new RenderNode();

  static getDerivedStateFromProps(nextProps, prevState) {
    const scene = nextProps.match.params.scene;
    if (!prevState.scene || prevState.scene.constructor.name !== scene) {
      return {scene: createScene(scene)};
    } else {
      return null;
    }
  }

  onSelect = (obj) => {
    console.log(obj);
    this.setState({selection: obj});
  }

  componentDidMount() {
    this.onLockChange();
    document.addEventListener("pointerlockchange", this.onLockChange, false);
    document.addEventListener("mozpointerlockchange", this.onLockChange, false);
    
    this.cameraNode = new RenderNode();
    this.cameraNode.translation = vec3.fromValues(0, 5.0, 2.0);
    this.cameraFrame = new RenderNode();
    this.cameraNode.addChild(this.cameraFrame);
    this.cameraFrame.matrix = mat4.fromValues(
      -1, 0, 0, 0,
      0, 0, 1, 0,
      0, 1, 0, 0,
      0, 0, 0, 1
    );
    this.cameraRot = new RenderNode();
    this.cameraFrame.addChild(this.cameraRot);
    this.cameraRot.rotation = quat.create();
    this.camera = this.cameraRot.camera = new Camera({
      xfov: 100 * Math.PI / 180,
      znear: 0.5,
    }, this.cameraRot.worldMatrix);
    this.camera.pitch = 0;
    this.camera.yaw = 0;

    this.fwdRenderer = new ForwardRenderer(this.canvas);
    this.defRenderer = new DeferredRenderer(this.canvas);
    this.renderer = this.defRenderer;

    this.visualizer = new Visualizer(this.renderer, this.onSelect);
    this.raf = requestAnimationFrame(this.loop);

    //*
    const loader = new GLTFLoader(this.renderer, '/sponza.glb');
    loader.load().then(world => {
      this.renderer = this.defRenderer;

      const matSet = new Set();
      const forNode = n => {
        n.children.forEach(c => forNode(c));
        if (n.mesh) {
          n.mesh.primitives.forEach(p => matSet.add(p.material));
        }
      };
      forNode(world.scenes[0]);
      debugger;
      matSet.forEach(m => {
        if (m.name === "floor") {
          m.metallicFactor = 0.8;
          m.roughnessFactor = 0.8;
        }
      });

      fixPrimitives(...world.scenes);
      this.renderNode = world.scenes[0];
      this.renderNode.children.push(this.cameraNode);
      mat4.identity(this.cameraFrame.matrix);

      const matDir = mat4.fromValues(
        1, 0, 0, 0,
        0, 0, -1, 0,
        0, 1, 0, 0,
        0, 0, 0, 1
      );
      this.lightNodes = [];
      const makeLight = (x, y, z) => {
        const n0 = new RenderNode("light_0");
        const n1 = new RenderNode("light_1");
        const n2 = new RenderNode("light_2");
        const n3 = new RenderNode("light_2");
        n0.children.push(n1);
        n1.children.push(n2);
        n2.children.push(n3);
        this.renderNode.children.push(n0);
        this.lightNodes.push(n2);
        n0.translation = vec3.fromValues(x, y, z);
        n1.matrix = matDir;
        n2.rotation = quat.create();
        n3.translation = vec3.fromValues(0, 0, -300);
        const lit = new this.renderer.Lights.Spot(n3.worldMatrix, [1, 1, 1]);
        lit.shadow = new this.renderer.Shadows.PCF(1024, 2);
        lit.minAngle = 70;
        lit.maxAngle = 90;
        this.renderer.lights.push(lit);
      };
      this.renderer.lights = [];
      makeLight(-500, 1500, 0);
      makeLight(   0, 1500, 0);
      makeLight( 500, 1500, 0);
    });//*/
    /*const vtype = new VertexType({POSITION: WebGL.FLOAT, NORMAL: WebGL.FLOAT, TEXCOORD_0: WebGL.FLOAT});
    const vertices = new VertexData(8, vtype);
    const q = 1 / Math.sqrt(3);
    vertices.add({POSITION: [-1,-1,-1], NORMAL: [-q,-q,-q], TEXCOORD_0: [0, 0]});
    vertices.add({POSITION: [ 1,-1,-1], NORMAL: [ q,-q,-q], TEXCOORD_0: [1, 0]});
    vertices.add({POSITION: [-1, 1,-1], NORMAL: [-q, q,-q], TEXCOORD_0: [0, 1]});
    vertices.add({POSITION: [ 1, 1,-1], NORMAL: [ q, q,-q], TEXCOORD_0: [1, 1]});
    vertices.add({POSITION: [-1,-1, 1], NORMAL: [-q,-q, q], TEXCOORD_0: [1, 0]});
    vertices.add({POSITION: [ 1,-1, 1], NORMAL: [ q,-q, q], TEXCOORD_0: [2, 0]});
    vertices.add({POSITION: [-1, 1, 1], NORMAL: [-q, q, q], TEXCOORD_0: [1, 1]});
    vertices.add({POSITION: [ 1, 1, 1], NORMAL: [ q, q, q], TEXCOORD_0: [2, 1]});
    const prim = vertices.build(this.renderer, [
      0, 2, 3, 0, 3, 1,
      0, 4, 6, 0, 6, 2,
      0, 1, 5, 0, 5, 4,
      7, 3, 2, 7, 2, 6,
      7, 6, 4, 7, 4, 5,
      7, 5, 1, 7, 1, 3,
    ]);
    // vertices.add({POSITION: [-2, 0,-1], NORMAL: [ 0, 1, 0], TEXCOORD_0: [0, 0]});
    // vertices.add({POSITION: [ 0, 0,-1], NORMAL: [ 0, 1, 0], TEXCOORD_0: [1, 0]});
    // vertices.add({POSITION: [ 2, 0,-1], NORMAL: [ 0, 1, 0], TEXCOORD_0: [0, 0]});
    // vertices.add({POSITION: [-2, 0, 1], NORMAL: [ 0, 1, 0], TEXCOORD_0: [0, 1]});
    // vertices.add({POSITION: [ 0, 0, 1], NORMAL: [ 0, 1, 0], TEXCOORD_0: [1, 1]});
    // vertices.add({POSITION: [ 2, 0, 1], NORMAL: [ 0, 1, 0], TEXCOORD_0: [0, 1]});
    // const prim = vertices.build(this.renderer, [
    //   0, 3, 4, 0, 4, 1,
    //   1, 4, 5, 1, 5, 2,
    // ]);
    const boxNode = new RenderNode();
    boxNode.translation = vec3.fromValues(0, -50, 0);
    boxNode.scale = vec3.fromValues(10, 10, 10);
    boxNode.mesh = new Mesh("box", [prim]);
    prim.material.normalTexture = {};
    fixPrimitives(boxNode);
    //this.
    fetch('/spnza_bricks_a_ddn.png').then(r => r.blob()).then(blobToImage).then(image => {
      const tex = new this.renderer.Texture();
      tex.load(image);
      tex.generateMipmap();
      prim.material.normalTexture.texture = tex;
    });*/
  
    this.renderNode.children.push(this.cameraNode, this.visualizer.renderNode);
  }
  componentWillUnmount() {
    document.removeEventListener("pointerlockchange", this.onLockChange, false);
    document.removeEventListener("mozpointerlockchange", this.onLockChange, false);
    cancelAnimationFrame(this.raf);
  }
  keys = {};
  loop = (time) => {
    const { scene, paused, step, config } = this.state;
    if (!scene) return;
    if (!paused || step) {
      scene.update(time / 1000);
      this.setState({frame: scene.world.frame});
    }
    if (step) {
      this.setState({step: false});
    }

    this.prevTime = this.prevTime || time;
    const deltaT = 0.001 * (time - this.prevTime);
    const deltaM = deltaT * 600;
    this.prevTime = time;
    const cvel = (this.cameraVelocity = this.cameraVelocity || vec3.create());
    if (this.keys[87] || this.keys[38]) { // W
      vec3.scaleAndAdd(cvel, cvel, this.camera.dirZ, -deltaM);
    } else if (this.keys[83] || this.keys[40]) { // S
      vec3.scaleAndAdd(cvel, cvel, this.camera.dirZ, deltaM);
    } else {
      const dp = vec3.dot(cvel, this.camera.dirZ);
      vec3.scaleAndAdd(cvel, cvel, this.camera.dirZ, -Math.sign(dp) * Math.min(deltaM * 2, Math.abs(dp)));
    }
    if (this.keys[65] || this.keys[37]) { // A
      vec3.scaleAndAdd(cvel, cvel, this.camera.dirX, -deltaM);
    } else if (this.keys[68] || this.keys[39]) { // D
      vec3.scaleAndAdd(cvel, cvel, this.camera.dirX, deltaM);
    } else {
      const dp = vec3.dot(cvel, this.camera.dirX);
      vec3.scaleAndAdd(cvel, cvel, this.camera.dirX, -Math.sign(dp) * Math.min(deltaM * 2, Math.abs(dp)));
    }
    if (this.keys[32]) { // Space
      vec3.scaleAndAdd(cvel, cvel, this.camera.dirY, deltaM);
    } else if (this.keys[16]) { // Shift
      vec3.scaleAndAdd(cvel, cvel, this.camera.dirY, -deltaM);
    } else {
      const dp = vec3.dot(cvel, this.camera.dirY);
      vec3.scaleAndAdd(cvel, cvel, this.camera.dirY, -Math.sign(dp) * Math.min(deltaM * 2, Math.abs(dp)));
    }
    const cpos = this.cameraNode.translation;
    const cvlen = vec3.length(cvel);
    if (cvlen > 600.0) {
      vec3.scale(cvel, cvel, 600.0 / cvlen);
    }
    vec3.scaleAndAdd(cpos, cpos, cvel, deltaT);
    quat.fromEuler(this.cameraRot.rotation, this.camera.pitch, this.camera.yaw, 0);

    if (this.lightNodes) {
      this.lightNodes.forEach((n, i) => {
        const period = 1000 + i * 300;
        const amp = 15 - 3 * 0.2;
        const ang = Math.cos(time / period + i) * amp;
        quat.fromEuler(n.rotation, 0, ang, i * 30);
      });
    }

    this.renderer = (config.deferred ? this.defRenderer : this.fwdRenderer);
    this.visualizer.setRenderer(this.renderer);
    // if (config.deferred) {
    //   this.defRenderer.fxaa.setQuality(config.fxaaQuality);
    //   this.defRenderer.shadowType = config.shadowType;
    // }
    //this.visualizer.update(scene.world, config);
    const t0 = performance.now();
    this.renderer.render(this.camera, this.renderNode);
    const dt = performance.now() - t0;

    if (this.lastFrame != null) {
      if (this.averageFrame != null) {
        this.averageFrame = this.averageFrame * 0.9 + (time - this.lastFrame) * 0.1;
        this.averageTime = this.averageTime * 0.9 + dt * 0.1;
      } else {
        this.averageFrame = time - this.lastFrame;
        this.averageTime = dt;
      }
      if (this.fpsLabel) {
        this.fpsLabel.textContent = `FPS: ${(this.averageFrame ? 1000 / this.averageFrame : 0).toFixed(2)} | render: ${this.averageTime.toFixed(1)}ms`;
      }
    }
    this.lastFrame = time;
    Object.keys(this.perfLabel).forEach(id => {
      this.perfLabel[id].textContent = `${id}: ${(scene.world.perf[id] || 0).toFixed(2)}ms`;
    });

    this.raf = requestAnimationFrame(this.loop);
  }
  onPause = () => {
    this.setState(({paused}) => ({paused: !paused}));
  }
  onRestart = () => {
    this.setState({scene: createScene(this.props.match.params.scene)});
  }
  onStep = () => {
    this.setState({step: true});
  }
  toggleOption(name) {
    this.setState(({config}) => ({config: {...config, [name]: !config[name]}}));
  }

  onLockChange = () => {
    if (document.pointerLockElement === this.canvas || document.mozPointerLockElement === this.canvas) {
      if (!this.eventsBound) {
        this.eventsBound = true;
        //this.canvas.removeEventListener("mousemove", this.onMouseMove);
        document.addEventListener("mousemove", this.onMouseMove, false);
        document.addEventListener("keydown", this.onKeyDown, false);
        document.addEventListener("keyup", this.onKeyUp, false);
      }
    } else {
      if (this.eventsBound) {
        this.eventsBound = false;
        document.removeEventListener("mousemove", this.onMouseMove, false);
        document.removeEventListener("keydown", this.onKeyDown, false);
        document.removeEventListener("keyup", this.onKeyUp, false);
        //this.canvas.addEventListener("mousemove", this.onMouseMove);
      }
    }
  }

  onMouseDown = (e) => {
    if (e.button !== 0) {
      return;
    }
    const lock = this.canvas.requestPointerLock || this.canvas.mozRequestPointerLock;
    if (lock) lock.call(this.canvas);
  }
  onMouseMove = (e) => {
    const pos = {x: e.clientX, y: e.clientY};
    if (this.dragPos) {
      const dx = e.movementX || e.mozMovementX || 0;
      const dy = e.movementY || e.mozMovementY || 0;
      this.camera.yaw -= dx * 0.15;
      while (this.camera.yaw > 180) {
        this.camera.yaw -= 360;
      }
      while (this.camera.yaw < -180) {
        this.camera.yaw += 360;
      }
      this.camera.pitch -= dy * 0.15;
      this.camera.pitch = Math.max(this.camera.pitch, -90);
      this.camera.pitch = Math.min(this.camera.pitch, 90);
    }
    this.dragPos = pos;
  }
  onKeyDown = (e) => {
    if (e.which === 32) {
      e.preventDefault();
    }
    this.keys[e.which] = true;
  }
  onKeyUp = (e) => {
    this.keys[e.which] = false;
  }

  setFxaaQuality(value) {
    this.setState(({config}) => ({config: {...config, fxaaQuality: value}}));
  }
  setShadowType(value) {
    this.setState(({config}) => ({config: {...config, shadowType: value}}));    
  }
  render() {
    const { scene, paused, config, selection } = this.state;
    const averageFrame = this.averageFrame;
    const perf = scene && scene.world.perf;
    return (
      <div className="App">
        <Navbar fluid>
          <Nav>
            <NavItem onClick={this.onRestart}><Glyphicon glyph="repeat"/></NavItem>
            <NavItem onClick={this.onPause}><Glyphicon glyph={paused ? "play" : "pause"}/></NavItem>
            <NavItem disabled={!paused} onClick={this.onStep}><Glyphicon glyph="step-forward"/></NavItem>
          </Nav>
          <Nav>
            {Object.keys(scenes).map(name => (
              <LinkContainer key={name} to={`/${name}`}><NavItem>{scenes[name].sceneName}</NavItem></LinkContainer>
            ))}
          </Nav>
        </Navbar>
        <div className="Canvas">
          <canvas width={1280} height={720} ref={node => this.canvas = node}
            onMouseDown={this.onMouseDown}
            />
        </div>
        <div className="Config">
          {!!perf && <ul className="Perf">
            <li ref={node => this.fpsLabel = node}>FPS: {(averageFrame ? 1000 / averageFrame : 0).toFixed(2)}</li>
            {Object.keys(perf).map(id => <li key={id} ref={node => this.perfLabel[id] = node}>{id}: {perf[id].toFixed(2)}ms</li>)}
          </ul>}
          <Checkbox checked={config.contacts} onChange={() => this.toggleOption("contacts")}>Show contacts</Checkbox>
          <Checkbox className="indented" disabled={!config.contacts} checked={config.contactNoDepth} onChange={() => this.toggleOption("contactNoDepth")}>Ignore depth</Checkbox>
          <Checkbox className="indented" disabled={!config.contacts} checked={config.contactVector} onChange={() => this.toggleOption("contactVector")}>Show force</Checkbox>
          <Checkbox checked={config.sleeping} onChange={() => this.toggleOption("sleeping")}>Highlight sleeping objects</Checkbox>
          <Checkbox checked={config.deferred} onChange={() => this.toggleOption("deferred")}>Deferred renderer</Checkbox>
          {false && !!config.deferred && (
            <div className="indented">
              <select value={config.fxaaQuality} onChange={e => this.setFxaaQuality(parseInt(e.target.value))}>
                <option value="0">No FXAA</option>
                <option value="8">Crude FXAA (mattdesl/glsl-fxaa)</option>
                <option value="9">Fixed FXAA (Simon Rodriguez)</option>
                {[10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 39].map(val => (
                  <option value={val} key={val}>FXAA 3.11 Quality {val}</option>
                ))}
              </select>
            </div>
          )}
          {false && !!config.deferred && !!this.defRenderer && (
            <div className="indented">
              <select value={config.shadowType} onChange={e => this.setShadowType(e.target.value)}>
                {Object.entries(this.defRenderer.shadowTypes).map(([type, value]) => (
                  <option value={type} key={type}>{value.type}</option>
                ))}
              </select>
            </div>
          )}
          <hr/>
          <Inspector data={selection}/>
        </div>
      </div>
    );
  }
}

class Root extends React.Component {
  render() {
    return (
      <Router basename="/">
        <Switch>
          <Route path="/:scene" component={App}/>
          <Route exact path="/" render={() => <Redirect to={`/${Object.values(scenes)[0].sceneName}`}/>}/>
        </Switch>
      </Router>
    );
  }
}

export default Root;
