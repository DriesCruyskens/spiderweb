import * as datNs from "dat-gui";
import * as fileSaverNs from "file-saver";
import * as paperNs from "paper";
import seedrandom from "seedrandom";
import Graph from "./Graph.js";
import {
  add,
  fromAngle,
  heading,
  lineLine,
  mag,
  normalize,
  setMag,
  sub,
} from "./geometry.js";
import { twoApproxMetricTsp } from "./tsp.js";
import { readParamsFromUrl, writeParamsToUrl } from "./urlState.js";

const dat = datNs.default;
const paper = paperNs.default;
const saveAs = fileSaverNs.default;

const MARGIN = 0.08;
const WEB_COLOR = "#b1ede8";
const DEBUG_COLOR = "#ff0000";
const BACKGROUND = "#071013";

export default class WebSketch {
  constructor(canvasId) {
    this.params = readParamsFromUrl();
    if (!window.location.search.includes("seed=")) {
      this.params.seed = Math.floor(Math.random() * 1000000);
    }

    this.canvas = document.getElementById(canvasId);
    paper.setup(this.canvas);

    this.graph = null;
    this.candidate = null;
    this.intersections = [];
    this.hamiltonian = null;
    this.growBatches = this.params.growBatches || 0;
    this.exporting = false;

    this.initRng();
    this.initGui();
    this.initKeyboard();

    paper.view.on("resize", () => this.draw());

    const savedBatches = this.params.growBatches || 0;
    this.reset(false);
    if (savedBatches > 0) {
      for (let i = 0; i < savedBatches; i++) {
        this.grow(false);
      }
      this.growBatches = savedBatches;
      this.params.growBatches = savedBatches;
    }
    this.syncUrl();
  }

  initRng() {
    this.rng = seedrandom(String(this.params.seed));
  }

  random(min, max) {
    if (arguments.length === 0) {
      return this.rng();
    }
    if (arguments.length === 1) {
      return this.rng() * min;
    }
    return this.rng() * (max - min) + min;
  }

  randomInt(exclusiveMax) {
    if (exclusiveMax <= 0) return 0;
    return Math.floor(this.rng() * exclusiveMax);
  }

  get viewWidth() {
    return paper.view.bounds.width;
  }

  get viewHeight() {
    return paper.view.bounds.height;
  }

  toPixel(nx, ny) {
    return { x: nx * this.viewWidth, y: ny * this.viewHeight };
  }

  toNormalized(px, py) {
    return { x: px / this.viewWidth, y: py / this.viewHeight };
  }

  vertexToPixel(v) {
    return this.toPixel(v.x, v.y);
  }

  reset(updateUrl = true) {
    this.initRng();
    this.graph = this.generateGraph();
    this.intersections = [];
    this.hamiltonian = null;
    this.growBatches = 0;
    this.params.growBatches = 0;
    this.generateEdge();
    this.draw();
    if (updateUrl) this.syncUrl();
  }

  grow(updateUrl = true) {
    for (let i = 0; i < this.params.growSteps; i++) {
      this.generateEdge();
    }
    for (let j = 0; j < this.params.relaxSteps; j++) {
      this.applyForce();
    }
    this.growBatches += 1;
    this.params.growBatches = this.growBatches;
    this.draw();
    if (updateUrl) this.syncUrl();
  }

  generateGraph() {
    const g = new Graph();
    const m = MARGIN;
    const corners = [
      g.addVertex(m, m, { anchor: true }),
      g.addVertex(1 - m, m, { anchor: true }),
      g.addVertex(1 - m, 1 - m, { anchor: true }),
      g.addVertex(m, 1 - m, { anchor: true }),
    ];

    g.addEdge(corners[0], corners[1]);
    g.addEdge(corners[1], corners[2]);
    g.addEdge(corners[2], corners[3]);
    g.addEdge(corners[3], corners[0]);

    return g;
  }

  generateCandidate() {
    const w = this.viewWidth;
    const h = this.viewHeight;
    const angle = this.random(Math.PI * 2);

    let p = setMag(fromAngle(angle), w + h);
    p = add(p, { x: w, y: h });
    let op = { x: -p.x + w, y: -p.y + h };

    const center = { x: w, y: h };
    const rAngle = heading(sub(p, center)) - Math.PI / 2;
    const perp = setMag(fromAngle(rAngle), this.random(0, (w + h) / 4));
    p = add(p, perp);
    op = add(op, perp);

    this.candidate = [p, op];
    return this.candidate;
  }

