(() => {
  'use strict';
  const D = CHINESE_ALMANAC_CONFIG,
    C = MONGOL_CALENDAR,
    $ = (id) => document.getElementById(id),
    ui = D.ui,
    core = window.ChineseAlmanac;
  function currentDate() {
    const p = new Intl.DateTimeFormat('en-CA', {
        timeZone: D.timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date()),
      get = (t) => p.find((x) => x.type === t).value;
    return get('year') + '-' + get('month') + '-' + get('day');
  }
  let today = currentDate(),
    date = new URLSearchParams(location.search).get('date');
  if (!date || !core?.validDate(date)) date = today;
  function tag(t, text, cls) {
    const e = document.createElement(t);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function translate(table, key) {
    return table?.[key] || ui.translationPending;
  }
  function ganZhi(raw) {
    const stem = D.stems[raw.charAt(0)],
      branch = D.branches[raw.charAt(1)];
    return stem && branch ? stem + ' ' + branch : ui.translationPending;
  }
  function show(value) {
    if (!core?.validDate(value)) {
      $('almanacDate').value = date;
      $('almanacDate').setAttribute('aria-invalid', 'true');
      $('almanacInputError').textContent = ui.rangeNote;
      return;
    }
    date = value;
    $('almanacDate').removeAttribute('aria-invalid');
    $('almanacInputError').textContent = '';
    render();
  }
  function activityList(id, terms) {
    const box = $(id);
    box.replaceChildren();
    for (const term of terms) {
      const p = tag('p', translate(D.activities, term), 'almanac-activity');
      p.dataset.originalTerm = term;
      if (D.pendingTerms.includes(term)) {
        p.classList.add('translation-pending');
        p.setAttribute('data-translation-status', 'pending');
      }
      box.append(p);
    }
    if (terms.length > 8) {
      let expanded = false;
      const toggle = tag('button', ui.showAll + ' · ' + terms.length, 'activity-toggle');
      toggle.type = 'button';
      const rows = [...box.querySelectorAll('p')];
      function state() {
        rows.forEach((p, i) => (p.hidden = !expanded && i >= 8));
        toggle.textContent = (expanded ? ui.showLess : ui.showAll) + ' · ' + terms.length;
        toggle.setAttribute('aria-expanded', String(expanded));
      }
      toggle.onclick = () => {
        expanded = !expanded;
        state();
      };
      box.append(toggle);
      state();
    }
  }
  function render() {
    const [y, m, d] = date.split('-');
    $('almanacDate').value = date;
    $('almanacDay').textContent = String(+d);
    $('almanacYearMonth').textContent = y + ' / ' + m;
    $('almanacTodayLine').textContent = ui.today + ' · ' + today + ' · UTC+08';
    $('almanacWeekday').textContent =
      C.ui.weekdays[(new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7];
    $('almanacPrevious').disabled = date <= D.minDate;
    $('almanacNext').disabled = date >= D.maxDate;
    for (const id of [
      'almanacFields',
      'favorableValues',
      'unfavorableValues',
      'departureValue',
      'almanacSource',
    ])
      $(id).replaceChildren();
    $('almanacStatus').textContent = '';
    let r;
    try {
      r = core.compute(date);
    } catch (e) {
      $('almanacRecord').hidden = true;
      $('almanacMissing').hidden = false;
      $('almanacMissing').textContent = ui.engineError;
      return;
    }
    $('almanacRecord').hidden = false;
    $('almanacMissing').hidden = true;
    $('almanacStatus').textContent = ui.calculated + ' · ' + date;
    const lunar =
      r.lunarYear +
      ' / ' +
      (r.leapMonth ? ui.leapMonth + ' ' : '') +
      r.lunarMonth +
      ' / ' +
      r.lunarDay;
    for (const [label, value, key] of [
      [ui.lunarDate, lunar, 'lunar'],
      [ui.yearGanZhi, ganZhi(r.yearGanZhi), 'year'],
      [ui.monthGanZhi, ganZhi(r.monthGanZhi), 'month'],
      [ui.dayGanZhi, ganZhi(r.dayGanZhi), 'day'],
      [ui.zodiac, translate(D.animals, r.yearZodiac), 'zodiac'],
      [ui.solarTerm, r.solarTerm ? translate(D.solarTerms, r.solarTerm) : ui.noSolarTerm, 'term'],
    ]) {
      const cell = tag('div', undefined, 'almanac-field');
      cell.dataset.field = key;
      cell.append(tag('small', label), tag('strong', value));
      $('almanacFields').append(cell);
    }
    activityList('favorableValues', r.yi);
    activityList('unfavorableValues', r.ji);
    const arrows = {
      正北: '↑',
      东北: '↗',
      正东: '→',
      东南: '↘',
      正南: '↓',
      西南: '↙',
      正西: '←',
      西北: '↖',
      中宫: '◎',
    };
    for (const item of r.directions) {
      const card = tag('div', undefined, 'deity-direction');
      card.dataset.deity = item.key;
      const arrow = tag('b', arrows[item.value] || '·');
      arrow.setAttribute('aria-hidden', 'true');
      card.append(
        tag('small', ui[item.key]),
        arrow,
        tag('strong', translate(D.directions, item.value)),
      );
      $('departureValue').append(card);
    }
    $('almanacSource').append(tag('span', ui.source));
    for (const item of D.sources) {
      const a = tag('a', item.label);
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      $('almanacSource').append(a);
    }
  }
  for (const [id, text] of [
    ['almanacTitle', ui.title],
    ['almanacBack', '← ' + C.ui.title],
    ['almanacDateLabel', ui.selectDate],
    ['favorableTitle', ui.favorable],
    ['unfavorableTitle', ui.unfavorable],
    ['departureTitle', ui.folkDirections],
    ['verifiedDatesTitle', ui.selectDate],
    ['almanacCoverage', ui.rangeNote],
    ['almanacEdition', ui.algorithmNote],
    ['almanacGanZhiNote', ui.ganZhiNote],
    [
      'almanacRuleVariants',
      ui.favorable + ' / ' + ui.unfavorable + ' · 1 · ' + ui.fortuneDeityDirection + ' · 2',
    ],
    ['almanacDisclaimer', ui.yiJiNote],
    ['almanacDraft', ui.draft],
    ['almanacSystemLabel', ui.calendarSystem],
    ['almanacMedicalCaution', ui.medicalCaution],
    ['almanacFinancialCaution', ui.financialCaution],
    ['almanacDirectionNote', ui.directionNote],
  ])
    $(id).textContent = text;
  $('almanacTitle').setAttribute('aria-label', ui.fullTitle);
  $('almanacPrevious').setAttribute('aria-label', ui.previous);
  $('almanacNext').setAttribute('aria-label', ui.next);
  $('almanacToday').setAttribute('aria-label', ui.today);
  $('almanacDate').setAttribute('aria-label', ui.selectDate);
  $('almanacDate').min = D.minDate;
  $('almanacDate').max = D.maxDate;
  $('almanacDate').onchange = (e) => show(e.target.value);
  function move(delta) {
    const dt = new Date(date + 'T00:00:00Z');
    dt.setUTCDate(dt.getUTCDate() + delta);
    show(dt.toISOString().slice(0, 10));
  }
  $('almanacPrevious').onclick = () => move(-1);
  $('almanacNext').onclick = () => move(1);
  $('almanacToday').onclick = () => show(today);
  for (const key of D.quickDates) {
    const b = tag('button', key);
    b.type = 'button';
    b.dataset.exampleDate = key;
    b.onclick = () => show(key);
    $('verifiedDates').append(b);
  }
  function refresh() {
    const next = currentDate();
    if (next === today) return;
    const following = date === today;
    today = next;
    if (following) date = next;
    render();
  }
  document.addEventListener('visibilitychange', refresh);
  setInterval(refresh, 60000);
  render();
})();
