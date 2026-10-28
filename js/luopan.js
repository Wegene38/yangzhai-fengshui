/* ========== 阳宅罗盘 · 交互逻辑 ========== */

// 八方顺序(顺时针,北在上;角度 0°=北,顺时针每 45° 一格)
const DIRECTIONS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
const DIR_TRIGRAM = { '北': '坎', '东北': '艮', '东': '震', '东南': '巽', '南': '离', '西南': '坤', '西': '兑', '西北': '乾' };

// 八宅法:各宅八方吉凶星(顺序与 DIRECTIONS 一致,出自大游年歌)
const HOUSES = {
  '坎': ['伏位', '五鬼', '天医', '生气', '延年', '绝命', '祸害', '六煞'],
  '艮': ['五鬼', '伏位', '六煞', '绝命', '祸害', '生气', '延年', '天医'],
  '震': ['天医', '六煞', '伏位', '延年', '生气', '祸害', '绝命', '五鬼'],
  '巽': ['生气', '绝命', '延年', '伏位', '天医', '五鬼', '六煞', '祸害'],
  '离': ['延年', '祸害', '生气', '天医', '伏位', '六煞', '五鬼', '绝命'],
  '坤': ['绝命', '生气', '祸害', '五鬼', '六煞', '伏位', '天医', '延年'],
  '兑': ['祸害', '延年', '绝命', '六煞', '五鬼', '天医', '伏位', '生气'],
  '乾': ['六煞', '天医', '五鬼', '祸害', '绝命', '延年', '生气', '伏位'],
};

const STARS = {
  '生气': { color: '#b03a2e', level: '大吉' },
  '延年': { color: '#bf5b2a', level: '吉' },
  '天医': { color: '#c0902a', level: '中吉' },
  '伏位': { color: '#8a9a5b', level: '小吉' },
  '祸害': { color: '#6b7f8e', level: '小凶' },
  '六煞': { color: '#5d6d7e', level: '凶' },
  '五鬼': { color: '#45505c', level: '大凶' },
  '绝命': { color: '#343f4b', level: '大凶' },
};

const TRIGRAM_SYMBOL = { '坎': '☵', '离': '☲', '震': '☳', '巽': '☴', '乾': '☰', '坤': '☷', '艮': '☶', '兑': '☱' };
const SIT_LABEL = {
  '坎': '坐北朝南', '艮': '坐东北朝西南', '震': '坐东朝西', '巽': '坐东南朝西北',
  '离': '坐南朝北', '坤': '坐西南朝东北', '兑': '坐西朝东', '乾': '坐西北朝东南',
};

const JI_STARS = ['生气', '延年', '天医', '伏位'];

// 各房间偏好:吉方按 主卧>老人房>儿童房>书房 优先级抢占;凶方同理
const JI_PREFS = {
  '主卧': ['生气', '延年', '天医', '伏位'],
  '老人房': ['延年', '天医', '伏位', '生气'],
  '儿童房': ['天医', '伏位', '生气', '延年'],
  '书房': ['伏位', '天医', '生气', '延年'],
};
const XIONG_PREFS = {
  '卫生间': ['绝命', '五鬼', '六煞', '祸害'],
  '厨房': ['祸害', '六煞', '五鬼', '绝命'],
  '储物间': ['六煞', '五鬼', '祸害', '绝命'],
  '阳台/杂物': ['五鬼', '绝命', '祸害', '六煞'],
};

const ROOM_EMOJI = {
  '大门': '🚪', '主卧': '🛏️', '老人房': '👴', '儿童房': '🧒', '书房': '📚',
  '厨房': '🍳', '卫生间': '🚽', '储物间': '📦', '阳台/杂物': '🪴', '客厅': '🛋️',
};

/* ---------- 房间分配 ---------- */
function dirOfStar(gua, star) {
  return DIRECTIONS[HOUSES[gua].indexOf(star)];
}

function assignRooms(gua, facing) {
  const starOf = d => HOUSES[gua][DIRECTIONS.indexOf(d)];
  const taken = {};
  taken[facing] = { role: '大门', star: starOf(facing) };

  // 大门占了吉位时,吉方剩 3 格给主卧/儿童房/书房;否则 4 格含老人房
  const jiRoles = JI_STARS.includes(taken[facing].star)
    ? ['主卧', '儿童房', '书房']
    : ['主卧', '老人房', '儿童房', '书房'];
  for (const role of jiRoles) {
    const dir = JI_PREFS[role].map(s => dirOfStar(gua, s)).find(d => !taken[d]);
    if (dir) taken[dir] = { role, star: starOf(dir) };
  }
  for (const role of ['卫生间', '厨房', '储物间', '阳台/杂物']) {
    const dir = XIONG_PREFS[role].map(s => dirOfStar(gua, s)).find(d => !taken[d]);
    if (dir) taken[dir] = { role, star: starOf(dir) };
  }
  return taken;
}