  generateEdge() {
    const candidate = this.generateCandidate();
    const hits = [];

    for (const edge of this.graph.edgeSet()) {
      const p1 = this.vertexToPixel(this.graph.getEdgeSource(edge));
      const p2 = this.vertexToPixel(this.graph.getEdgeTarget(edge));
      const intersect = lineLine([p1, p2], candidate);
      if (intersect) {
        const norm = this.toNormalized(intersect.x, intersect.y);
        hits.push({
          x: norm.x,
          y: norm.y,
          edge,
          t: intersect.t,
        });
      }
    }

    hits.sort((a, b) => a.t - b.t);
    this.intersections = hits;

    if (this.intersections.length < 2) return;

    const r = this.randomInt(this.intersections.length - 1);
    const i1Data = this.intersections[r];
    const i2Data = this.intersections[r + 1];

    const i1 = this.graph.addVertex(i1Data.x, i1Data.y);
    const i2 = this.graph.addVertex(i2Data.x, i2Data.y);
    this.graph.addEdge(i1, i2);

    const e1 = i1Data.edge;
    const e2 = i2Data.edge;
    this.graph.removeEdge(e1);
    this.graph.removeEdge(e2);

    let p1 = this.graph.getEdgeSource(e1);
    let p2 = this.graph.getEdgeTarget(e1);
    this.graph.addEdge(p1, i1);
    this.graph.addEdge(p2, i1);

    p1 = this.graph.getEdgeSource(e2);
    p2 = this.graph.getEdgeTarget(e2);
    this.graph.addEdge(p1, i2);
    this.graph.addEdge(p2, i2);

    if (this.params.drawHamiltonian) {
      this.hamiltonianPath();
    }
  }

  applyForce() {
    const thresh = this.params.edgeLengthThresh;
    const multiplier = this.params.forceMultiplier;
    const oldToNew = new Map();

    for (const v of this.graph.vertexSet()) {
      if (this.graph.anchorIds.has(v.id)) {
        oldToNew.set(v.id, { id: v.id, x: v.x, y: v.y });
        continue;
      }

      const vp = this.vertexToPixel(v);
      const vectors = [];

      for (const edge of this.graph.edgesOf(v)) {
        const opposite = this.graph.getOppositeVertex(edge, v);
        const op = this.vertexToPixel(opposite);
        const direction = sub(op, vp);
        if (mag(direction) > thresh) {
          vectors.push(normalize(direction));
        }
      }

      let sum = { x: 0, y: 0 };
      if (vectors.length > 0) {
        sum = { ...vectors[0] };
        for (let j = 1; j < vectors.length; j++) {
          sum = add(sum, vectors[j]);
        }
      }

      sum = { x: sum.x * multiplier, y: sum.y * multiplier };
      const newPixel = add(vp, sum);
      const newNorm = this.toNormalized(newPixel.x, newPixel.y);
      const newId = this.graph.nextVertexId++;
      oldToNew.set(v.id, { id: newId, x: newNorm.x, y: newNorm.y });
    }

    this.graph = this.graph.rebuildWithNewPositions(oldToNew);

    if (this.params.drawHamiltonian) {
      this.hamiltonianPath();
    }
  }

  hamiltonianPath() {
    const pixelVertices = this.graph.vertexSet().map((v) => {
      const p = this.vertexToPixel(v);
      return { id: v.id, x: p.x, y: p.y };
    });
    this.hamiltonian = twoApproxMetricTsp(pixelVertices);
  }

