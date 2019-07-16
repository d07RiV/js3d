import React from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import { Navbar, Nav, NavItem, Glyphicon, Checkbox } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import { vec3, quat, mat4 } from 'math';
import ObjectInspector from 'react-inspector';

import './App.scss';
import * as scenes from 'scenes';
import Visualizer from 'visualizer';
import ForwardRenderer from 'graphics/forward';
//import DeferredRenderer from 'graphics/deferred';
import Camera from 'graphics/camera';
import RenderNode from 'graphics/renderNode';
import GLTFLoader from './graphics/loader';

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

  setCamera() {
    const pd = Math.cos(this.camPitch) * this.camDist;
    const px = Math.cos(this.camYaw) * pd;
    const py = Math.sin(this.camYaw) * pd;
    const pz = Math.sin(this.camPitch) * this.camDist;
    //mat4.targetTo(this.cameraNode.matrix, [px, py, pz], [0, 0, 0], [0, 0, 1]);
    //this.camera.pos[1] -= 12;
  }

  onSelect = (obj) => {
    console.log(obj);
    this.setState({selection: obj});
  }

  componentDidMount() {
    this.cameraNode = new RenderNode();
    this.cameraNode.translation = vec3.create();
    this.cameraNode.rotation = quat.create();
    //this.cameraNode.matrix = mat4.create();
    this.camera = this.cameraNode.camera = new Camera({
      xfov: 100 * Math.PI / 180,
      znear: 0.5,
//      zfar: 40,
    }, this.cameraNode.worldMatrix);
    this.renderer = new ForwardRenderer(this.canvas);
    //this.defRenderer = new DeferredRenderer(this.canvas);
    //this.curDeferred = true;
    this.setCamera();
    this.visualizer = new Visualizer(this.renderer, this.onSelect);
    this.raf = requestAnimationFrame(this.loop);

    const loader = new GLTFLoader(this.renderer, '/sponza.glb');
    loader.load().then(world => {
      this.renderNode = world.scenes[0];
      this.renderNode.children.push(this.cameraNode);
    });

    this.renderNode.children.push(this.cameraNode, this.visualizer.renderNode);
  }
  componentWillUnmount() {
    cancelAnimationFrame(this.raf);
  }
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
    /*if (config.deferred !== this.curDeferred) {
      if (config.deferred) {
        this.visualizer.setRenderer(this.defRenderer);
      } else {
        this.visualizer.setRenderer(this.fwdRenderer);
      }
      this.curDeferred = config.deferred;
    }
    if (config.deferred) {
      this.defRenderer.fxaa.setQuality(config.fxaaQuality);
      this.defRenderer.shadowType = config.shadowType;
    }*/
    this.visualizer.update(scene.world, config);
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
  onMouseDown = (e) => {
    if (e.button === 2) {
      this.dragPos = {x: e.clientX, y: e.clientY};
      document.addEventListener("mousemove", this.onMouseMove, false);
      document.addEventListener("mouseup", this.onMouseUp, false);
    } else if (e.button === 0 && this.state.scene) {
      const cr = this.canvas.getBoundingClientRect();
      this.visualizer.onClick(this.state.scene.world, this.state.config, e.clientX - cr.left, e.clientY - cr.top);
    }
    e.preventDefault();
  }
  onMouseMove = (e) => {
    if (this.dragPos) {
      this.camYaw -= 0.003 * (e.clientX - this.dragPos.x);
      while (this.camYaw > Math.PI * 2) this.camYaw -= Math.PI * 2;
      while (this.camYaw < 0) this.camYaw += Math.PI * 2;
      this.camPitch += 0.003 * (e.clientY - this.dragPos.y);
      this.camPitch = Math.min(Math.max(this.camPitch, -Math.PI * 0.4), Math.PI * 0.4);
      this.setCamera();
      this.dragPos.x = e.clientX;
      this.dragPos.y = e.clientY;
    }
    e.preventDefault();
  }
  onMouseUp = (e) => {
    delete this.dragPos;
    e.preventDefault();
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }
  onMouseWheel = (e) => {
    this.camDist += e.deltaY * 0.01;
    this.camDist = Math.min(Math.max(this.camDist, 2), 30);
    this.setCamera();
    e.preventDefault();
  }
  onMenu = (e) => {
    e.preventDefault();
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
            onWheel={this.onMouseWheel}
            onContextMenu={this.onMenu}
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
