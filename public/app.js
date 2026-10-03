const $ = (id) => document.getElementById(id),
  NS = 'http://www.w3.org/2000/svg';
let mode = 'family',
  selected = 'temujin',
  selectedGap = null,
  focus = false,
  view = { x: 250, y: -30, w: 1300, h: 850 },
  moved = false;
const svg = $('graph'),
  pointers = new Map();
let gesture = null;
function el(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text !== undefined) n.textContent = text;
  return n;
}
function relevant(e) {
  return mode === 'family'
    ? ['parent', 'spouse'].includes(e.type)
    : ['succession', 'alliance', 'rival', 'contact'].includes(e.type);
}
function activeIds() {
  let all = new Set(EDGES.filter(relevant).flatMap((e) => [e.from, e.to]));
  if (mode === 'family') all.add('toghon');
  if (!all.has(selected) && PEOPLE[selected]) all.add(selected);
  if (focus)
    return new Set([
      selected,
      ...EDGES.filter((e) => relevant(e) && (e.from === selected || e.to === selected)).flatMap(
        (e) => [e.from, e.to],
      ),
    ]);
  return all;
}
function position(id) {
  const p = PEOPLE[id],
    a = mode === 'power' && p.power ? p.power : p.pos;
  return [a[0] * 1.12, a[1] * 1.65];
}
function visibleGaps() {
  return mode === 'family'
    ? (typeof RESEARCH_GAPS === 'undefined' ? [] : RESEARCH_GAPS).filter((g) =>
        activeIds().has(g.anchor),
      )
    : [];
}
function viewPoints() {
  return [...activeIds()]
    .map(position)
    .concat(visibleGaps().map((g) => [g.pos[0] * 1.12, g.pos[1] * 1.65]));
}
function maxViewWidth() {
  const ps = viewPoints(),
    r = svg.getBoundingClientRect(),
    xs = ps.map((p) => p[0]),
    ys = ps.map((p) => p[1]);
  return (
    2 *
    Math.max(
      3200,
      Math.max(...xs) - Math.min(...xs) + 300,
      ((Math.max(...ys) - Math.min(...ys) + 280) * (r.width || 900)) / (r.height || 600),
    )
  );
}
function applyView() {
  svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
}
function center(id) {
  const [x, y] = position(id);
  centerAt(x, y);
}
function centerAt(x, y) {
  const r = svg.getBoundingClientRect();
  view.w = Math.max(420, Math.min(1100, (r.width || 900) / 0.85));
  view.h = (view.w * (r.height || 600)) / (r.width || 900);
  if (view.h < 320) {
    view.h = 320;
    view.w = (320 * (r.width || 900)) / (r.height || 600);
  }
  view.x = x - view.w / 2;
  view.y = y - view.h / 2;
  applyView();
}
function fitBounds(ids, includeGaps = false) {
  const boxes = [...ids]
    .filter((id) => PEOPLE[id])
    .map((id) => {
      const [x, y] = position(id);
      return [x - 103, y - 150, x + 103, y + 150];
    });
  if (includeGaps)
    for (const g of visibleGaps()) {
      const x = g.pos[0] * 1.12,
        y = g.pos[1] * 1.65;
      boxes.push([x - 140, y - 125, x + 140, y + 125]);
    }
  for (const e of EDGES.filter((e) => relevant(e) && ids.has(e.from) && ids.has(e.to))) {
    const [ax, ay] = position(e.from),
      [bx, by] = position(e.to),
      lx = (ax + bx) / 2,
      ly = e.route === 'lower-arc' ? e.routeY * 1.65 - 12 : (ay + by) / 2 - 8;
    boxes.push([lx - 45, ly - 65, lx + 60, ly + 105]);
    if (e.route === 'lower-arc')
      boxes.push([Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), e.routeY * 1.65]);
  }
  if (!boxes.length) {
    center(selected);
    return;
  }
  const left = Math.min(...boxes.map((b) => b[0])),
    top = Math.min(...boxes.map((b) => b[1])),
    right = Math.max(...boxes.map((b) => b[2])),
    bottom = Math.max(...boxes.map((b) => b[3]));
  const r = svg.getBoundingClientRect(),
    ratio = (r.height || 600) / (r.width || 900);
  view.w = Math.max(350, right - left + 48);
  view.h = bottom - top + 48;
  if (view.h / view.w < ratio) view.h = view.w * ratio;
  else view.w = view.h / ratio;
  view.x = (left + right - view.w) / 2;
  view.y = (top + bottom - view.h) / 2;
  applyView();
}
function componentIds(id) {
  const result = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of EDGES.filter(relevant)) {
      if (result.has(e.from) || result.has(e.to)) {
        for (const n of [e.from, e.to])
          if (!result.has(n)) {
            result.add(n);
            changed = true;
          }
      }
    }
  }
  return result;
}
function hasCurrentRelations() {
  return EDGES.some((e) => relevant(e) && (e.from === selected || e.to === selected));
}
function frameSelection() {
  if (mode === 'family') {
    if (focus) fitBounds(activeIds(), true);
    else center(selected);
    return;
  }
  if (!hasCurrentRelations()) {
    fitBounds(new Set([selected]));
    return;
  }
  fitBounds(focus ? activeIds() : componentIds(selected));
}
function fit() {
  fitBounds(activeIds(), true);
}
function renderRelationStatus() {
  const box = $('relationStatus');
  if (!box) return;
  const externalFamily = mode === 'family' && PEOPLE[selected].externalContext;
  box.hidden = !externalFamily && (mode !== 'power' || hasCurrentRelations());
  $('relationStatusText').textContent = externalFamily
    ? PEOPLE[selected].note
    : RELATION_UI.politicalRelationsHint;
  $('viewFamily').textContent = externalFamily
    ? document.querySelector('[data-mode=power]').textContent
    : RELATION_UI.viewFamilyRelationships;
}

