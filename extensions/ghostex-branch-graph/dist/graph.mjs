export const ROW_HEIGHT = 28;
export const LANE_WIDTH = 14;
export const COLORS = ['#60a5fa', '#c084fc', '#f5b94c', '#46c5b7', '#f277a4', '#a3c96c', '#f28c66', '#8e9cff'];

// A lane tracks the next ancestor expected on that line. Topological Git order
// guarantees every child appears before its parents, including octopus merges.
export function layoutGraph(commits) {
  let lanes = [], colorIndex = 0, maxLanes = 1;
  const rows = commits.map(commit => {
    const before = lanes.map(lane => ({ ...lane }));
    let column = lanes.findIndex(lane => lane.hash === commit.hash);
    const incoming = column >= 0;
    if (!incoming) {
      column = lanes.length;
      lanes.push({ hash: commit.hash, color: COLORS[colorIndex++ % COLORS.length] });
    }
    const color = lanes[column].color;
    const after = lanes.filter((_, index) => index !== column);
    let insertion = Math.min(column, after.length);
    for (const [index, hash] of commit.parents.entries()) {
      if (after.some(lane => lane.hash === hash)) continue;
      after.splice(insertion++, 0, { hash, color: index === 0 ? color : COLORS[colorIndex++ % COLORS.length] });
    }
    const edges = [];
    before.forEach((lane, from) => {
      if (lane.hash === commit.hash) edges.push({ from, to: column, start: 0, end: 14, color: lane.color });
      else {
        const to = after.findIndex(next => next.hash === lane.hash);
        if (to >= 0) edges.push({ from, to, start: 0, end: ROW_HEIGHT, color: lane.color });
      }
    });
    for (const hash of commit.parents) {
      const to = after.findIndex(lane => lane.hash === hash);
      edges.push({ from: column, to, start: 14, end: ROW_HEIGHT, color: hash === commit.parents[0] ? color : after[to].color });
    }
    maxLanes = Math.max(maxLanes, before.length, after.length, column + 1);
    lanes = after;
    return { commit, column, color, edges, incoming };
  });
  return { rows, width: Math.max(36, maxLanes * LANE_WIDTH + 16) };
}

export function edgePath(edge) {
  const x1 = 13 + edge.from * LANE_WIDTH, x2 = 13 + edge.to * LANE_WIDTH;
  const { start, end } = edge;
  if (x1 === x2) return `M${x1},${start}V${end}`;
  const middle = (start + end) / 2;
  return `M${x1},${start}C${x1},${middle} ${x2},${middle} ${x2},${end}`;
}
