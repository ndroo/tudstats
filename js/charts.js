// Minimal SVG chart kit for TUD STATS.
// All labels that originate from match data (player names, map names) are
// inserted with textContent — never innerHTML — since they are untrusted.

const SVG_NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function svg(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  applyAttrs(node, attrs);
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function applyAttrs(node, attrs) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (key === 'class') node.setAttribute('class', value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
}

export const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
export const fmtDay = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const CHROME = {
  grid: '#2c2c2a',
  baseline: '#383835',
  muted: '#898781',
  ink2: '#c3c2b7',
  surface: '#1a1a19',
};

function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const rawStep = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rawStep) || 10 * mag;
  const ticks = [];
  for (let v = 0; ; v += step) {
    ticks.push(Math.round(v * 100) / 100);
    if (v >= max) break;
  }
  return ticks;
}

// ---------- tooltip (singleton) ----------

let tooltipEl = null;
function tooltip() {
  if (!tooltipEl) {
    tooltipEl = el('div', { class: 'viz-tooltip', role: 'status' });
    document.body.append(tooltipEl);
  }
  return tooltipEl;
}

export function showTooltip(clientX, clientY, title, rows) {
  const tip = tooltip();
  tip.replaceChildren(
    el('div', { class: 'tt-title' }, title),
    ...rows.map((r) =>
      el('div', { class: 'tt-row' }, [
        r.color ? el('span', { class: 'tt-key', style: `border-color:${r.color}` }) : null,
        el('span', { class: 'tt-name' }, r.name),
        el('span', { class: 'tt-val' }, r.value),
      ])
    )
  );
  tip.style.display = 'block';
  const rect = tip.getBoundingClientRect();
  const x = Math.min(clientX + 14, window.innerWidth - rect.width - 8);
  const y = Math.min(clientY + 14, window.innerHeight - rect.height - 8);
  tip.style.left = `${Math.max(8, x)}px`;
  tip.style.top = `${Math.max(8, y)}px`;
}

export function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}

// ---------- chart card (title + table-view toggle) ----------

// Every chart ships with a table-view twin; the toggle swaps between them.
export function chartCard({ title, hint, legend, table, render, span2 = false }) {
  const body = el('div', { class: 'chart-body', tabindex: '0' });
  const tableWrap = el('div', { class: 'chart-table', hidden: '' });
  tableWrap.append(buildTable(table));

  const toggle = el(
    'button',
    {
      class: 'table-toggle',
      'aria-pressed': 'false',
      onclick: () => {
        const showTable = toggle.getAttribute('aria-pressed') !== 'true';
        toggle.setAttribute('aria-pressed', String(showTable));
        body.hidden = showTable;
        tableWrap.hidden = !showTable;
      },
    },
    'Table'
  );

  const fig = el('figure', { class: `chart-card${span2 ? ' span-2' : ''}` }, [
    el('div', { class: 'chart-head' }, [
      el('h3', {}, title),
      hint ? el('span', { class: 'hint' }, hint) : null,
      toggle,
    ]),
    legend && legend.length > 1
      ? el('div', { class: 'legend' },
          legend.map((item) =>
            el('span', { class: 'item' }, [
              el('span', {
                class: item.shape === 'rect' ? 'key-rect' : 'key-line',
                style: item.shape === 'rect' ? `background:${item.color}` : `border-color:${item.color}`,
              }),
              item.name,
            ])
          )
        )
      : null,
    body,
    tableWrap,
  ]);

  render(body);
  return fig;
}

function buildTable({ columns, rows }) {
  return el('table', { class: 'data' }, [
    el('thead', {}, el('tr', {}, columns.map((c) => el('th', {}, c)))),
    el('tbody', {}, rows.map((row) => el('tr', {}, row.map((cell) => el('td', {}, cell))))),
  ]);
}

// ---------- line chart with crosshair tooltip ----------

