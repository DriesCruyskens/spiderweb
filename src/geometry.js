// www.jeffreythompson.org/collision-detection/line-line.php

export function lineLine(e1, e2) {
  const x1 = e1[0].x;
  const y1 = e1[0].y;
  const x2 = e1[1].x;
  const y2 = e1[1].y;
  const x3 = e2[0].x;
  const y3 = e2[0].y;
  const x4 = e2[1].x;
  const y4 = e2[1].y;

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return null;

  const uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
    return {
      x: x1 + uA * (x2 - x1),
      y: y1 + uA * (y2 - y1),
      t: uB,
    };
  }

  return null;
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function mag(v) {
  return Math.hypot(v.x, v.y);
}

export function normalize(v) {
  const m = mag(v);
  if (m === 0) return { x: 0, y: 0 };
  return { x: v.x / m, y: v.y / m };
}

export function fromAngle(angle) {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function setMag(v, length) {
  const m = mag(v);
  if (m === 0) return { x: 0, y: 0 };
  const scale = length / m;
  return { x: v.x * scale, y: v.y * scale };
}

export function heading(v) {
  return Math.atan2(v.y, v.x);
}

export function sortIntersectionsAlongLine(intersections, candidate) {
  const ax = candidate[0].x;
  const ay = candidate[0].y;
  const bx = candidate[1].x;
  const by = candidate[1].y;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  return [...intersections].sort((a, b) => {
    const ta = lenSq === 0 ? 0 : ((a.x - ax) * dx + (a.y - ay) * dy) / lenSq;
    const tb = lenSq === 0 ? 0 : ((b.x - ax) * dx + (b.y - ay) * dy) / lenSq;
    return ta - tb;
  });
}

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
