function edgeKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export default class Graph {
  constructor() {
    this.vertices = new Map();
    this.edges = new Map();
    this.nextVertexId = 0;
    this.anchorIds = new Set();
  }

  addVertex(x, y, { anchor = false, id = null } = {}) {
    const vertexId = id ?? this.nextVertexId++;
    const vertex = { id: vertexId, x, y };
    this.vertices.set(vertexId, vertex);
    if (anchor) {
      this.anchorIds.add(vertexId);
    }
    if (id === null || id >= this.nextVertexId) {
      this.nextVertexId = Math.max(this.nextVertexId, vertexId + 1);
    }
    return vertex;
  }

  addEdge(v1, v2) {
    const id1 = typeof v1 === "object" ? v1.id : v1;
    const id2 = typeof v2 === "object" ? v2.id : v2;
    if (id1 === id2) return null;
    const key = edgeKey(id1, id2);
    if (this.edges.has(key)) return this.edges.get(key);
    const edge = { id: key, source: id1, target: id2 };
    this.edges.set(key, edge);
    return edge;
  }

  removeEdge(edge) {
    if (!edge) return;
    this.edges.delete(edge.id);
  }

  getVertex(id) {
    return this.vertices.get(id);
  }

  vertexSet() {
    return [...this.vertices.values()];
  }

  edgeSet() {
    return [...this.edges.values()];
  }

  edgesOf(vertex) {
    const id = typeof vertex === "object" ? vertex.id : vertex;
    return this.edgeSet().filter((e) => e.source === id || e.target === id);
  }

  getEdgeSource(edge) {
    return this.vertices.get(edge.source);
  }

  getEdgeTarget(edge) {
    return this.vertices.get(edge.target);
  }

  getOppositeVertex(edge, vertex) {
    const id = typeof vertex === "object" ? vertex.id : vertex;
    return id === edge.source
      ? this.vertices.get(edge.target)
      : this.vertices.get(edge.source);
  }

  rebuildWithNewPositions(oldToNew) {
    const newGraph = new Graph();
    newGraph.nextVertexId = this.nextVertexId;
    newGraph.anchorIds = new Set(this.anchorIds);

    for (const [, newVertex] of oldToNew) {
      newGraph.vertices.set(newVertex.id, { ...newVertex });
      if (this.anchorIds.has(newVertex.id)) {
        newGraph.anchorIds.add(newVertex.id);
      }
    }

    const seen = new Set();
    for (const edge of this.edgeSet()) {
      const oldSource = this.vertices.get(edge.source);
      const oldTarget = this.vertices.get(edge.target);
      const newSource = oldToNew.get(oldSource.id);
      const newTarget = oldToNew.get(oldTarget.id);
      const key = edgeKey(newSource.id, newTarget.id);
      if (!seen.has(key)) {
        seen.add(key);
        newGraph.addEdge(newSource, newTarget);
      }
    }

    return newGraph;
  }
}
