(() => {
  'use strict';
  const K = TRIBAL_KNOWLEDGE,
    G = TRIBAL_GRAPH,
    $ = (id) => document.getElementById(id),
    root = $('tribalLibrary'),
    dialog = $('tl-reader');
  let filter = 'all',
    query = '',
    lastTrigger = null;
  function tag(name, text, cls) {
    const e = document.createElement(name);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  for (const key of ['title', 'subtitle']) $('tl-' + key).textContent = K.ui[key];
  $('tl-query-label').textContent = K.ui.search;
  $('tl-query').setAttribute('aria-label', K.ui.search);
  $('tl-search-toggle').setAttribute('aria-label', K.ui.search);
  $('tl-close').setAttribute('aria-label', K.ui.close);
  $('tl-clear').setAttribute('aria-label', 'ᠠᠷᠢᠯᠭᠠᠬᠤ');
  $('tribeLibraryJump').setAttribute('aria-label', K.ui.title);
  $('tribeLibraryJump').onclick = () => root.scrollIntoView({ behavior: 'auto', block: 'start' });
  const filters = [
    'all',
    ...Object.keys(G.nodes).filter((id) => K.articles.some((a) => a.tribes.includes(id))),
  ];
  for (const id of filters) {
    const b = tag('button', id === 'all' ? K.ui.all : G.nodes[id].name);
    b.type = 'button';
    b.dataset.tribalFilter = id;
    b.onclick = () => {
      filter = id;
      render();
    };
    $('tl-filters').append(b);
  }
  function normalized(s) {
    return s.normalize('NFKC').toLowerCase();
  }
  function render() {
    const matches = K.articles.filter(
      (a) =>
        (filter === 'all' || a.tribes.includes(filter)) &&
        (!query ||
          normalized([a.title, a.summary, ...a.paragraphs].join(' ')).includes(normalized(query))),
    );
    $('tl-count').textContent = matches.length + ' / ' + K.articles.length;
    const grid = $('tl-grid');
    grid.replaceChildren();
    for (const a of matches) {
      const b = tag('button', undefined, 'tl-card');
      b.type = 'button';
      b.dataset.tribalArticle = a.id;
      b.append(tag('strong', a.title), tag('span', a.summary), tag('span', '＋', 'tl-card-mark'));
      b.onclick = () => open(a, b);
      grid.append(b);
    }
    $('tl-empty').hidden = !!matches.length;
    $('tl-empty').textContent = K.ui.empty;
    root
      .querySelectorAll('[data-tribal-filter]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tribalFilter === filter)));
  }
  function open(a, trigger) {
    lastTrigger = trigger;
    $('tl-reader-title').textContent = a.title;
    const body = $('tl-reader-body');
    body.replaceChildren();
    for (const p of a.paragraphs) body.append(tag('p', p));
    const related = $('tl-related');
    related.replaceChildren(tag('h3', K.ui.graph || K.ui.related));
    for (const id of a.tribes) {
      if (!G.nodes[id]) continue;
      const b = tag('button', G.nodes[id].name);
      b.type = 'button';
      b.dataset.relatedTribe = id;
      b.onclick = () => {
        lastTrigger = null;
        dialog.close();
        document.dispatchEvent(new CustomEvent('tribes:focus', { detail: { id } }));
      };
      related.append(b);
    }
    const sources = $('tl-sources');
    sources.replaceChildren(tag('h3', G.ui.sources));
    for (const ref of a.sources) {
      const s = typeof ref === 'string' ? K.sources[ref] || G.sources[ref] : ref;
      if (!s) continue;
      const link = tag('a', s.name);
      link.href = s.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      sources.append(link);
    }
    dialog.showModal();
    $('tl-reader-scroll').scrollLeft = 0;
    document.dispatchEvent(new Event('tribes:reader-open'));
  }
  function related() {
    const panel = $('tribeDetail'),
      id = document.querySelector('.tribe-node.selected')?.dataset.tribe;
    panel.querySelector('.tribal-related-reading')?.remove();
    if (!id) return;
    const matches = K.articles.filter((a) => a.tribes.includes(id));
    if (!matches.length) return;
    const box = tag('section', undefined, 'tribal-related-reading');
    box.append(tag('h3', K.ui.title));
    for (const a of matches) {
      const b = tag('button', a.title);
      b.type = 'button';
      b.dataset.tribeReading = a.id;
      b.onclick = () => open(a, b);
      box.append(b);
    }
    panel.append(box);
  }
  document.addEventListener('tribes:selected', related);
  $('tl-search-toggle').onclick = () => {
    const expanded = $('tl-search-panel').hidden;
    $('tl-search-panel').hidden = !expanded;
    $('tl-search-toggle').setAttribute('aria-expanded', String(expanded));
    if (expanded) $('tl-query').focus();
  };
  $('tl-query').oninput = (e) => {
    query = e.target.value.trim();
    render();
  };
  $('tl-clear').onclick = () => {
    query = '';
    $('tl-query').value = '';
    render();
    $('tl-query').focus();
  };
  $('tl-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => lastTrigger?.isConnected && lastTrigger.focus());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        dialog.close();
    }
  });
  render();
  related();
})();
