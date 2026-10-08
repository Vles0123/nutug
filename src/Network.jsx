import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3-force';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from 'react-aria-components';
import { Plus, Minus, Scan, Focus } from 'lucide-react';
import { IconButton, Mn } from './ui';
import { labels } from './ui-copy.mjs';
import { edgeKey } from '../shared/records.mjs';
import { placeLabels } from './label-layout.mjs';

export function layoutNetwork(nodes, edges, width, height) {
  const list = nodes.map((n) => ({ id: n.id }));
  const links = edges.map((e) => ({ source: e.from, target: e.to }));
  const simulation = forceSimulation(list)
    .force(
      'link',
      forceLink(links)
        .id((n) => n.id)
        .distance(140),
    )
    .force('charge', forceManyBody().strength(-1200))
    .force('collision', forceCollide(78))
    .force('x', forceX(0).strength(0.09))
    .force('y', forceY(0).strength(0.12))
    .stop();
  simulation.tick(220);
  const minX = Math.min(...list.map((n) => n.x)),
    maxX = Math.max(...list.map((n) => n.x));
  const minY = Math.min(...list.map((n) => n.y)),
    maxY = Math.max(...list.map((n) => n.y));
  // Reserve the physical height of vertical labels as well as the node hit area.
  const mx = Math.min(68, width * 0.17),
    top = Math.min(66, height * 0.15),
    bottom = Math.min(170, height * 0.4);
  return Object.fromEntries(
    list.map((n) => [
      n.id,
      {
        x: mx + ((n.x - minX) / (maxX - minX || 1)) * (width - 2 * mx),
        y: top + ((n.y - minY) / (maxY - minY || 1)) * Math.max(20, height - top - bottom),
      },
    ]),
  );
}

