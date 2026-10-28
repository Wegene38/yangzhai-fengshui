/* ========== 户型图标注器 ========== */

const DIRECTIONS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
const R2D = 180 / Math.PI;

// 标记类型库:id, emoji, 名称, 分组
const TYPES = [
  { id: 'door', emoji: '🚪', name: '大门', group: '功能区(门派分析用)' },
  { id: 'master', emoji: '🛏️', name: '主卧', group: '功能区(门派分析用)' },
  { id: 'bed', emoji: '🛌', name: '次卧', group: '功能区(门派分析用)' },
  { id: 'kids', emoji: '🧒', name: '儿童房', group: '功能区(门派分析用)' },
  { id: 'study', emoji: '📚', name: '书房', group: '功能区(门派分析用)' },
  { id: 'kitchen', emoji: '🍳', name: '厨房', group: '功能区(门派分析用)' },
  { id: 'toilet', emoji: '🚽', name: '卫生间', group: '功能区(门派分析用)' },
  { id: 'living', emoji: '🛋️', name: '客厅', group: '功能区(门派分析用)' },
  { id: 'store', emoji: '📦', name: '储物间', group: '功能区(门派分析用)' },
  { id: 'balcony', emoji: '🪴', name: '阳台', group: '功能区(门派分析用)' },
  { id: 'sha', emoji: '⛰️', name: '砂(高实)', group: '砂水(金锁玉关用)' },
  { id: 'shui', emoji: '💧', name: '水(低动)', group: '砂水(金锁玉关用)' },
  { id: 'high', emoji: '🏔️', name: '高楼/山', group: '环境(峦头派用)' },
  { id: 'tree', emoji: '🌳', name: '大树', group: '环境(峦头派用)' },
  { id: 'road', emoji: '🛣️', name: '道路', group: '环境(峦头派用)' },
  { id: 'rush', emoji: '➡️', name: '直冲路', group: '环境(峦头派用)' },
  { id: 'curve', emoji: '🌙', name: '反弓路', group: '环境(峦头派用)' },
  { id: 'jade', emoji: '🎀', name: '环抱路', group: '环境(峦头派用)' },
  { id: 'water', emoji: '🌊', name: '河湖', group: '环境(峦头派用)' },
  { id: 'bridge', emoji: '🌉', name: '天桥', group: '环境(峦头派用)' },
  { id: 'power', emoji: '⚡', name: '电塔', group: '环境(峦头派用)' },
  { id: 'sharp', emoji: '📐', name: '尖角/楼缝', group: '环境(峦头派用)' },
  { id: 'open', emoji: '⬜', name: '空地/明堂', group: '环境(峦头派用)' },
];
const TYPE_BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]));

const norm360 = a => ((a % 360) + 360) % 360;

// ---------- 状态(持久化到 localStorage) ----------
const KEY = 'yz_plan_v1';
let plan = { img: null, cx: 50, cy: 50, north: 0, marks: [] };
let curType = 'door';

try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && typeof saved === 'object') plan = Object.assign(plan, saved);
} catch (e) { /* ignore */ }

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    let msg = '已自动保存 ✓ 可去下方门派分析';
    try {
      localStorage.setItem(KEY, JSON.stringify(plan));
    } catch (e) {
      try {
        const slim = Object.assign({}, plan, { img: null });
        localStorage.setItem(KEY, JSON.stringify(slim));
        msg = '标注已保存(图片太大未缓存,刷新后需重新选图)';
      } catch (e2) { msg = '保存失败:浏览器存储空间不足'; }
    }
    document.getElementById('save-status').textContent = msg;
  }, 250);
}

// ---------- DOM ----------
const stage = document.getElementById('stage');
const palette = document.getElementById('palette');
const markList = document.getElementById('mark-list');
const northInput = document.getElementById('north');

function dirOfMark(m) {
  const dx = m.x - plan.cx, dy = m.y - plan.cy;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return '中';
  const bearing = norm360(Math.atan2(dx, -dy) * R2D + plan.north);
  return DIRECTIONS[Math.round(bearing / 45) % 8];
}

