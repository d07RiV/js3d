import { vec3, quat, mat4 } from 'math';

import './tetris.css';
import RoundBox from './box';

import phy from 'physics';

import DeferredRenderer from 'graphics/deferred';
import Camera from 'graphics/camera';
import RenderNode from 'graphics/renderNode';
import Mesh from 'graphics/mesh';
import * as WebGL from 'graphics/constants';

const X0 = -5, Y0 = -8, X1 = 5;
const oX0 = -20, oX1 = 20, oY0 = -10, oY1 = 12, oY2 = 20;

const eps = 0, eps1 = 1 - eps * 2;

const maxDropped = 100;

const BoardX = X0, BoardW = X1 - X0;
const BoardY = Y0, BoardH = 20;

const SlowSpeed = 2 / 1000, FastSpeed = 20 / 1000;
const difficulty = score => score / 2000 + 1;

const Colors = [
  [1,0,0],
  [0,1,0],
  [0,0,1],
  [0.5,1,0],
  [1,1,0],
  [0,1,1],
  [1,0,1],
  [0.7,0.7,0.7],
  [0, 0, 0],
];
let Materials = null;
let roundBox = null;

const GameOver = [
  " ###  ##  #   # ####      ##  #  # #### ### ",
  "#    #  # ## ## #        #  # #  # #    #  #",
  "#  # #### # # # ###      #  # #  # ###  ### ",
  "#  # #  # #   # #        #  #  # # #    #  #",
  " ##  #  # #   # ####      ##    ## #### #  #"
];

const Pieces = [
  [[0,0], [1,0], [2,0], [3,0]],
  [[0,0], [1,0], [0,1], [1,1]],
  [[0,0], [1,0], [2,0], [1,1]],
  [[0,0], [1,0], [2,0], [2,1]],
  [[0,0], [1,0], [2,0], [0,1]],
  [[1,0], [2,0], [0,1], [1,1]],
  [[0,0], [1,0], [1,1], [2,1]],
];

function rotate(coords, rot) {
  return coords.map(([x, y]) => {
    switch (rot) {
    case 0: return [x, y];
    case 1: return [y, -x - 1];
    case 2: return [-x - 1, -y - 1];
    case 3: return [-y - 1, x];
    }
  });
}
function middle(coords) {
  let x0 = 10, y0 = 10, x1 = -10, y1 = -10;
  coords.forEach(([cx, cy]) => {
    x0 = Math.min(x0, cx);
    y0 = Math.min(y0, cy);
    x1 = Math.max(x1, cx + 1);
    y1 = Math.max(y1, cy + 1);
  });
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}

function boxMesh(prim, idx) {
  return new Mesh('box', [prim.clone(Materials[idx])]);
}

function boxNode(x0, y0, z0, x1, y1, z1, mesh) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  const dx = (x1 - x0) / 2, dy = (y1 - y0) / 2, dz = (z1 - z0) / 2;
  const node = new RenderNode();
  node.matrix = mat4.fromValues(
    dx, 0, 0, 0,
    0, dy, 0, 0,
    0, 0, dz, 0,
    cx, cy, cz, 1
  );
  node.mesh = mesh;
  return node;
}

class Board {
  constructor(x0, y0, width, height, world) {
    this.x0 = x0;
    this.y0 = y0;
    this.width = width;
    this.height = height;

    this.world = world;

    this.grid = [];
    for (let i = 0; i < height; ++i) {
      this.grid[i] = [];
    }
    this.dropped = [];
    this.bodies = [];

    this.node = new RenderNode();
  }

  addBlock(x, y, color) {
    if (y >= this.height) {
      return false;
    }
    const node = new RenderNode();
    node.translation = vec3.fromValues(this.x0 + x + 0.5, this.y0 + y + 0.5, 0.5);
    node.scale = vec3.fromValues(0.5 - eps, 0.5 - eps, 0.5 - eps);
    node.mesh = boxMesh(roundBox, color);
    this.node.addChild(node);

    this.grid[y][x] = node;
    return true;
  }