function zoom(f) {
  const w = Math.max(350, Math.min(maxViewWidth(), view.w * f)),
    h = (view.h * w) / view.w;
  view.x += (view.w - w) / 2;
  view.y += (view.h - h) / 2;
  view.w = w;
  view.h = h;
  applyView();
}
function render() {
  svg.replaceChildren();
  const ids = activeIds(),
    defs = el('defs'),
    marker = el('marker', {
      id: 'arrow',
      viewBox: '0 0 10 10',
      refX: 9,
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: 'auto-start-reverse',
    });
  marker.append(el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#b55441' }));
  defs.append(marker);
  svg.append(defs);
  const linked = new Set([
    selected,
    ...EDGES.filter((e) => relevant(e) && (e.from === selected || e.to === selected)).flatMap(
      (e) => [e.from, e.to],
    ),
  ]);
  for (const e of EDGES.filter((e) => relevant(e) && ids.has(e.from) && ids.has(e.to))) {
    let [ax, ay] = position(e.from),
      [bx, by] = position(e.to),
      color =
        e.type === 'contact'
          ? '#466e9a'
          : e.type === 'spouse'
            ? '#b48b45'
            : e.type === 'parent'
              ? '#567366'
              : e.type === 'succession'
                ? '#b55441'
                : '#77756f',
      d,
      lx,
      ly;
    if (e.route === 'lower-arc') {
      ay += 130;
      by += 130;
      const lane = e.routeY * 1.65;
      d = `M${ax} ${ay} C${ax} ${lane} ${bx} ${lane} ${bx} ${by}`;
      lx = (ax + bx) / 2;
      ly = lane - 12;
    } else if (e.type === 'spouse') {
      let left = ax < bx;
      ax += left ? 83 : -83;
      bx += left ? -83 : 83;
      d = `M${ax} ${ay} L${bx} ${by}`;
      lx = (ax + bx) / 2;
      ly = (ay + by) / 2 - 8;
    } else {
      ay += 130;
      by -= 130;
      let mid = (ay + by) / 2;
      d = `M${ax} ${ay} C${ax} ${mid} ${bx} ${mid} ${bx} ${by}`;
      lx = (ax + bx) / 2;
      ly = mid - 8;
    }
    const path = el('path', {
      d,
      stroke: color,
      class: 'edge' + (e.from === selected || e.to === selected ? '' : ' dim'),
    });
    if (e.type === 'contact') path.setAttribute('stroke-dasharray', '2 6');
    if (['alliance', 'rival'].includes(e.type)) path.setAttribute('stroke-dasharray', '7 5');
    if (e.type === 'succession') path.setAttribute('marker-end', 'url(#arrow)');
    svg.append(path);
    if (e.from === selected || e.to === selected) {
      const label = el('foreignObject', { x: lx - 35, y: ly - 55, width: 85, height: 150 });
      const span = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      span.className = 'mn-edge';
      span.textContent = e.label;
      label.append(span);
      svg.append(label);
    }
  }
  for (const id of ids) {
    let p = PEOPLE[id];
    if (!p) continue;
    let [x, y] = position(id),
      g = el('g', {
        class:
          'node' + (p.externalContext ? ' context-node' : '') + (!linked.has(id) ? ' dim' : ''),
        transform: `translate(${x - 83} ${y - 130})`,
        tabindex: 0,
        role: 'button',
        'data-person': id,
        'aria-label': p.name + ' · ' + p.alias,
      });
    g.append(
      el('rect', {
        width: 166,
        height: 260,
        rx: 3,
        fill: id === selected ? '#182d36' : '#f7f4e9',
        stroke: id === selected ? '#ba934f' : '#8b9c91',
        'stroke-width': id === selected ? 2.5 : 1,
      }),
    );
    const foreign = el('foreignObject', { x: 7, y: 9, width: 152, height: 242 });
    let box = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
    box.className = 'mn-node' + (id === selected ? ' selected' : '');
    let name = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
    name.className = 'mn-name';
    name.textContent = p.name;
    let alias = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
    alias.className = 'mn-alias';
    alias.textContent = p.alias;
    box.append(name, alias);
    foreign.append(box);
    g.append(foreign);
    g.onclick = () => {
      if (!moved) choose(id, false);
    };
    g.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        choose(id, true);
      }
    };
    svg.append(g);
  }
  renderGaps();
  renderRelationStatus();
  applyView();
  if (selectedGap && mode === 'family') gapDetail();
  else detail();
  $('legend').innerHTML =
    mode === 'family'
      ? '<span>ᠡᠴᠢᠭᠡ ᠡᠬᠡ ᠪᠠ ᠦᠷ᠎ᠡ ᠬᠡᠦᠬᠡᠳ</span><span class="spouse">ᠭᠡᠷᠯᠡᠯᠲᠡ</span>'
      : '<span class="succession">ᠬᠠᠭᠠᠨ ᠰᠢᠷᠡᠭᠡ ᠶᠢᠨ ᠵᠠᠯᠭᠠᠮᠵᠢᠯᠠᠯ</span><span class="politics">ᠬᠣᠯᠪᠤᠭ᠎ᠠ ／ ᠲᠡᠮᠡᠴᠡᠯ</span>';
  $('graphTitle').textContent =
    mode === 'family' ? RELATION_UI.familyTitle : RELATION_UI.powerTitle;
  if (mode === 'power') {
    const contact = document.createElement('span');
    contact.className = 'contact';
    contact.textContent = RELATION_UI.contact;
    $('legend').append(contact);
  }
  if (visibleGaps().length) {
    const hint = document.createElement('span');
    hint.className = 'uncertain';
    hint.textContent = visibleGaps()[0].legendLabel;
    $('legend').append(hint);
  }
  document
    .querySelectorAll('[data-mode]')
    .forEach((b) => b.setAttribute('aria-selected', b.dataset.mode === mode));
}
function choose(id, recenter = true) {
  if (!PEOPLE[id]) return;
  selected = id;
  selectedGap = null;
  document.body.classList.remove('search-open');
  $('searchToggle').setAttribute('aria-expanded', 'false');
  $('searchResults').hidden = true;
  $('search').value = '';
  render();
  if (recenter) frameSelection();
}
function detail() {
  $('detail').scrollLeft = 0;
  $('detail').scrollTop = 0;
  const p = PEOPLE[selected];
  $('detail').dataset.person = selected;
  delete $('detail').dataset.gap;
  $('detail').replaceChildren();
  function h(tag, text, cls) {
    let e = document.createElement(tag);
    e.textContent = text;
    if (cls) e.className = cls;
    $('detail').append(e);
    return e;
  }
  h('div', p.era, 'overline');
  h('h2', p.name);
  h('div', p.alias + (p.years ? ' · ' + p.years : ''), 'alias');
  h('p', p.summary);
  if (p.note) h('p', p.note);
  h('h3', 'ᠬᠣᠯᠪᠣᠭᠳᠠᠬᠤ ᠬᠦᠮᠦᠰ');
  let box = h('div', '', 'relations');
  for (const e of EDGES.filter((e) => e.from === selected || e.to === selected)) {
    const other = e.from === selected ? e.to : e.from,
      button = document.createElement('button');
    button.textContent = PEOPLE[other].name;
    let tag = document.createElement('span');
    tag.textContent =
      e.type === 'parent'
        ? e.from === selected
          ? 'ᠦᠷ᠎ᠡ ᠬᠡᠦᠬᠡᠳ'
          : 'ᠡᠴᠢᠭᠡ ／ ᠡᠬᠡ'
        : e.type === 'succession'
          ? e.from === selected
            ? 'ᠳᠠᠷᠠᠭᠠᠬᠢ ᠬᠠᠭᠠᠨ'
            : 'ᠥᠮᠦᠨᠡᠬᠢ ᠬᠠᠭᠠᠨ'
          : e.label;
    button.append(tag);
    button.onclick = () => {
      mode = ['parent', 'spouse'].includes(e.type) ? 'family' : 'power';
      choose(other, true);
    };
    box.append(button);
  }
  if (!box.childNodes.length) box.textContent = RELATION_UI.sourceHint;
  h('h3', 'ᠬᠣᠯᠪᠣᠭᠳᠠᠬᠤ ᠦᠢᠯᠡ ᠶᠠᠪᠤᠳᠠᠯ');
  let es = EVENTS.filter((e) => e.people.includes(selected));
  if (!es.length) h('p', 'ᠳᠡᠭᠡᠷᠡᠬᠢ ᠬᠣᠯᠪᠤᠭ᠎ᠠ ᠪᠠᠷ ᠲᠤᠬᠠᠶᠢᠨ ᠦᠶ᠎ᠡ ᠶᠢᠨ ᠬᠦᠮᠦᠰ ᠢ ᠴᠠᠭᠠᠰᠢ ᠦᠵᠡᠭᠡᠷᠡᠢ᠃');
  for (const e of es) h('p', e.date + ' · ' + e.title + ' ᠃ ' + e.text);
  h('h3', 'ᠰᠤᠷᠪᠤᠯᠵᠢ ᠪᠢᠴᠢᠭ');
  for (const n of p.sources) {
    const a = document.createElement('a');
    a.className = 'source';
    a.href = SOURCES[n].url;
    a.textContent = SOURCES[n].name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    $('detail').append(a);
  }
  document.dispatchEvent(new CustomEvent('atlas:person-selected', { detail: { id: selected } }));
}
function timeline() {
  for (const e of EVENTS) {
    let b = document.createElement('button'),
      date = document.createElement('strong');
    date.textContent = e.date;
    b.append(date, document.createTextNode(e.title));
    b.onclick = () => {
      document.querySelectorAll('#events button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      if (e.graphMode) mode = e.graphMode;
      if (typeof e.focusRelations === 'boolean') {
        focus = e.focusRelations;
        $('focus').checked = focus;
      }
      choose(e.people[0], true);
      if (e.focusRelations) fit();
    };
    $('events').append(b);
  }
}
$('search').oninput = () => {
  let q = $('search').value.trim().toLowerCase(),
    r = $('searchResults');
  r.replaceChildren();
  r.hidden = !q;
  if (!q) return;
  let found = Object.entries(PEOPLE).filter(([id, p]) =>
    (p.name + p.alias + id).toLowerCase().includes(q),
  );
  if (!found.length) {
    const n = document.createElement('p');
    n.textContent = 'ᠡᠨᠡ ᠬᠦᠮᠦᠨ ᠢ ᠡᠨᠡ ᠬᠤᠪᠢᠯᠪᠤᠷᠢ ᠳᠤ ᠣᠷᠣᠭᠤᠯᠤᠭ᠎ᠠ ᠦᠭᠡᠢ';
    r.append(n);
  }
  for (const [id, p] of found) {
    const b = document.createElement('button');
    b.textContent = p.name;
    let sp = document.createElement('span');
    sp.textContent = p.alias;
    b.append(sp);
    b.onclick = () => {
      if (['toghrul', 'jamukha'].includes(id) || PEOPLE[id].externalContext) mode = 'power';
      choose(id, true);
    };
    r.append(b);
  }
};
$('search').onkeydown = (e) => {
  if (e.key === 'Escape') $('searchResults').hidden = true;
  if (e.key === 'Enter') $('searchResults').querySelector('button')?.click();
};
document.querySelectorAll('[data-mode]').forEach(
  (b) =>
    (b.onclick = () => {
      mode = b.dataset.mode;
      render();
      frameSelection();
    }),
);
$('focus').onchange = () => {
  focus = $('focus').checked;
  render();
  frameSelection();
};
$('zoomIn').onclick = () => zoom(0.8);
$('zoomOut').onclick = () => zoom(1.25);
$('fit').onclick = fit;
$('home').onclick = () => {
  mode = 'family';
  focus = false;
  $('focus').checked = false;
  choose('temujin', true);
};
svg.onwheel = (e) => {
  e.preventDefault();
  zoom(e.deltaY > 0 ? 1.08 : 0.92);
};
svg.onpointerdown = (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  moved = false;
  let a = [...pointers.values()];
  gesture = {
    view: { ...view },
    start: a[0],
    distance: a.length > 1 ? Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y) : 0,
  };
};
svg.onpointermove = (e) => {
  if (!pointers.has(e.pointerId) || !gesture) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  let a = [...pointers.values()],
    r = svg.getBoundingClientRect();
  if (a.length === 1) {
    let dx = a[0].x - gesture.start.x,
      dy = a[0].y - gesture.start.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
    view.x = gesture.view.x - (dx * view.w) / r.width;
    view.y = gesture.view.y - (dy * view.h) / r.height;
  } else if (gesture.distance) {
    let d = Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y),
      w = Math.max(350, Math.min(maxViewWidth(), (gesture.view.w * gesture.distance) / d)),
      h = (gesture.view.h * w) / gesture.view.w;
    view = {
      x: gesture.view.x + (gesture.view.w - w) / 2,
      y: gesture.view.y + (gesture.view.h - h) / 2,
      w,
      h,
    };
    moved = true;
  }
  applyView();
};
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (!pointers.size) gesture = null;
  else {
    let a = [...pointers.values()];
    gesture = { view: { ...view }, start: a[0], distance: 0 };
  }
}
svg.onpointerup = endPointer;
svg.onpointercancel = endPointer;
svg.onpointerleave = (e) => {
  if (e.pointerType === 'mouse') endPointer(e);
};
$('aboutBtn').onclick = () => $('about').showModal();
$('closeAbout').onclick = () => $('about').close();
for (const p of Object.values(SOURCES)) {
  let a = document.createElement('a');
  a.href = p.url;
  a.textContent = p.name;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  $('allSources').append(a);
}
timeline();
render();
center('temujin');