// ---------- 调色板 ----------
function buildPalette() {
  let lastGroup = '';
  palette.innerHTML = '';
  TYPES.forEach(t => {
    if (t.group !== lastGroup) {
      lastGroup = t.group;
      const label = document.createElement('span');
      label.className = 'pal-group';
      label.textContent = `— ${t.group} —`;
      palette.appendChild(label);
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${t.emoji} ${t.name}`;
    btn.dataset.id = t.id;
    btn.addEventListener('click', () => { curType = t.id; renderPalette(); });
    palette.appendChild(btn);
  });
  renderPalette();
}

function renderPalette() {
  palette.querySelectorAll('button').forEach(b =>
    b.classList.toggle('active', b.dataset.id === curType));
}

// ---------- 舞台渲染 ----------
let roseSvg = null;

function renderStage() {
  const hasImg = !!plan.img;
  document.getElementById('stage-empty').style.display = hasImg ? 'none' : 'flex';
  document.getElementById('north-val').textContent = plan.north + '°';
  if (!hasImg) { stage.innerHTML = '<div class="stage-empty" id="stage-empty"><span style="font-size:2.2rem">📐</span><span>还没有户型图<br/>先在上面选择一张图片</span></div>'; roseSvg = null; return; }

  let img = stage.querySelector('img.plan-img');
  if (!img || img.src !== plan.img) {
    stage.innerHTML = '';
    img = document.createElement('img');
    img.className = 'plan-img';
    img.src = plan.img;
    img.alt = '户型图';
    stage.appendChild(img);
    roseSvg = null;
  }

  // 方向环
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!roseSvg) {
    roseSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    roseSvg.id = 'rose';
    stage.appendChild(roseSvg);
  }
  roseSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const cx = plan.cx / 100 * w, cy = plan.cy / 100 * h;
  const R = Math.min(w, h) * 0.36;
  let g = `<g opacity="0.8">`;
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 - plan.north - 90) * Math.PI / 180;
    g += `<line x1="${cx}" y1="${cy}" x2="${(cx + R * Math.cos(a)).toFixed(1)}" y2="${(cy + R * Math.sin(a)).toFixed(1)}" stroke="#b8860b" stroke-width="1" stroke-dasharray="2 5"/>`;
    const la = (i * 45 - plan.north - 90) * Math.PI / 180;
    const lx = cx + (R + 16) * Math.cos(la), ly = cy + (R + 16) * Math.sin(la);
    g += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" font-size="13" font-weight="700" fill="${DIRECTIONS[i] === '北' ? '#a63c2a' : '#8a7a5c'}" text-anchor="middle">${DIRECTIONS[i]}</text>`;
  }
  g += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R.toFixed(1)}" fill="none" stroke="#d4af37" stroke-width="1.5" stroke-dasharray="4 5"/></g>`;
  roseSvg.innerHTML = g;

  // 中心点
  let dot = stage.querySelector('#center-dot');
  if (!dot) {
    dot = document.createElement('div');
    dot.id = 'center-dot';
    dot.title = '立极点(按住拖动)';
    stage.appendChild(dot);
  }
  dot.style.left = plan.cx + '%';
  dot.style.top = plan.cy + '%';

  // 标记
  stage.querySelectorAll('.mark').forEach(el => el.remove());
  plan.marks.forEach((m, i) => {
    const t = TYPE_BY_ID[m.t];
    const el = document.createElement('div');
    el.className = 'mark';
    el.dataset.idx = i;
    el.style.left = m.x + '%';
    el.style.top = m.y + '%';
    el.textContent = `${t.emoji} ${t.name}`;
    stage.appendChild(el);
  });

  renderMarkList();
}

function renderMarkList() {
  if (!plan.marks.length) {
    markList.innerHTML = '<span style="color:var(--ink-soft);font-size:.88rem">还没有标记。选个类型,点图放置。</span>';
    return;
  }
  markList.innerHTML = plan.marks.map((m, i) => {
    const t = TYPE_BY_ID[m.t];
    return `<span class="chip-item">${t.emoji} ${t.name} · <span class="dir-tag">${dirOfMark(m)}方</span><button data-del="${i}" title="删除">✕</button></span>`;
  }).join('');
  markList.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => {
      plan.marks.splice(Number(b.dataset.del), 1);
      save(); renderStage();
    }));
}

// ---------- 交互:拖动 + 放置 ----------
let dragIdx = null; // 'center' | number

function stagePos(e) {
  const r = stage.getBoundingClientRect();
  return {
    x: Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)),
    y: Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100)),
  };
}

stage.addEventListener('pointerdown', e => {
  const mark = e.target.closest('.mark');
  if (mark) { dragIdx = Number(mark.dataset.idx); }
  else if (e.target.id === 'center-dot') { dragIdx = 'center'; }
  else {
    if (!plan.img) return;
    const p = stagePos(e);
    plan.marks.push({ t: curType, x: +p.x.toFixed(2), y: +p.y.toFixed(2) });
    save(); renderStage();
    return;
  }
  stage.setPointerCapture(e.pointerId);
  e.preventDefault();
});

stage.addEventListener('pointermove', e => {
  if (dragIdx === null) return;
  const p = stagePos(e);
  if (dragIdx === 'center') { plan.cx = +p.x.toFixed(2); plan.cy = +p.y.toFixed(2); }
  else { plan.marks[dragIdx].x = +p.x.toFixed(2); plan.marks[dragIdx].y = +p.y.toFixed(2); }
  save(); renderStage();
});

const endDrag = () => { dragIdx = null; };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

// ---------- 控件 ----------
northInput.addEventListener('input', function () {
  plan.north = Number(this.value);
  save(); renderStage();
});

document.getElementById('file').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // 压缩:最长边 1400px, JPEG 0.82
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      plan.img = canvas.toDataURL('image/jpeg', 0.82);
      save(); renderStage();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  this.value = '';
});

document.getElementById('clear-btn').addEventListener('click', () => {
  plan = { img: null, cx: 50, cy: 50, north: 0, marks: [] };
  save(); renderStage();
});

window.addEventListener('resize', () => renderStage());

// ---------- 初始化 ----------
buildPalette();
renderStage();