  dropRows(indexes) {
    this.bodies = [];
    let prev = 0, prevCount = 0, drop = 0;
    this.dropStart = this.world.frame;
    for (let i = 0; i <= this.height; ++i) {
      if (i >= this.height || indexes.indexOf(i) >= 0) {
        if (prevCount) {
          const body = new phy.RigidBody('slice');
          vec3.set(body.position, this.x0, this.y0, 0);
          body.calculateTransform();
          body.lockAxis(vec3.posY);
          body.setMoves(true, false);
          this.world.addBody(body);
          this.bodies.push(body);
          for (let y = prev; y < i; ++y) {
            for (let x = 0; x < this.width; ++x) {
              const node = this.grid[y][x];
              if (!node) continue;

              if (drop) {
                this.grid[y][x] = null;
                this.grid[y - drop][x] = node;
              }

              const shape = new phy.shapes.Box(x + eps, y + eps, eps, eps1, eps1, eps1);
              body.addShape(shape);
              delete node.translation;
              delete node.scale;
              node.matrix = shape.transform;
            }
          }
        }

        if (i < this.height) {
          for (let j = 0; j < this.width; ++j) {
            const node = this.grid[i][j];
            if (!node) continue;

            if (this.dropped.length >= maxDropped) {
              const dp = this.dropped.shift();
              this.world.removeBody(dp.body);
              this.node.removeChild(dp.node);
            }

            const body = new phy.RigidBody('dropped');
            vec3.set(body.position, this.x0 + j, this.y0 + i, 0);
            vec3.set(body.velocity, 0, 0, Math.random() * 3 + 3);
            body.calculateTransform();
            body.addShape(new phy.shapes.Box(eps, eps, eps, eps1, eps1, eps1));
            body.shapes[0].material.friction = 0.5;
            this.world.addBody(body);

            delete node.translation;
            delete node.scale;
            node.matrix = body.shapes[0].transform;

            this.dropped.push({node, body});
                    
            this.grid[i][j] = null;
          }
          ++drop;
        }

        prev = i + 1;
        prevCount = 0;
      } else {
        for (let j = 0; j < this.width; ++j) {
          if (this.grid[i][j]) {
            ++prevCount;
          }
        }
      }
    }
  }

  stopDrop() {
    if (!this.bodies.length) {
      return;
    }
    for (let i = 0; i < this.height; ++i) {
      for (let j = 0; j < this.width; ++j) {
        const node = this.grid[i][j];
        if (!node) continue;

        delete node.matrix;
        node.translation = vec3.fromValues(this.x0 + j + 0.5, this.y0 + i + 0.5, 0.5);
        node.scale = vec3.fromValues(0.5 - eps, 0.5 - eps, 0.5 - eps);
      }
    }
    this.bodies.forEach(body => this.world.removeBody(body));
    this.bodies = [];
  }

  isDropping() {
    if (this.bodies.length && this.world.frame < this.dropStart + 50) {
      return true;
    }
    if (this.world.frame - this.dropStart > 180) {
      return false;
    }
    return this.bodies.some(b => vec3.length(b.velocity) > 0.05);
  }

  pieceFits(index, x0, y0, rot) {
    const piece = rotate(Pieces[index], rot);
    return piece.every(([x, y]) => {
      if (y0 + y < 0) {
        return false;
      }
      return !this.grid[y0 + y] || !this.grid[y0 + y][x0 + x];
    });
  }

  needsStop(index, x0, y0, y1, rot) {
    for (let y = y0; y >= y1; --y) {
      if (!this.pieceFits(index, x0, y, rot)) {
        do {
          ++y;
        } while (!this.pieceFits(index, x0, y, rot));
        return y;
      }
    }
  }

  addPiece(index, x0, y0, rot) {
    const piece = rotate(Pieces[index], rot);
    return piece.every(([x, y]) => this.addBlock(x0 + x, y0 + y, index));
  }

  fullRows() {
    const result = [];
    for (let i = 0; i < this.height; ++i) {
      let full = true;
      for (let j = 0; j < this.width; ++j) {
        if (!this.grid[i][j]) {
          full = false;
          break;
        }
      }
      if (full) {
        result.push(i);
      }
    }
    return result;
  }

  reset() {
    for (let i = 0; i < this.height; ++i) {
      this.grid[i] = [];
    }
    this.dropped.forEach(d => this.world.removeBody(d.body));
    this.node.children = [];
  }
}

class GameState {
  scene = new RenderNode();
  world = new phy.World();
  score = 0;
  gameOver = false;

  camera = new Camera({
    xfov: 100 * Math.PI / 180,
    znear: 0.5,
  }, mat4.fromValues(
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 28, 1
  ));
  