function roomDetail(role, star) {
  const s = STARS[star];
  let why = '', tip = '';
  switch (role) {
    case '大门':
      why = `大门是全屋的「气口」,像人的嘴巴,一家人的气都从这儿进。它落在${star}(${s.level})位。`;
      tip = JI_STARS.includes(star)
        ? '开门见吉!保持门口整洁、明亮、无杂物,好运加倍。'
        : '凶星把门也别慌:进门设玄关或屏风缓冲,门口保持亮堂整洁,就能化解大半。';
      break;
    case '主卧':
      why = `${star}是第一吉位,主事业财运与精力。把最重要的休息房间放这儿,等于每晚都在吉方「充电」。`;
      tip = '床头靠这间屋的吉方墙,别正对房门。';
      break;
    case '老人房':
      why = `${star}主感情和睦与健康长寿,长辈住这里最合适。`;
      tip = '房间宜安静温暖,被褥常晒。';
      break;
    case '儿童房':
      why = `${star}主健康与活力,孩子住这里精神好、少闹小毛病。`;
      tip = '书桌朝房间里的吉方摆,背后靠墙。';
      break;
    case '书房':
      why = `${star}安稳沉静,最适合需要专注的学习和工作。`;
      tip = '座位背后靠墙,别背对门,也别坐在横梁下面。';
      break;
    case '厨房':
      why = `老话说「火烧凶方」——灶火把 ${star}(${s.level}) 的煞气压住烧掉,化不利为有利。`;
      tip = '灶台别正对厨房门;保持干净整齐。';
      break;
    case '卫生间':
      why = `把家里最不利的方位给卫生间,让污气「镇住」${star},其他房间就安全了。`;
      tip = '常闭门、常通风,马桶盖盖上。';
      break;
    case '储物间':
      why = `不常待的空间放在 ${star}(${s.level}) 位,影响最小,物尽其用。`;
      tip = '保持整齐,别堆成卫生死角。';
      break;
    case '阳台/杂物':
      why = `阳台杂物区放在 ${star} 位,影响不大,还能起缓冲作用。`;
      tip = '保持通风采光,杂物勤收拾。';
      break;
    case '客厅':
      why = '中宫是全屋核心,宜空旷明亮,是一家人的「聚气」中心。';
      tip = '别堆杂物,采光尽量好。';
      break;
  }
  return { why, tip };
}

/* ---------- 罗盘绘制 ---------- */
const SIZE = 340, CX = 170, CY = 170;
const dial = document.getElementById('dial');
const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text) el.textContent = text;
  return el;
}

let rotor;