export const Network = forwardRef(function Network(
  { nodes, edges, selected, selectedEdge, onSelect, onEdge, kind = 'tribes' },
  ref,
) {
  const host = useRef(null),
    drag = useRef(null),
    [size, setSize] = useState({ w: 800, h: 650 }),
    [view, setView] = useState({ x: 0, y: 0, k: 1 }),
    [hover, setHover] = useState(null),
    [labelPositions, setLabelPositions] = useState({}),
    [fontReady, setFontReady] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const measure = () => {
      const r = host.current?.getBoundingClientRect();
      if (r?.width && r.height) setSize({ w: r.width, h: r.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const positions = useMemo(
    () => layoutNetwork(nodes, edges, size.w, size.h),
    [nodes, edges, size],
  );
  useEffect(() => setView({ x: 0, y: 0, k: 1 }), [size.w, size.h, kind]);
  const focus = hover || selected;
  const neighbors = useMemo(
    () =>
      new Set([
        focus,
        ...edges.filter((e) => e.from === focus || e.to === focus).flatMap((e) => [e.from, e.to]),
      ]),
    [edges, focus],
  );
  useEffect(() => {
    let active = true;
    document.fonts?.ready.then(() => {
      if (active) setFontReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  useLayoutEffect(() => {
    const measured = [...host.current.querySelectorAll('.node-label')].map((element) => ({
      id: element.parentElement.dataset.node,
      width: element.offsetWidth || 36,
      height: element.offsetHeight || 110,
      priority:
        element.parentElement.dataset.node === selected
          ? 3
          : element.parentElement.dataset.node === hover
            ? 2
            : 1,
    }));
    setLabelPositions(placeLabels(measured, positions, size.w, size.h));
  }, [positions, focus, selected, hover, view.k, fontReady, size.w, size.h]);
  const zoom = (delta) => setView((v) => ({ ...v, k: Math.max(0.6, Math.min(2.8, v.k * delta)) }));
  const fit = () => setView({ x: 0, y: 0, k: 1 });
  const center = () => {
    const p = positions[selected];
    if (p) setView({ x: size.w / 2 - p.x, y: size.h / 2 - 65 - p.y, k: 1 });
  };
  useImperativeHandle(ref, () => ({ zoom, fit, center }), [positions, selected, size]);
  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  function pointerDown(e) {
    if (e.button !== 0 || e.target.closest('button,[data-edge]')) return;
    drag.current = { x: e.clientX, y: e.clientY, view };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e) {
    if (!drag.current) return;
    setView({
      ...drag.current.view,
      x: drag.current.view.x + e.clientX - drag.current.x,
      y: drag.current.view.y + e.clientY - drag.current.y,
    });
  }
  function keyboard(e) {
    if (e.target !== e.currentTarget) return;
    const movement = {
      ArrowLeft: [40, 0],
      ArrowRight: [-40, 0],
      ArrowUp: [0, 40],
      ArrowDown: [0, -40],
    }[e.key];
    if (movement) {
      e.preventDefault();
      setView((v) => ({ ...v, x: v.x + movement[0], y: v.y + movement[1] }));
    } else if (e.key === '0') {
      e.preventDefault();
      fit();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoom(1.2);
    } else if (e.key === '-') {
      e.preventDefault();
      zoom(1 / 1.2);
    }
  }
  return (
    <div className="network" ref={host} data-network={kind}>
      <div
        className="network-canvas"
        role="group"
        aria-label={labels.relations}
        tabIndex={0}
        onKeyDown={keyboard}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            zoom(e.deltaY > 0 ? 1 / 1.06 : 1.06);
          }
        }}
      >
        <motion.div
          className="network-stage"
          animate={{ x: view.x, y: view.y, scale: view.k }}
          transition={{ duration: drag.current || reduced ? 0 : 0.26, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <svg
            className="network-lines"
            width={size.w}
            height={size.h}
            role="group"
            aria-label={labels.relations}
          >
            {edges.map((e, i) => {
              const a = positions[e.from],
                b = positions[e.to];
              if (!a || !b) return null;
              const active = e.from === focus || e.to === focus,
                chosen = edgeKey(e) === selectedEdge;
              const bend = ((i % 3) - 1) * 28;
              const path = `M${a.x},${a.y} Q${(a.x + b.x) / 2 + bend},${(a.y + b.y) / 2 - bend} ${b.x},${b.y}`;
              return (
                <g key={e.id || i}>
                  <path
                    d={path}
                    className={`network-edge edge-${e.type} ${active ? 'is-connected' : ''} ${chosen ? 'is-chosen' : ''}`}
                  />
                  <path
                    d={path}
                    className="edge-hit"
                    data-edge={edgeKey(e)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${nodeMap[e.from]?.name} · ${nodeMap[e.to]?.name} · ${e.label}`}
                    aria-pressed={chosen}
                    onClick={() => onEdge(e)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onEdge(e);
                      }
                    }}
                  />
                </g>
              );
            })}
          </svg>
          {nodes.map((n) => {
            const p = positions[n.id],
              isSelected = n.id === selected,
              isNeighbor = neighbors.has(n.id),
              showLabel = nodes.length <= 12 || isNeighbor || view.k > 1.45;
            return (
              <Button
                key={n.id}
                className={`network-node ${isSelected ? 'is-selected' : ''} ${isNeighbor ? 'is-neighbor' : ''}`}
                style={{ left: p.x - 30, top: p.y - 18 }}
                aria-label={n.name}
                aria-pressed={isSelected}
                data-node={n.id}
                onPress={() => onSelect(n.id)}
                onHoverStart={() => setHover(n.id)}
                onHoverEnd={() => setHover(null)}
              >
                <span className="node-dot" aria-hidden="true" />
                {showLabel && (
                  <Mn
                    className="node-label"
                    style={
                      labelPositions[n.id]
                        ? {
                            left: labelPositions[n.id].x - (p.x - 30),
                            top: labelPositions[n.id].y - (p.y - 18),
                            transform: 'none',
                            visibility: labelPositions[n.id].hidden ? 'hidden' : 'visible',
                          }
                        : undefined
                    }
                  >
                    {n.name}
                  </Mn>
                )}
              </Button>
            );
          })}
        </motion.div>
      </div>
      <div className="graph-tools" role="group" aria-label={labels.relations}>
        <IconButton
          icon={Minus}
          label={labels.smaller}
          onPress={() => zoom(1 / 1.2)}
          data-action="zoom-out"
        />
        <IconButton
          icon={Plus}
          label={labels.larger}
          onPress={() => zoom(1.2)}
          data-action="zoom-in"
        />
        <span className="tool-divider" />
        <IconButton icon={Scan} label={labels.fit} onPress={fit} data-action="fit" />
        <IconButton icon={Focus} label={labels.focus} onPress={center} />
      </div>
      <div className="graph-count" aria-live="polite">
        <span>{nodes.length}</span> <span>●</span>
        <span className="count-divider" />
        <span>{edges.length}</span> <span>↔</span>
      </div>
    </div>
  );
});