  constructor(canvas, root) {
    this.canvas = canvas;
    this.root = root;
    const renderer = this.renderer = new DeferredRenderer(canvas);
    renderer.reflection = true;

    roundBox = RoundBox(renderer);
    Materials = Colors.map(color => {
      const material = new renderer.Material().setColor(...color);
      material.metallicFactor = 0.7;
      material.roughnessFactor = 0.4;
      return material;
    });

    this.shadow = renderer.extension("OES_texture_float_linear") ? new renderer.Shadows.VSM(256, 4, true) : new renderer.Shadows.PCF(256, 1);

    phy.config.defaultMaterial.friction = 0;
    phy.config.defaultMaterial.frictionCombine = phy.config.combiners.minimum;
    vec3.set(phy.config.defaultGravity, 0, -5, 0);

    const ground = new phy.RigidBody("ground");
    ground.setMoves(false);
    this.world.addBody(ground);
    ground.addShape(new phy.shapes.Box(oX0, Y0, 0, X0 - oX0, oY1 - Y0, 1));
    ground.addShape(new phy.shapes.Box(X1, Y0, 0, oX1 - X1, oY1 - Y0, 1));
    ground.addShape(new phy.shapes.Box(oX0, oY0, 0, oX1 - oX0, Y0 - oY0, 1));
    ground.addShape(new phy.shapes.Box(oX0, oY1, 0, oX1 - oX0, oY2 - oY1, 1));
    const plane = new phy.shapes.Plane([0, 1, 0], Y0 - 1);
    plane.material.friction = 0.5;
    ground.addShape(plane);

    const wallMesh = boxMesh(renderer.primitives.Box, 7);
    this.scene.addChild(
      boxNode(oX0, oY0, -1, oX1, oY1, 0, wallMesh),
      boxNode(oX0, Y0, 0, X0, oY1, 1, wallMesh),
      boxNode(X1, Y0, 0, oX1, oY1, 1, wallMesh),
      boxNode(oX0, oY0, 0, oX1, Y0, 1, wallMesh),
      boxNode(oX0, oY0, 1, oX1, Y0 - 1, 10, wallMesh),
    );

    this.board = new Board(BoardX, BoardY, BoardW, BoardH, this.world);
    this.scene.addChild(this.board.node);

    this.offsetNode = new RenderNode();
    this.offsetNode.translation = vec3.fromValues(this.board.x0, this.board.y0, 0);
    this.scene.addChild(this.offsetNode);

    this.bigLight = new RenderNode();
    const light = this.bigLight.light = new renderer.Lights.Spot(this.bigLight.worldMatrix, [0.7, 0.7, 0.7]);
    light.shadow = this.shadow;
    light.minAngle = 60;
    light.maxAngle = 120;
    this.bigLight.translation = vec3.fromValues(0, 0, 12);
    this.bigLight.rotation = quat.create();

    document.addEventListener("keydown", this.onKeyDown, true);

    this.scoreDiv = document.createElement("div");
    this.scoreDiv.className = "score";
    root.appendChild(this.scoreDiv);
    this.scoreDiv.innerText = "Score: 0";

    const goMaterial = new renderer.Material().setColor(1, 0, 0);
    vec3.set(goMaterial.emissiveFactor, 0.4, 0, 0);
    goMaterial.metallicFactor = 0;
    goMaterial.roughnessFactor = 0;
    const goBlock = new Mesh('box', [roundBox.clone(goMaterial)]);
    const go = this.gameOverNode = new RenderNode();
    for (let y = 0; y < GameOver.length; ++y) {
      for (let x = 0; x < GameOver[y].length; ++x) {
        if (GameOver[y][x] === '#') {
          const node = new RenderNode();
          node.mesh = goBlock;
          node.translation = vec3.fromValues(x, GameOver.length - y - 1, 0);
          node.scale = vec3.fromValues(0.5 - eps, 0.5 - eps, 0.5 - eps);
          go.addChild(node);
        }
      }
    }
    go.scale = vec3.fromValues(0.25, 0.25, 0.25);
    go.translation = vec3.fromValues(-GameOver[0].length * 0.125, -GameOver.length * 0.125, 2);

    //this.gameOverDiv = document.createElement("div");
    //this.gameOverDiv.className = "gameOver";
    //root.appendChild(this.gameOverDiv);
    //this.gameOverDiv.innerText = "Game Over";
    //this.gameOverDiv.style.display = "none";
  }

  update(time) {
    let aspect = this.canvas.width / this.canvas.height;
    if (aspect < 1) {
      delete this.camera.props.yfov;
      this.camera.props.xfov = Math.PI / 4;
    } else {
      delete this.camera.props.xfov;
      this.camera.props.yfov = Math.PI / 4;
    }
    if (!this.lastTime) {
      this.lastTime = time;
    }
    const delta = time - this.lastTime;

    if (this.curPiece) {
      let { index, rotation, position: [x, y] } = this.curPiece;
      const nextY = y - (this.fastDrop ? FastSpeed : SlowSpeed * difficulty(this.score)) * delta;

      const stopY = this.board.needsStop(index, x, Math.floor(y), Math.floor(nextY), rotation);
      if (stopY != null) {
        this.offsetNode.removeChild(this.curPiece.node);
        this.curPiece = null;
        if (!this.board.addPiece(index, x, stopY, rotation)) {
          this.gameOver = true;
          this.scene.addChild(this.gameOverNode);
          //this.gameOverDiv.style.display = "block";
          vec3.set(this.bigLight.light.color, 1, 0, 0);
        } else {
          const full = this.board.fullRows();
          if (full.length) {
            this.board.dropRows(full);
            this.score += 100 * (full.length * (full.length + 1) / 2);
            this.scoreDiv.innerText = `Score: ${this.score}`;
          }
        }
      } else {
        this.curPiece.position[1] = nextY;
      }
    }
  
    if (!this.gameOver && !this.board.isDropping()) {
      this.board.stopDrop();

      if (!this.curPiece) {
        this.startPiece(Math.floor(Math.random() * 7) % 7, 0);
      }

      this.scene.removeChild(this.bigLight);
    } else {
      this.scene.addChild(this.bigLight);
    }
  
    this.world.update(time / 1000);

  
    this.renderer.render(this.camera, this.scene);

    this.lastTime = time;
  }

