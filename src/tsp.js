import { dist } from "./geometry.js";

function primMst(vertices, weightFn) {
  const ids = vertices.map((v) => v.id);
  const inMst = new Set();
  const parent = new Map();
  const key = new Map();

  for (const id of ids) {
    key.set(id, Infinity);
  }

  key.set(ids[0], 0);

  while (inMst.size < ids.length) {
    let minId = null;
    let minKey = Infinity;

    for (const id of ids) {
      if (!inMst.has(id) && key.get(id) < minKey) {
        minKey = key.get(id);
        minId = id;
      }
    }

    if (minId === null) break;

    inMst.add(minId);

    for (const otherId of ids) {
      if (inMst.has(otherId)) continue;
      const w = weightFn(minId, otherId);
      if (w < key.get(otherId)) {
        key.set(otherId, w);
        parent.set(otherId, minId);
      }
    }
  }

  const mst = new Map();
  for (const id of ids) {
    mst.set(id, []);
  }

  for (const [child, par] of parent) {
    mst.get(par).push(child);
    mst.get(child).push(par);
  }

  return mst;
}

function dfsPreorder(mst, startId) {
  const visited = new Set();
  const order = [];

  function visit(id) {
    visited.add(id);
    order.push(id);
    for (const neighbor of mst.get(id) || []) {
      if (!visited.has(neighbor)) {
        visit(neighbor);
      }
    }
  }

  visit(startId);
  return order;
}

export function twoApproxMetricTsp(vertices) {
  if (vertices.length === 0) return [];
  if (vertices.length === 1) return [vertices[0]];

  const byId = new Map(vertices.map((v) => [v.id, v]));

  const weightFn = (a, b) => {
    const va = byId.get(a);
    const vb = byId.get(b);
    return dist(va, vb);
  };

  const mst = primMst(vertices, weightFn);
  const order = dfsPreorder(mst, vertices[0].id);

  return order.map((id) => byId.get(id));
}