// series: [{ name, color, points: [{x: Date, y: number}] }] — points sorted by x.
export function lineChart(container, { series, height = 260, yFmt = fmtInt }) {
  const width = Math.max(320, container.clientWidth || 600);
  const pad = { top: 14, right: 16, bottom: 26, left: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const allPoints = series.flatMap((s) => s.points);
  if (!allPoints.length) {
    container.replaceChildren(el('div', { class: 'empty' }, 'No matches in this range'));
    return;
  }

  const xs = allPoints.map((p) => p.x.getTime());
  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  if (xMin === xMax) { xMin -= 43200000; xMax += 43200000; }
  const yMax = Math.max(...allPoints.map((p) => p.y), 1);
  const ticks = niceTicks(yMax);
  const yTop = ticks[ticks.length - 1];

  const X = (t) => pad.left + ((t - xMin) / (xMax - xMin)) * plotW;
  const Y = (v) => pad.top + plotH - (v / yTop) * plotH;

  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'img' });

  for (const t of ticks) {
    root.append(svg('line', { x1: pad.left, x2: width - pad.right, y1: Y(t), y2: Y(t), stroke: t === 0 ? CHROME.baseline : CHROME.grid, 'stroke-width': 1 }));
    root.append(svg('text', { x: pad.left - 8, y: Y(t) + 4, 'text-anchor': 'end', fill: CHROME.muted, 'font-size': 11 }, yFmt(t)));
  }

  const spanDays = (xMax - xMin) / 86400000;
  const xTickCount = Math.min(6, Math.max(2, Math.floor(plotW / 90)));
  for (let i = 0; i <= xTickCount; i++) {
    const t = xMin + ((xMax - xMin) * i) / xTickCount;
    const d = new Date(t);
    const label = spanDays > 300 ? d.toLocaleDateString('en-US', { month: 'short' }) : fmtDay(d);
    root.append(svg('text', { x: X(t), y: height - 8, 'text-anchor': 'middle', fill: CHROME.muted, 'font-size': 11 }, label));
  }

  for (const s of series) {
    if (!s.points.length) continue;
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x.getTime()).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
    root.append(svg('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    const last = s.points[s.points.length - 1];
    // end marker with a 2px surface ring so it stays legible over other lines
    root.append(svg('circle', { cx: X(last.x.getTime()), cy: Y(last.y), r: 6, fill: CHROME.surface }));
    root.append(svg('circle', { cx: X(last.x.getTime()), cy: Y(last.y), r: 4, fill: s.color }));
  }

  // crosshair: snap to the nearest distinct x across all series
  const xPositions = [...new Set(xs)].sort((a, b) => a - b);
  const cross = svg('line', { y1: pad.top, y2: pad.top + plotH, stroke: CHROME.baseline, 'stroke-width': 1, visibility: 'hidden' });
  root.append(cross);
  const hoverDots = svg('g');
  root.append(hoverDots);

  let crossIdx = -1;
  const showAt = (idx, clientX, clientY) => {
    crossIdx = idx;
    const t = xPositions[idx];
    cross.setAttribute('x1', X(t));
    cross.setAttribute('x2', X(t));
    cross.setAttribute('visibility', 'visible');
    hoverDots.replaceChildren();
    const rows = [];
    for (const s of series) {
      const p = s.points.find((q) => q.x.getTime() === t);
      if (!p) continue;
      hoverDots.append(svg('circle', { cx: X(t), cy: Y(p.y), r: 6, fill: CHROME.surface }));
      hoverDots.append(svg('circle', { cx: X(t), cy: Y(p.y), r: 4, fill: s.color }));
      rows.push({ name: s.name, color: s.color, value: yFmt(p.y) });
    }
    const d = new Date(t);
    showTooltip(clientX, clientY, d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), rows);
  };
  const hide = () => {
    crossIdx = -1;
    cross.setAttribute('visibility', 'hidden');
    hoverDots.replaceChildren();
    hideTooltip();
  };

  root.addEventListener('pointermove', (ev) => {
    const rect = root.getBoundingClientRect();
    const t = xMin + ((ev.clientX - rect.left - pad.left) / plotW) * (xMax - xMin);
    let best = 0;
    for (let i = 1; i < xPositions.length; i++) {
      if (Math.abs(xPositions[i] - t) < Math.abs(xPositions[best] - t)) best = i;
    }
    showAt(best, ev.clientX, ev.clientY);
  });
  root.addEventListener('pointerleave', hide);

  // keyboard: arrows walk the crosshair, same readout as hover
  container.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    const next = crossIdx < 0
      ? xPositions.length - 1
      : Math.max(0, Math.min(xPositions.length - 1, crossIdx + (ev.key === 'ArrowRight' ? 1 : -1)));
    const rect = root.getBoundingClientRect();
    showAt(next, rect.left + X(xPositions[next]), rect.top + pad.top);
  });
  container.addEventListener('blur', hide);

  container.replaceChildren(root);
}

// ---------- stacked columns ----------