  onKeyDown = e => {
    if (this.curPiece) {
      if (e.key === "ArrowLeft") {
        this.movePiece(-1);
      } else if (e.key === "ArrowRight") {
        this.movePiece(1);
      } else if (e.key === "ArrowUp") {
        this.rotatePiece( 1);
      } else if (e.key === "ArrowDown") {
        this.rotatePiece(-1);
      } else if (e.key === " ") {
        this.fastDrop = true;
      }
    } else if (this.gameOver) {
      if (e.key === " ") {
        this.gameOver = false;
        this.score = 0;
        this.scoreDiv.innerText = "Score: 0";
        this.scene.removeChild(this.gameOverNode);
        //this.gameOverDiv.style.display = "none";
        vec3.set(this.bigLight.light.color, 0.7, 0.7, 0.7);
        this.board.reset();
      }
    }
  }

  adjustX(x0, index, rot) {
    const piece = rotate(Pieces[index], rot);
    let minX = piece.reduce((xm, [x]) => Math.min(xm, x), 10);
    let maxX = piece.reduce((xm, [x]) => Math.max(xm, x + 1), 0);
    if (x0 + minX < 0) {
      x0 = -minX;
    } else if (x0 + maxX > this.board.width) {
      x0 = this.board.width - maxX;
    }
    return x0;
  }

  movePiece(delta) {
    const piece = this.curPiece;
    const x = this.adjustX(piece.position[0] + delta, piece.index, piece.rotation);
    if (this.board.pieceFits(piece.index, x, Math.floor(piece.position[1]), piece.rotation)) {
      piece.position[0] = x;
    }
  }

  rotatePiece(delta) {
    const piece = this.curPiece;
    const rot = (piece.rotation + delta + 4) % 4;
    const mid = middle(rotate(Pieces[piece.index], piece.rotation));
    const mid2 = middle(rotate(Pieces[piece.index], rot));
    const bias = (rot & 1 ? 0.1 : -0.1);
    const x = this.adjustX(Math.round(piece.position[0] + mid[0] - mid2[0] + bias), piece.index, rot);
    if (this.board.pieceFits(piece.index, x, Math.floor(piece.position[1] + mid[1] - mid2[1]), rot)) {
      piece.position[0] = x;
      piece.position[1] += mid[1] - mid2[1];
      piece.rotation = rot;
      quat.identity(piece.node.rotation);
      quat.rotateZ(piece.node.rotation, piece.node.rotation, -rot * Math.PI / 2);
    }
  }

  startPiece(index, rot) {
    const mid0 = middle(rotate(Pieces[index], rot));
    const x0 = Math.round(this.board.width / 2 - mid0[0]);
    const y0 = this.board.height - mid0[1];

    const mesh = boxMesh(roundBox, index);
    const node = new RenderNode();
    node.translation = vec3.fromValues(x0, y0, 0);
    node.rotation = quat.create();
    node.children = Pieces[index].map(([x, y]) => {
      const node = new RenderNode();
      node.translation = vec3.fromValues(x + 0.5, y + 0.5, 0.5);
      node.scale = vec3.fromValues(0.5 - eps, 0.5 - eps, 0.5 - eps);
      node.mesh = mesh;
      return node;
    });
    this.offsetNode.addChild(node);

    quat.rotateZ(node.rotation, node.rotation, -rot * Math.PI / 2);
  
    const mid = middle(Pieces[index]);
  
    const lightNode = new RenderNode();
    lightNode.translation = vec3.fromValues(mid[0], mid[1], Math.max(2, 6 / difficulty(this.score)));
    node.children.push(lightNode);
    const light = new this.renderer.Lights.Spot(lightNode.worldMatrix, [0.7, 0.7, 0.7]);
    light.shadow = this.shadow;
    lightNode.light = light;
    light.maxAngle = 50;
    light.maxAngle = 140;
  
    this.fastDrop = false;
    this.curPiece = {node, position: node.translation, rotation: rot, index};
  }
}

export default function setupScene(root) {
  const canvas = document.createElement("canvas");
  root.appendChild(canvas);

  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  onResize();
  window.addEventListener("resize", onResize);  

  const game = new GameState(canvas, root);

  const update = time => {
    game.update(time);
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
