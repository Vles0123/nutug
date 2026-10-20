export const edgeKey = (edge) => (edge ? edge.id || `${edge.type}:${edge.from}:${edge.to}` : null);