function buildDial() {
  // 固定外环
  dial.appendChild(svgEl('circle', { cx: CX, cy: CY, r: 163, fill: '#fffdf7', stroke: '#b8860b', 'stroke-width': 3 }));
  dial.appendChild(svgEl('circle', { cx: CX, cy: CY, r: 112, fill: 'none', stroke: '#ddd3bd', 'stroke-width': 1, 'stroke-dasharray': '3 6' }));

  // 固定八方文字(r=128,红色北)
  DIRECTIONS.forEach((dir, i) => {
    const rad = ((i * 45 - 90) * Math.PI) / 180;
    const x = CX + 128 * Math.cos(rad);
    const y = CY + 128 * Math.sin(rad);
    const main = i % 2 === 0;
    dial.appendChild(svgEl('text', {
      x: x.toFixed(1), y: y.toFixed(1),
      fill: dir === '北' ? '#a63c2a' : '#5c5346',
      'font-size': main ? 16 : 12.5,
      'font-weight': main ? 700 : 400,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
    }, dir));
  });

  // 北极星标记(顶部小三角)
  dial.appendChild(svgEl('polygon', { points: '170,6 163,19 177,19', fill: '#a63c2a' }));

  // 旋转组:房屋方块
  rotor = svgEl('g', { id: 'rotor' });
  rotor.style.transformOrigin = `${CX}px ${CY}px`;
  rotor.style.transition = 'transform .35s cubic-bezier(.2,.8,.3,1.15)';

  rotor.appendChild(svgEl('rect', { x: 95, y: 95, width: 150, height: 150, rx: 12, fill: '#f2ead6', stroke: '#b8860b', 'stroke-width': 2 }));
  // 3x3 淡格线
  [145, 195].forEach(p => {
    rotor.appendChild(svgEl('line', { x1: p, y1: 99, x2: p, y2: 241, stroke: '#ddd3bd', 'stroke-width': 1 }));
    rotor.appendChild(svgEl('line', { x1: 99, y1: p, x2: 241, y2: p, stroke: '#ddd3bd', 'stroke-width': 1 }));
  });
  // 大门标记(方块上边,随方块旋转)
  rotor.appendChild(svgEl('rect', { x: 152, y: 91, width: 36, height: 9, rx: 3, fill: '#a63c2a' }));
  rotor.appendChild(svgEl('text', { x: 170, y: 116, fill: '#7e2a1d', 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle' }, '大门'));
  rotor.appendChild(svgEl('text', { x: 170, y: 176, 'font-size': 30, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, '🏠'));
  rotor.appendChild(svgEl('text', { x: 170, y: 206, fill: '#5c5346', 'font-size': 11, 'text-anchor': 'middle' }, '你家'));

  dial.appendChild(rotor);
}

/* ---------- 罗盘交互:拖拽 + 按钮 ---------- */
let angle = 180; // 0°=大门朝北;初始朝南(坐北朝南,最常见)
let dragging = false;
let facing = '南';

function setAngle(a, animate) {
  angle = ((a % 360) + 360) % 360;
  rotor.style.transition = animate ? 'transform .35s cubic-bezier(.2,.8,.3,1.15)' : 'none';
  rotor.style.transform = `rotate(${angle}deg)`;
}

function eventAngle(e) {
  const rect = dial.getBoundingClientRect();
  const scale = SIZE / rect.width;
  const x = (e.clientX - rect.left) * scale - CX;
  const y = (e.clientY - rect.top) * scale - CY;
  return (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
}

dial.addEventListener('pointerdown', e => {
  dragging = true;
  dial.setPointerCapture(e.pointerId);
  setAngle(eventAngle(e), false);
});
dial.addEventListener('pointermove', e => { if (dragging) setAngle(eventAngle(e), false); });
dial.addEventListener('pointerup', () => { dragging = false; snapToNearest(); });
dial.addEventListener('pointercancel', () => { dragging = false; snapToNearest(); });

function snapToNearest() {
  setAngle(Math.round(angle / 45) * 45, true);
  updateState();
}

/* ---------- 方向按钮 ---------- */
const dirGrid = document.getElementById('dir-grid');
DIRECTIONS.forEach(dir => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '朝' + dir;
  btn.dataset.dir = dir;
  btn.addEventListener('click', () => {
    setAngle(DIRECTIONS.indexOf(dir) * 45, true);
    updateState();
  });
  dirGrid.appendChild(btn);
});

/* ---------- 状态与布局更新 ---------- */
let currentTaken = null;

function updateState() {
  const idx = Math.round(angle / 45) % 8;
  facing = DIRECTIONS[idx];
  const sit = DIRECTIONS[(idx + 4) % 8];
  const gua = DIR_TRIGRAM[sit];

  // 记住选择,日照模拟器会自动同步这个朝向
  try { localStorage.setItem('yz_facing_idx', String(((idx % 8) + 8) % 8)); } catch (e) { /* ignore */ }

  document.getElementById('facing').textContent = facing;
  document.getElementById('sitting').textContent = sit;
  document.getElementById('gua-name').textContent = `${TRIGRAM_SYMBOL[gua]} ${gua}宅`;

  document.querySelectorAll('#dir-grid button').forEach(b =>
    b.classList.toggle('active', b.dataset.dir === facing));

  document.getElementById('layout-title').textContent =
    `${gua}宅(${SIT_LABEL[gua]})`;

  currentTaken = assignRooms(gua, facing);
  renderLayout(gua, facing, currentTaken);
}

function renderLayout(gua, facing, taken) {
  const grid = document.getElementById('layout-grid');
  grid.innerHTML = '';
  const order = ['西北', '北', '东北', '西', 'CENTER', '东', '西南', '南', '东南'];

  order.forEach(key => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    if (key === 'CENTER') {
      cell.style.background = '#9a7b2f';
      cell.innerHTML = `<span class="cell-room">🛋️ 客厅</span><span class="cell-star">中宫 · 聚气</span><span class="cell-dir">全屋中心</span>`;
      cell.addEventListener('click', () => selectCell(cell, '客厅', '中宫'));
    } else {
      const info = taken[key];
      const s = STARS[info.star];
      cell.style.background = s.color;
      if (info.role === '大门') cell.classList.add('door');
      cell.innerHTML =
        `<span class="cell-room">${ROOM_EMOJI[info.role]} ${info.role}</span>` +
        `<span class="cell-star">${info.star} · ${s.level}</span>` +
        `<span class="cell-dir">${key}方</span>`;
      cell.addEventListener('click', () => selectCell(cell, info.role, key, info.star));
    }
    grid.appendChild(cell);
  });

  // 默认选中大门格
  const doorCell = grid.querySelector('.cell.door');
  if (doorCell) doorCell.click();
}

function selectCell(cell, role, dir, star) {
  document.querySelectorAll('#layout-grid .cell').forEach(c => c.classList.remove('active'));
  cell.classList.add('active');
  const detail = document.getElementById('room-detail');
  if (role === '客厅') {
    const { why, tip } = roomDetail(role, '伏位');
    detail.innerHTML = `<h4>🛋️ 客厅 · 中宫(全屋中心)</h4><p>${why}</p><p class="detail-tip">💡 ${tip}</p>`;
  } else {
    const { why, tip } = roomDetail(role, star);
    detail.innerHTML =
      `<h4>${ROOM_EMOJI[role]} ${role} · ${dir}方 — ${star}(${STARS[star].level})</h4>` +
      `<p>${why}</p><p class="detail-tip">💡 ${tip}</p>`;
  }
}

/* ---------- 初始化 ---------- */
buildDial();
setAngle(angle, false);
updateState();