// Keep world coordinates proportional when a split pane, window or device rotates.
let lastSize = null;
function resizeGraph() {
  const r = svg.getBoundingClientRect();
  if (!r.width || !r.height) return;
  if (lastSize) {
    const cx = view.x + view.w / 2,
      cy = view.y + view.h / 2;
    view.w = Math.max(350, Math.min(maxViewWidth(), (view.w * r.width) / lastSize.width));
    view.h = (view.w * r.height) / r.width;
    view.x = cx - view.w / 2;
    view.y = cy - view.h / 2;
    applyView();
  } else {
    center(selected);
  }
  lastSize = { width: r.width, height: r.height };
}
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(resizeGraph).observe(svg);
} else {
  window.addEventListener('resize', resizeGraph);
}
resizeGraph();

$('searchToggle').onclick = () => {
  const open = document.body.classList.toggle('search-open');
  $('searchToggle').setAttribute('aria-expanded', String(open));
  if (open) $('search').focus();
  else $('searchResults').hidden = true;
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.body.classList.remove('search-open');
    $('searchToggle').setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('atlas:focus-person', (e) => {
  const id = e.detail?.id;
  if (!PEOPLE[id]) return;
  if (['family', 'power'].includes(e.detail.mode)) mode = e.detail.mode;
  choose(id, true);
  svg.scrollIntoView({ behavior: 'auto', block: 'center' });
  svg.querySelector('[data-person="' + id + '"]')?.focus({ preventScroll: true });
});

function renderGaps() {
  for (const gap of visibleGaps()) {
    const [ax, ay] = position(gap.anchor),
      x = gap.pos[0] * 1.12,
      y = gap.pos[1] * 1.65;
    svg.append(
      el('path', { d: `M${ax} ${ay + 130} L${x} ${y - 105}`, class: 'research-gap-line' }),
    );
    const g = el('g', {
      class: 'research-gap',
      transform: `translate(${x - 120} ${y - 105})`,
      tabindex: 0,
      role: 'button',
      'aria-label': gap.title + ' · ' + gap.shortLabel,
      'data-gap': gap.id,
    });
    g.append(
      el('rect', {
        width: 240,
        height: 210,
        rx: 18,
        fill: selectedGap === gap.id ? '#e9d7ab' : '#f4edda',
        stroke: '#99713b',
        'stroke-width': 2,
        'stroke-dasharray': '7 5',
      }),
    );
    const foreign = el('foreignObject', { x: 18, y: 12, width: 204, height: 186 }),
      box = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
    box.className = 'mn-gap';
    const title = document.createElementNS('http://www.w3.org/1999/xhtml', 'strong');
    title.textContent = gap.title;
    const note = document.createElementNS('http://www.w3.org/1999/xhtml', 'span');
    note.textContent = gap.shortLabel;
    box.append(title, note);
    foreign.append(box);
    g.append(foreign);
    g.onclick = () => {
      if (!moved) showGap(gap.id);
    };
    g.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showGap(gap.id);
      }
    };
    svg.append(g);
  }
}
function showGap(id) {
  const g = RESEARCH_GAPS.find((x) => x.id === id);
  if (!g) return;
  mode = 'family';
  selected = g.anchor;
  selectedGap = id;
  render();
  centerAt(g.pos[0] * 1.12, g.pos[1] * 1.65);
}
function gapDetail() {
  const gap = RESEARCH_GAPS.find((x) => x.id === selectedGap);
  if (!gap) {
    selectedGap = null;
    detail();
    return;
  }
  const panel = $('detail');
  panel.replaceChildren();
  panel.dataset.person = '';
  panel.dataset.gap = gap.id;
  panel.scrollLeft = 0;
  function add(tag, text, cls) {
    const e = document.createElement(tag);
    e.textContent = text;
    if (cls) e.className = cls;
    panel.append(e);
    return e;
  }
  add('div', gap.legendLabel, 'overline');
  add('h2', gap.detailTitle || gap.title);
  add('p', gap.summary);
  for (const p of gap.notes || []) add('p', p);
  const back = add('button', PEOPLE[gap.anchor].name, 'gap-anchor mn');
  back.type = 'button';
  back.onclick = () => choose(gap.anchor, true);
  add('h3', 'ᠰᠤᠷᠪᠤᠯᠵᠢ ᠪᠢᠴᠢᠭ');
  for (const key of gap.sources) {
    const a = add('a', SOURCES[key].name, 'source');
    a.href = SOURCES[key].url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
}

if (PEOPLE.tumbinai) {
  $('ancestor-end').setAttribute('aria-label', PEOPLE.tumbinai.name);
  $('ancestor-end').title = PEOPLE.tumbinai.name;
  $('ancestor-end').onclick = () => {
    mode = 'family';
    focus = false;
    $('focus').checked = false;
    choose('tumbinai', true);
  };
}
if (typeof RESEARCH_GAPS !== 'undefined' && RESEARCH_GAPS.length) {
  const gap = RESEARCH_GAPS[0];
  $('descendant-end').setAttribute('aria-label', gap.detailTitle);
  $('descendant-end').title = gap.detailTitle;
  $('descendant-end').onclick = () => {
    focus = false;
    $('focus').checked = false;
    showGap(gap.id);
  };
}

$('relationStatusText').textContent = RELATION_UI.politicalRelationsHint;
$('viewFamily').textContent = RELATION_UI.viewFamilyRelationships;
$('viewFamily').onclick = () => {
  mode = PEOPLE[selected].externalContext ? 'power' : 'family';
  render();
  frameSelection();
};
$('viewPoliticalGraph').onclick = () => {
  mode = 'power';
  focus = false;
  $('focus').checked = false;
  render();
  fitBounds(new Set(EDGES.filter(relevant).flatMap((e) => [e.from, e.to])));
};

function loadPersonFragment() {
  const id = new URLSearchParams(location.hash.slice(1)).get('person');
  if (PEOPLE[id]) {
    mode = PEOPLE[id].externalContext ? 'power' : 'family';
    focus = false;
    $('focus').checked = false;
    choose(id, true);
  }
}
window.addEventListener('hashchange', loadPersonFragment);
loadPersonFragment();
