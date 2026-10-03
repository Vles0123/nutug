(() => {
  'use strict';
  const D = TRIBAL_GRAPH,
    $ = (id) => document.getElementById(id),
    NS = 'http://www.w3.org/2000/svg',
    svg = $('tribeGraph'),
    colors = { alliance: '#4c786d', conflict: '#b35343', submission: '#956c2e' };
  const mobile = document.body.classList.contains('mobile-edition');
  const ids = Object.keys(D.nodes);
  let selected = ids.includes('temujin') ? 'temujin' : ids[0],
    period = 'all',
    edgeSelected = null,
    view = { x: -620, y: -620, w: 1240, h: 1240 },
    drag = null,
    moved = false;
  const pointers = new Map();
  const profileSelection = {};
  const centerId = selected,
    outer = ids.filter((id) => id !== centerId),
    positions = { [centerId]: [0, 0] };
  outer.forEach((id, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / outer.length;
    positions[id] = [Math.cos(a) * 490, Math.sin(a) * 510];
  });
  function el(tag, attrs = {}, text) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function html(tag, text, cls) {
    const n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function edgeYear(e) {
    return e.date_start || Number((e.shortDate || e.date).match(/\d{4}/)?.[0]) || 0;
  }
  function filtered() {
    return D.edges
      .filter((e) => period === 'all' || e.period === period)
      .slice()
      .sort((a, b) => edgeYear(a) - edgeYear(b));
  }
  function applyView() {
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  }
  function frame(items) {
    if (mobile)
      items = new Set([...svg.querySelectorAll('[data-tribe]')].map((n) => n.dataset.tribe));
    const ps = [...items].map((id) => positions[id]).filter(Boolean);
    if (!ps.length) return;
    const left = Math.min(...ps.map((p) => p[0])) - 145,
      right = Math.max(...ps.map((p) => p[0])) + 145,
      top = Math.min(...ps.map((p) => p[1])) - 180,
      bottom = Math.max(...ps.map((p) => p[1])) + 180,
      r = svg.getBoundingClientRect(),
      ratio = (r.height || 600) / (r.width || 800);
    view.w = right - left;
    view.h = bottom - top;
    if (view.h / view.w < ratio) view.h = view.w * ratio;
    else view.w = view.h / ratio;
    view.x = (left + right - view.w) / 2;
    view.y = (top + bottom - view.h) / 2;
    applyView();
  }
  function neighbors() {
    return new Set([
      selected,
      ...filtered()
        .filter((e) => e.from === selected || e.to === selected)
        .flatMap((e) => [e.from, e.to]),
    ]);
  }
  function zoom(f) {
    const width = Math.max(350, Math.min(4500, view.w * f)),
      height = (width * view.h) / view.w;
    view.x += (view.w - width) / 2;
    view.y += (view.h - height) / 2;
    view.w = width;
    view.h = height;
    applyView();
  }
  function sourceLinks(keys) {
    const box = html('div', '', 'source-links');
    for (const key of [...new Set(keys || [])]) {
      const s = D.sources[key];
      if (!s) continue;
      const a = html('a', s.name);
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      box.append(a);
    }
    return box;
  }
  function pick(id, reframe = false, screen = mobile ? 'detail' : null) {
    const previousEdge = edgeSelected;
    selected = id;
    edgeSelected =
      mobile && filtered().some((e) => e.id === previousEdge && (e.from === id || e.to === id))
        ? previousEdge
        : null;
    render();
    if (reframe || mobile) frame(neighbors());
    if (mobile)
      document.dispatchEvent(new CustomEvent('tribes:mobile-screen', { detail: { screen } }));
  }
  function pickEdge(id, screen = mobile ? 'detail' : null) {
    edgeSelected = id;
    const e = filtered().find((e) => e.id === id);
    if (!e) return;
    if (selected !== e.from && selected !== e.to) selected = e.from;
    render();
    frame(new Set([e.from, e.to]));
    if (mobile)
      document.dispatchEvent(
        new CustomEvent('tribes:mobile-screen', {
          detail: { screen, section: screen === 'detail' ? 'relation' : null },
        }),
      );
  }
  function profilePanel(id, sections) {
    const box = html('section', '', 'tribe-profile'),
      tabs = html('div', '', 'profile-tabs'),
      content = html('div', '', 'profile-content');
    box.dataset.profileTribe = id;
    content.id = 'tribal-profile-content';
    let active = sections.find((s) => s.id === profileSelection[id]) || sections[0];
    function show(section) {
      active = section;
      profileSelection[id] = section.id;
      content.replaceChildren();
      for (const text of section.paragraphs || [])
        content.append(html('p', text, 'profile-paragraph'));
      content.append(sourceLinks(section.sources));
      tabs
        .querySelectorAll('button')
        .forEach((b) =>
          b.setAttribute('aria-pressed', String(b.dataset.profileSection === section.id)),
        );
      content.dataset.section = section.id;
    }
    for (const section of sections) {
      const b = html('button', section.title);
      b.type = 'button';
      b.dataset.profileSection = section.id;
      b.setAttribute('aria-controls', content.id);
      b.onclick = () => show(section);
      tabs.append(b);
    }
    box.append(tabs, content);
    show(active);
    return box;
  }
  function detail() {
    const panel = $('tribeDetail'),
      n = D.nodes[selected];
    panel.replaceChildren();
    const overview = html('div', '', 'overview');
    overview.append(html('h2', n.name), html('p', n.kind), html('p', n.summary));
    if (n.note) overview.append(html('p', n.note));
    panel.append(overview);
    if (n.profile?.length) panel.append(profilePanel(selected, n.profile));
    let es = filtered().filter((e) => e.from === selected || e.to === selected);
    if (edgeSelected) {
      const chosen = filtered().find((e) => e.id === edgeSelected);
      if (chosen && !es.some((e) => e.id === chosen.id)) es = [chosen, ...es];
    }
    const eventGroup = mobile ? panel : html('section', '', 'tribe-event-group');
    if (!mobile) panel.append(eventGroup);
    eventGroup.append(html('h3', D.ui.relations));
    const list = html('div', '', 'event-list');
    for (const e of es) {
      const b = html('button', '', 'event-card');
      b.type = 'button';
      b.dataset.edge = e.id;
      b.style.setProperty('--edge', colors[e.type]);
      b.setAttribute('aria-pressed', String(edgeSelected === e.id));
      b.append(
        html('span', e.date, 'date'),
        html(
          'span',
          mobile
            ? D.nodes[e.from === selected ? e.to : e.from].name
            : D.nodes[e.from].name + ' · ' + D.nodes[e.to].name,
          'event-name',
        ),
        html('span', e.label, 'event-name'),
      );
      b.onclick = () => pickEdge(e.id);
      list.append(b);
    }
    if (!es.length) list.append(html('p', D.ui.empty, 'empty'));
    eventGroup.append(list);
    const chosen = filtered().find((e) => e.id === edgeSelected);
    if (chosen) {
      panel.append(
        html(
          'p',
          mobile ? chosen.date + ' · ' + chosen.label + ' ᠃ ' + chosen.summary : chosen.summary,
          'event-description',
        ),
        sourceLinks(chosen.sources),
      );
    }
    const references = mobile ? panel : html('section', '', 'tribe-reference-group');
    if (!mobile) panel.append(references);
    references.append(html('h3', D.ui.sources), sourceLinks(n.sources));
    if (n.people?.length) {
      const people = html('div', '', 'people-links');
      for (const id of n.people) {
        if (typeof PEOPLE === 'undefined' || !PEOPLE[id]) continue;
        const a = html('a', PEOPLE[id].name);
        a.href = './#person=' + encodeURIComponent(id);
        people.append(a);
      }
      references.append(people);
    }
    document.dispatchEvent(new CustomEvent('tribes:selected', { detail: { id: selected } }));
  }
  function render() {
    svg.replaceChildren();
    const allEdges = filtered(),
      relatedEdges = allEdges.filter((e) => e.from === selected || e.to === selected);
    if (mobile && !relatedEdges.some((e) => e.id === edgeSelected))
      edgeSelected = relatedEdges[0]?.id || null;
    const es = mobile ? relatedEdges.filter((e) => e.id === edgeSelected) : allEdges,
      drawIds = mobile ? [...new Set([selected, ...es.flatMap((e) => [e.from, e.to])])] : ids,
      adj = neighbors();
    if (mobile) {
      positions[selected] = [0, es.length ? -190 : 0];
      for (const id of drawIds) if (id !== selected) positions[id] = [0, 190];
    }
    const defs = el('defs'),
      marker = el('marker', {
        id: 'tribe-arrow',
        viewBox: '0 0 10 10',
        refX: 9,
        refY: 5,
        markerWidth: 8,
        markerHeight: 8,
        orient: 'auto',
      });
    marker.append(el('path', { d: 'M0 0 L10 5 L0 10 Z', fill: colors.submission }));
    defs.append(marker);
    svg.append(defs);
    for (const e of es) {
      const a = positions[e.from],
        b = positions[e.to];
      if (!a || !b) continue;
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        len = Math.hypot(dx, dy),
        ux = dx / len,
        uy = dy / len;
      const ax = a[0] + ux * 150,
        ay = a[1] + uy * 150,
        bx = b[0] - ux * 150,
        by = b[1] - uy * 150;
      const siblings = es.filter(
        (x) => [x.from, x.to].slice().sort().join('|') === [e.from, e.to].slice().sort().join('|'),
      );
      const order = siblings.findIndex((x) => x.id === e.id),
        bend = (order - (siblings.length - 1) / 2) * 85;
      const cx = (ax + bx) / 2 - uy * bend,
        cy = (ay + by) / 2 + ux * bend;
      const path = `M${ax} ${ay} Q${cx} ${cy} ${bx} ${by}`,
        linked = e.from === selected || e.to === selected;
      const p = el('path', {
        d: path,
        stroke: colors[e.type],
        class: 'tribe-edge' + (linked ? ' linked' : '') + (edgeSelected === e.id ? ' chosen' : ''),
      });
      if (e.type === 'alliance') p.setAttribute('stroke-dasharray', '12 6');
      if (e.type === 'submission') {
        p.setAttribute('stroke-dasharray', '3 6');
        p.setAttribute('marker-end', 'url(#tribe-arrow)');
      }
      svg.append(p);
      const hit = el('path', {
        d: path,
        class: 'edge-hit',
        role: 'button',
        tabindex: 0,
        'aria-label':
          e.date + ' · ' + D.nodes[e.from].name + ' · ' + D.nodes[e.to].name + ' · ' + e.label,
        'data-edge-id': e.id,
      });
      hit.onclick = () => {
        if (!moved) pickEdge(e.id);
      };
      hit.onkeydown = (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          pickEdge(e.id);
        }
      };
      svg.append(hit);
      if (linked || edgeSelected === e.id) {
        const text = el(
          'text',
          { x: cx, y: cy - 6, class: 'edge-year', 'text-anchor': 'middle' },
          e.shortDate || e.date,
        );
        text.setAttribute('pointer-events', 'none');
        svg.append(text);
      }
    }
    for (const id of drawIds) {
      const n = D.nodes[id],
        [x, y] = positions[id],
        g = el('g', {
          class:
            'tribe-node' +
            (n.externalContext ? ' external-context' : '') +
            (id === selected ? ' selected' : '') +
            (!adj.has(id) ? ' muted' : ''),
          transform: `translate(${x - 110} ${y - 140})`,
          tabindex: 0,
          role: 'button',
          'aria-label': n.name + ' · ' + n.kind,
          'data-tribe': id,
        });
      g.append(el('rect', { width: 220, height: 280, rx: 16 }));
      const fo = el('foreignObject', { x: 9, y: 9, width: 202, height: 262 }),
        card = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      card.className = 'card';
      const title = html('strong', n.name),
        kind = html('small', n.kind);
      card.append(title, kind);
      fo.append(card);
      g.append(fo);
      g.onclick = () => {
        if (!moved) pick(id);
      };
      g.onkeydown = (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          pick(id, true);
        }
      };
      svg.append(g);
    }
    applyView();
    detail();
    document
      .querySelectorAll('[data-tribe-picker]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tribePicker === selected)));
    document
      .querySelectorAll('[data-period]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.period === period)));
    $('visibleCount').textContent = mobile
      ? (relatedEdges.length ? relatedEdges.findIndex((e) => e.id === edgeSelected) + 1 : 0) +
        ' / ' +
        relatedEdges.length +
        ' ↔'
      : ids.length + ' ● · ' + es.length + ' ↔';
    if (mobile) {
      $('mobilePrevRelation').disabled = !relatedEdges.length;
      $('mobileNextRelation').disabled = !relatedEdges.length;
      $('mobileRelationDate').textContent = es[0]?.shortDate || '';
      $('mobileRelationLabel').textContent = es[0]?.label || D.ui.empty;
    }
  }
  $('title').textContent = mobile ? 'ᠠᠶᠢᠮᠠᠭ' : D.ui.title;
  $('subtitle').textContent = D.ui.subtitle + ' · ' + D.ui.scope;
  $('backLink').textContent = '← ' + D.ui.back;
  svg.setAttribute('aria-label', D.ui.title);
  for (const key of ['all', 'early', 'middle', 'late']) {
    const b = html('button', D.ui[key]);
    b.type = 'button';
    b.dataset.period = key;
    b.onclick = () => {
      period = key;
      if (!mobile) edgeSelected = null;
      render();
      frame(new Set(ids));
      if (mobile)
        document.dispatchEvent(
          new CustomEvent('tribes:mobile-screen', { detail: { screen: 'graph' } }),
        );
    };
    $('periods').append(b);
  }
  for (const type of ['alliance', 'conflict', 'submission']) {
    const span = html('span', D.ui[type], type);
    span.style.setProperty('--edge', colors[type]);
    $('tribeLegend').append(span);
  }
  for (const id of ids) {
    const b = html('button', D.nodes[id].name);
    b.type = 'button';
    b.dataset.tribePicker = id;
    b.onclick = () => pick(id, true);
    $('tribePicker').append(b);
  }
  $('scope').append(html('p', D.ui.scope));
  $('plus').setAttribute('aria-label', 'ᠲᠣᠮᠣᠰᠬᠠᠬᠤ');
  $('minus').setAttribute('aria-label', 'ᠪᠠᠭᠠᠰᠬᠠᠬᠤ');
  $('fitTribes').setAttribute('aria-label', D.ui.fit);
  $('focusTribe').setAttribute('aria-label', D.ui.focus);
  $('plus').onclick = () => zoom(0.8);
  $('minus').onclick = () => zoom(1.25);
  $('fitTribes').onclick = () => frame(new Set(ids));
  $('focusTribe').onclick = () => frame(neighbors());
  svg.onwheel = (e) => {
    e.preventDefault();
    zoom(e.deltaY > 0 ? 1.1 : 0.9);
  };
  svg.onpointerdown = (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    const a = [...pointers.values()];
    drag = {
      view: { ...view },
      first: a[0],
      distance: a.length > 1 ? Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y) : 0,
    };
  };
  svg.onpointermove = (e) => {
    if (!pointers.has(e.pointerId) || !drag) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const a = [...pointers.values()],
      r = svg.getBoundingClientRect();
    if (a.length === 1) {
      const dx = a[0].x - drag.first.x,
        dy = a[0].y - drag.first.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      view.x = drag.view.x - (dx * view.w) / (r.width || 800);
      view.y = drag.view.y - (dy * view.h) / (r.height || 600);
    } else if (drag.distance) {
      const len = Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y),
        w = Math.max(350, Math.min(4500, (drag.view.w * drag.distance) / len)),
        h = (w * drag.view.h) / drag.view.w;
      view = {
        x: drag.view.x + (drag.view.w - w) / 2,
        y: drag.view.y + (drag.view.h - h) / 2,
        w,
        h,
      };
      moved = true;
    }
    applyView();
  };
  function end(e) {
    pointers.delete(e.pointerId);
    const a = [...pointers.values()];
    drag = a.length ? { view: { ...view }, first: a[0], distance: 0 } : null;
  }
  svg.onpointerup = end;
  svg.onpointercancel = end;
  svg.onpointerleave = (e) => {
    if (e.pointerType === 'mouse') end(e);
  };
  document.addEventListener('tribes:focus', (e) => {
    const id = e.detail?.id;
    if (!D.nodes[id]) return;
    if (!filtered().some((e) => e.from === id || e.to === id)) period = 'all';
    pick(id, true, 'graph');
    svg.scrollIntoView({ behavior: 'auto', block: 'center' });
    svg.querySelector('[data-tribe="' + id + '"]')?.focus({ preventScroll: true });
  });
  if (mobile) {
    const step = (delta) => {
      const es = filtered().filter((e) => e.from === selected || e.to === selected);
      if (!es.length) return;
      const index = es.findIndex((e) => e.id === edgeSelected);
      pickEdge(es[(index + delta + es.length) % es.length].id, 'graph');
    };
    $('mobilePrevRelation').onclick = () => step(-1);
    $('mobileNextRelation').onclick = () => step(1);
  }
  render();
  frame(new Set(ids));
  let previous = null;
  function resize() {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (previous) {
      const cx = view.x + view.w / 2,
        cy = view.y + view.h / 2;
      view.w *= r.width / previous.width;
      view.h = (view.w * r.height) / r.width;
      view.x = cx - view.w / 2;
      view.y = cy - view.h / 2;
      applyView();
    }
    previous = { width: r.width, height: r.height };
  }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(svg);
  else window.addEventListener('resize', resize);
  resize();
})();