  draw() {
    paper.project.clear();
    paper.view.draw();

    const bg = new paper.Path.Rectangle(paper.view.bounds);
    bg.fillColor = BACKGROUND;
    bg.sendToBack();

    const strokeWidth = 2;

    for (const edge of this.graph.edgeSet()) {
      const p1 = this.vertexToPixel(this.graph.getEdgeSource(edge));
      const p2 = this.vertexToPixel(this.graph.getEdgeTarget(edge));
      const path = new paper.Path.Line(
        new paper.Point(p1.x, p1.y),
        new paper.Point(p2.x, p2.y)
      );
      path.strokeColor = WEB_COLOR;
      path.strokeWidth = strokeWidth;
      path.strokeCap = "round";
      path.strokeJoin = "round";
    }

    const showDebug = this.params.showDebug && !this.exporting;

    if (showDebug && this.candidate) {
      const c0 = this.candidate[0];
      const c1 = this.candidate[1];
      const debugLine = new paper.Path.Line(
        new paper.Point(c0.x, c0.y),
        new paper.Point(c1.x, c1.y)
      );
      debugLine.strokeColor = DEBUG_COLOR;
      debugLine.strokeWidth = 1;

      for (const point of this.intersections) {
        const p = this.vertexToPixel(point);
        const dot = new paper.Path.Circle(new paper.Point(p.x, p.y), 5);
        dot.fillColor = DEBUG_COLOR;
        dot.strokeColor = DEBUG_COLOR;
      }
    }

    if (this.params.drawHamiltonian && this.hamiltonian) {
      const path = new paper.Path();
      for (const p of this.hamiltonian) {
        path.add(new paper.Point(p.x, p.y));
      }
      path.strokeColor = WEB_COLOR;
      path.strokeWidth = strokeWidth;
      path.smooth();
    }

    paper.view.draw();
  }

  randomizeSeed() {
    this.params.seed = Math.floor(Math.random() * 1000000);
    this.reset();
  }

  exportSVG() {
    this.exporting = true;
    this.draw();

    const svg = paper.project.exportSVG({ asString: true });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    saveAs(blob, "spiderweb" + JSON.stringify(this.params) + ".svg");

    this.exporting = false;
    this.draw();
  }

  syncUrl() {
    writeParamsToUrl(this.params);
  }

  onParamChange(key, value, { redraw = true, reset = false } = {}) {
    this.params[key] = value;
    if (reset) {
      this.reset();
      return;
    }
    if (key === "drawHamiltonian" && value) {
      this.hamiltonianPath();
    }
    if (redraw) {
      this.draw();
    }
    this.syncUrl();
  }

  initGui() {
    this.gui = new dat.GUI();

    const actions = this.gui.addFolder("Actions");
    actions.add({ reset: () => this.reset() }, "reset");
    actions.add({ grow: () => this.grow() }, "grow");
    actions.add({ exportSVG: () => this.exportSVG() }, "exportSVG").name(
      "Export SVG"
    );
    actions.add({ randomizeSeed: () => this.randomizeSeed() }, "randomizeSeed").name(
      "Randomize seed"
    );
    actions.open();

    const physics = this.gui.addFolder("Physics");
    physics
      .add(this.params, "forceMultiplier", 0, 2)
      .listen()
      .onChange((value) => {
        this.onParamChange("forceMultiplier", value);
      });
    physics
      .add(this.params, "edgeLengthThresh", 0, 1000)
      .listen()
      .onChange((value) => {
        this.onParamChange("edgeLengthThresh", value);
      });
    physics.open();

    const growth = this.gui.addFolder("Growth");
    growth
      .add(this.params, "growSteps", 1, 100)
      .step(1)
      .listen()
      .onChange((value) => {
        this.onParamChange("growSteps", value);
      });
    growth
      .add(this.params, "relaxSteps", 1, 100)
      .step(1)
      .listen()
      .onChange((value) => {
        this.onParamChange("relaxSteps", value);
      });
    growth.open();

    const display = this.gui.addFolder("Display");
    display
      .add(this.params, "showDebug")
      .listen()
      .onChange((value) => {
        this.onParamChange("showDebug", value);
      });
    display
      .add(this.params, "drawHamiltonian")
      .listen()
      .onChange((value) => {
        this.onParamChange("drawHamiltonian", value);
      });
    display.open();

    const seedFolder = this.gui.addFolder("Seed");
    seedFolder
      .add(this.params, "seed", 0, 1000000)
      .step(1)
      .listen()
      .onChange((value) => {
        this.onParamChange("seed", value, { reset: true });
      });
    seedFolder.open();
  }

  initKeyboard() {
    window.addEventListener("keydown", (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        this.reset();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        this.grow();
      } else if (event.key === "s" || event.key === "S") {
        this.exportSVG();
      }
    });
  }
}