// buckets: [{ label, title, segments: [{ name, color, value }] }]
// Rounded 4px data-end on the outermost segment, square at the baseline,
// 2px surface gaps between touching segments.
export function stackedColumns(container, { buckets, height = 240, yFmt = fmtInt }) {
  const width = Math.max(320, container.clientWidth || 600);
  const pad = { top: 12, right: 8, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (!buckets.length) {
    container.replaceChildren(el('div', { class: 'empty' }, 'No matches in this range'));
    return;
  }

  const totals = buckets.map((b) => b.segments.reduce((sum, s) => sum + s.value, 0));
  const ticks = niceTicks(Math.max(...totals, 1));
  const yTop = ticks[ticks.length - 1];
  const Y = (v) => pad.top + plotH - (v / yTop) * plotH;

  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'img' });

  for (const t of ticks) {
    root.append(svg('line', { x1: pad.left, x2: width - pad.right, y1: Y(t), y2: Y(t), stroke: t === 0 ? CHROME.baseline : CHROME.grid, 'stroke-width': 1 }));
    root.append(svg('text', { x: pad.left - 7, y: Y(t) + 4, 'text-anchor': 'end', fill: CHROME.muted, 'font-size': 11 }, yFmt(t)));
  }

  const band = plotW / buckets.length;
  const barW = Math.min(24, Math.max(6, band * 0.55));
  const labelEvery = Math.ceil(buckets.length / Math.max(2, Math.floor(plotW / 70)));

  buckets.forEach((bucket, i) => {
    const x = pad.left + band * i + (band - barW) / 2;
    let acc = 0;
    const visible = bucket.segments.filter((s) => s.value > 0);
    visible.forEach((seg, j) => {
      const y1 = Y(acc + seg.value);
      const y0 = Y(acc);
      const isOutermost = j === visible.length - 1;
      const gap = j > 0 ? 1 : 0; // 2px surface gap split between neighbors
      const h = Math.max(0.5, y0 - y1 - gap);
      const y = y1;
      let mark;
      if (isOutermost && h > 4) {
        const r = 4;
        mark = svg('path', {
          d: `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${y + h} Z`,
          fill: seg.color,
        });
      } else {
        mark = svg('rect', { x, y, width: barW, height: h, fill: seg.color });
      }
      root.append(mark);
      acc += seg.value;
    });

    if (i % labelEvery === 0) {
      root.append(svg('text', { x: x + barW / 2, y: height - 8, 'text-anchor': 'middle', fill: CHROME.muted, 'font-size': 11 }, bucket.label));
    }

    // full-column hit target (bigger than the marks)
    root.append(
      svg('rect', {
        x: pad.left + band * i, y: pad.top, width: band, height: plotH, fill: 'transparent',
        onpointermove: (ev) =>
          showTooltip(ev.clientX, ev.clientY, bucket.title || bucket.label,
            bucket.segments.map((s) => ({ name: s.name, color: s.color, value: yFmt(s.value) }))),
        onpointerleave: hideTooltip,
      })
    );
  });

  container.replaceChildren(root);
}

// ---------- horizontal bars (single hue) ----------

// items: [{ label, value, note }]
export function hBars(container, { items, color, valueFmt = fmtInt }) {
  const width = Math.max(300, container.clientWidth || 500);
  const rowH = 30;
  const pad = { top: 4, right: 52, bottom: 4, left: 88 };
  const height = pad.top + pad.bottom + items.length * rowH;
  const plotW = width - pad.left - pad.right;

  if (!items.length) {
    container.replaceChildren(el('div', { class: 'empty' }, 'No matches in this range'));
    return;
  }

  const max = Math.max(...items.map((i) => i.value), 1);
  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'img' });
  root.append(svg('line', { x1: pad.left, x2: pad.left, y1: pad.top, y2: height - pad.bottom, stroke: CHROME.baseline, 'stroke-width': 1 }));

  items.forEach((item, i) => {
    const y = pad.top + i * rowH + (rowH - 18) / 2;
    const w = Math.max(1, (item.value / max) * plotW);
    const r = Math.min(4, w / 2);
    root.append(svg('text', { x: pad.left - 8, y: y + 13, 'text-anchor': 'end', fill: CHROME.ink2, 'font-size': 12 }, item.label));
    root.append(svg('path', {
      d: `M${pad.left},${y} L${pad.left + w - r},${y} Q${pad.left + w},${y} ${pad.left + w},${y + r} L${pad.left + w},${y + 18 - r} Q${pad.left + w},${y + 18} ${pad.left + w - r},${y + 18} L${pad.left},${y + 18} Z`,
      fill: color,
    }));
    root.append(svg('text', { x: pad.left + w + 7, y: y + 13, fill: CHROME.ink2, 'font-size': 12, 'font-weight': 600 }, valueFmt(item.value)));
    root.append(svg('rect', {
      x: 0, y: pad.top + i * rowH, width, height: rowH, fill: 'transparent',
      onpointermove: (ev) => showTooltip(ev.clientX, ev.clientY, item.label, [{ name: item.note || 'Matches', value: valueFmt(item.value) }]),
      onpointerleave: hideTooltip,
    }));
  });

  container.replaceChildren(root);
}

// ---------- sparkline (stat-tile / player-card trend) ----------

export function sparkline(values, { width = 220, height = 36, accent = '#9085e9' } = {}) {
  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, width, height, 'aria-hidden': 'true' });
  if (values.length < 2) return root;
  const max = Math.max(...values, 1);
  const X = (i) => 4 + (i / (values.length - 1)) * (width - 12);
  const Y = (v) => 2 + (height - 8) * (1 - v / max);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  root.append(svg('path', { d, fill: 'none', stroke: '#55534e', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  const lastIdx = values.length - 1;
  root.append(svg('circle', { cx: X(lastIdx), cy: Y(values[lastIdx]), r: 5, fill: CHROME.surface }));
  root.append(svg('circle', { cx: X(lastIdx), cy: Y(values[lastIdx]), r: 3.5, fill: accent }));
  return root;
}
