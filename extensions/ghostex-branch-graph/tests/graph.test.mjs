import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutGraph } from '../src/graph.mjs';
const commit = (hash, ...parents) => ({ hash, parents });
test('merge lanes connect at every row boundary and converge on the shared ancestor', () => {
  const graph = layoutGraph([commit('merge','left','right'),commit('left','base'),commit('right','base'),commit('base')]);
  assert.equal(graph.rows[0].edges.length,2);
  assert.equal(graph.rows[1].column,0);
  assert.equal(graph.rows[2].column,1);
  for (let i=0;i<graph.rows.length-1;i++) {
    const bottom=graph.rows[i].edges.filter(e=>e.end===28).map(e=>e.to);
    const top=graph.rows[i+1].edges.filter(e=>e.start===0).map(e=>e.from);
    assert.deepEqual([...new Set(bottom)].sort(),[...new Set(top)].sort());
  }
  assert.equal(graph.rows.at(-1).edges.filter(e=>e.end===28).length,0);
});
test('octopus merges and disconnected branch tips preserve distinct lanes', () => {
  const graph=layoutGraph([commit('merge','a','b','c'),commit('other','root'),commit('a','root'),commit('b','root'),commit('c','root'),commit('root')]);
  assert.equal(graph.rows[0].edges.length,3);
  assert.equal(new Set(graph.rows[0].edges.map(e=>e.to)).size,3);
  assert.ok(graph.rows[1].column>=3);
  assert.ok(graph.rows.every(row=>row.edges.every(edge=>edge.to>=0)));
});
test('long linear history never creates extra lanes', () => {
  const graph=layoutGraph(Array.from({length:5000},(_,i)=>commit(String(i),...(i<4999?[String(i+1)]:[]))));
  assert.equal(graph.width,36);
  assert.ok(graph.rows.every(row=>row.column===0));
});
