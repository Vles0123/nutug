(() => {
  'use strict';
  const cache = new Map();
  function positions(ids, edges) {
    const key =
      ids.join('|') +
      ':' +
      edges.map((edge) => [edge.from, edge.to, edge.type].join('/')).join('|');
    if (cache.has(key)) return cache.get(key);
    const nodes = ids.map((id) => ({ id }));
    const valid = new Set(ids);
    const links = edges
      .filter((edge) => valid.has(edge.from) && valid.has(edge.to))
      .map((edge) => ({ source: edge.from, target: edge.to }));
    const simulation = NutugForce.forceSimulation(nodes)
      .stop()
      .force(
        'links',
        NutugForce.forceLink(links)
          .id((node) => node.id)
          .distance(215)
          .strength(0.32),
      )
      .force('charge', NutugForce.forceManyBody().strength(-950))
      .force('collision', NutugForce.forceCollide(100).iterations(3))
      .force('x', NutugForce.forceX(0).strength(0.055))
      .force('y', NutugForce.forceY(0).strength(0.055));
    simulation.tick(360);
    const xs = nodes.map((node) => node.x),
      ys = nodes.map((node) => node.y);
    const left = Math.min(...xs),
      top = Math.min(...ys);
    const width = Math.max(1, Math.max(...xs) - left),
      height = Math.max(1, Math.max(...ys) - top);
    const result = Object.create(null);
    for (const node of nodes)
      result[node.id] = [
        ((node.x - left) / width - 0.5) * 1200,
        ((node.y - top) / height - 0.5) * 740,
      ];
    cache.set(key, result);
    return result;
  }
  function curve(a, b, bend = 0.08) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    return `M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2 - dy * bend} ${(a[1] + b[1]) / 2 + dx * bend} ${b[0]} ${b[1]}`;
  }
  window.NutugNetwork = { positions, curve };
})();
