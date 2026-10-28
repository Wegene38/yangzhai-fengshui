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
  '生气': { color: '#b03a2e', level: '大吉', emoji: '🚀', role: '事业财运位', plain: '放书桌、办公桌,或平时最常待的房间' },
  '延年': { color: '#bf5b2a', level: '吉',   emoji: '💞', role: '感情婚姻位', plain: '适合主卧、老人房,家庭和气' },
  '天医': { color: '#c0902a', level: '中吉', emoji: '💪', role: '健康贵人位', plain: '适合睡觉休息,也适合儿童房' },
  '伏位': { color: '#8a9a5b', level: '小吉', emoji: '🍃', role: '平稳安稳位', plain: '适合静养、看书、发呆的好地方' },
  '祸害': { color: '#6b7f8e', level: '小凶', emoji: '🫠', role: '小是小非位', plain: '影响不大,保持整洁就行' },
  '六煞': { color: '#5d6d7e', level: '凶',   emoji: '🗯️', role: '口舌是非位', plain: '留给储物间,少在这儿久待' },
  '五鬼': { color: '#45505c', level: '大凶', emoji: '😤', role: '易吵易燥位', plain: '让厨房、卫生间「镇住」它' },
  '绝命': { color: '#343f4b', level: '大凶', emoji: '⛔', role: '最需要避开', plain: '别当主卧、大门,尽量别久待' },
};

const TRIGRAM_SYMBOL = { '坎': '☵', '离': '☲', '震': '☳', '巽': '☴', '乾': '☰', '坤': '☷', '艮': '☶', '兑': '☱' };
const EAST_FOUR = ['坎', '离', '震', '巽'];
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
let currentGua = '坎';

function updateState() {
  const idx = Math.round(angle / 45) % 8;
  facing = DIRECTIONS[idx];
  const sit = DIRECTIONS[(idx + 4) % 8];
  const gua = DIR_TRIGRAM[sit];
  currentGua = gua;

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

/* =====================================================
   命卦测算模块(第 0 步)
   ===================================================== */
const GROUP_DIRS = {
  '东四命': ['北', '东', '东南', '南'],
  '西四命': ['西', '西北', '东北', '西南'],
};

// 以立春(约 2 月 4 日)为年份分界;年份各位数字反复相加至一位数,
// 男命 11-n、女命 n+4,按 9 取余对应后天八卦(5 男寄坤、女寄艮)。
function computeMingGua(year, month, day, isMale) {
  if (month < 2 || (month === 2 && day < 4)) year -= 1;
  let n = String(year).split('').reduce((sum, ch) => sum + Number(ch), 0);
  while (n > 9) n = String(n).split('').reduce((sum, ch) => sum + Number(ch), 0);
  let num = isMale ? (11 - n) : (n + 4);
  num = ((num - 1) % 9) + 1;
  const map = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: isMale ? '坤' : '艮', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
  return map[num];
}

function polarPt(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function sectorPathOf(cx, cy, r, a0, a1) {
  const p0 = polarPt(cx, cy, r, a0);
  const p1 = polarPt(cx, cy, r, a1);
  return `M ${cx} ${cy} L ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
}

function renderGuaCompass(container, gua) {
  const size = 340, cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const stars = HOUSES[gua];
  let paths = '', labels = '';
  DIRECTIONS.forEach((dir, i) => {
    const star = stars[i];
    const info = STARS[star];
    const a0 = i * 45 - 22.5, a1 = i * 45 + 22.5, mid = i * 45;
    paths += `<path d="${sectorPathOf(cx, cy, r, a0, a1)}" fill="${info.color}" stroke="#f7f3e8" stroke-width="1.5"></path>`;
    const t1 = polarPt(cx, cy, r * 0.82, mid);
    const t2 = polarPt(cx, cy, r * 0.58, mid);
    labels += `<text x="${t1.x.toFixed(1)}" y="${t1.y.toFixed(1)}" fill="#f7f1e3" font-size="15" font-weight="700" text-anchor="middle" dominant-baseline="middle">${star}</text>`;
    labels += `<text x="${t2.x.toFixed(1)}" y="${t2.y.toFixed(1)}" fill="rgba(247,241,227,.92)" font-size="14" text-anchor="middle" dominant-baseline="middle">${dir}</text>`;
  });
  container.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${gua}命八方吉凶图">
      <circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="none" stroke="#b8860b" stroke-width="3"></circle>
      ${paths}
      <circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="#fffdf7" stroke="#b8860b" stroke-width="2"></circle>
      <text x="${cx}" y="${cy - 8}" fill="#a63c2a" font-size="26" font-weight="700" text-anchor="middle" dominant-baseline="middle">${TRIGRAM_SYMBOL[gua]}</text>
      <text x="${cx}" y="${cy + 16}" fill="#2b2620" font-size="14" letter-spacing="4" text-anchor="middle" dominant-baseline="middle">${gua}命</text>
    </svg>`;
}

function starListHtml(names, gua) {
  return names.map(name => {
    const dir = DIRECTIONS[HOUSES[gua].indexOf(name)];
    const s = STARS[name];
    return `<li><b>${s.emoji} ${name} · ${dir}方(${s.role})</b><small>${s.plain}</small></li>`;
  }).join('');
}

const calcForm = document.getElementById('calc-form');
if (calcForm) {
  calcForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const value = document.getElementById('birthdate').value;
    if (!value) return;
    const [year, month, day] = value.split('-').map(Number);
    const isMale = this.gender.value === 'male';
    const gua = computeMingGua(year, month, day, isMale);
    const group = EAST_FOUR.includes(gua) ? '东四命' : '西四命';
    const goodDirs = GROUP_DIRS[group];
    const beforeLichun = month < 2 || (month === 2 && day < 4);

    document.getElementById('result-gua-symbol').textContent = TRIGRAM_SYMBOL[gua];
    document.getElementById('result-gua-name').textContent = gua + '命';
    document.getElementById('result-gua-trigram').textContent = group;
    document.getElementById('result-year').textContent =
      `出生 ${value} · ${isMale ? '男' : '女'}命${beforeLichun ? `(立春前出生,按 ${year - 1} 年计算)` : ''}`;

    document.getElementById('result-summary').innerHTML =
      `📌 <b>一句话解读:</b>你的吉利方向集中在 <b>${goodDirs.join('、')}</b>。` +
      `下面的布局图选你家朝向后,把主卧、书桌尽量安排在「既吉于宅又吉于命」的方向最好;凶方交给厨卫储物。`;

    document.getElementById('result-good').innerHTML = starListHtml(['生气', '延年', '天医', '伏位'], gua);
    document.getElementById('result-bad').innerHTML = starListHtml(['绝命', '五鬼', '六煞', '祸害'], gua);
    document.getElementById('result-sleep').innerHTML =
      `🛏️ <b>睡觉小技巧:</b>床头尽量靠吉方(${goodDirs.join(' / ')})的墙。就算不信这个,床头靠实墙、不靠窗,也确实睡得更踏实。`;

    renderGuaCompass(document.getElementById('calc-compass'), gua);
    document.getElementById('calc-result').hidden = false;
  });
}

/* ---------- 户型图读取 ---------- */
const ROOM_TYPES = { door: '大门', master: '主卧', bed: '次卧', kids: '儿童房', study: '书房', kitchen: '厨房', toilet: '卫生间', living: '客厅', store: '储物间', balcony: '阳台' };
const ROOM_EMOJI2 = { door: '🚪', master: '🛏️', bed: '🛌', kids: '🧒', study: '📚', kitchen: '🍳', toilet: '🚽', living: '🛋️', store: '📦', balcony: '🪴' };
const JI_SET = new Set(['生气', '延年', '天医', '伏位']);

function renderPlanMarks() {
  const body = document.getElementById('plan-body');
  if (!body || !currentTaken) return;
  let plan = null;
  try { plan = JSON.parse(localStorage.getItem('yz_plan_v1')); } catch (e) { /* ignore */ }
  if (!plan || !Array.isArray(plan.marks)) return;
  const marks = plan.marks.filter(m => ROOM_TYPES[m.t]);
  if (!marks.length) return;

  const gua = currentGua;
  const rows = marks.map(m => {
    const dx = m.x - plan.cx, dy = m.y - plan.cy;
    const bearing = ((Math.atan2(dx, -dy) * 180 / Math.PI + (plan.north || 0)) % 360 + 360) % 360;
    const dir = DIRECTIONS[Math.round(bearing / 45) % 8];
    const star = HOUSES[gua][DIRECTIONS.indexOf(dir)];
    const s = STARS[star];
    const cls = JI_SET.has(star) ? 'good' : 'neg';
    let note;
    if (m.t === 'door') note = JI_SET.has(star) ? '开门见吉,保持门口整洁明亮即可。' : '凶星把门别慌:玄关屏风缓冲 + 门口亮堂整洁,化解大半。';
    else if (m.t === 'toilet' || m.t === 'kitchen' || m.t === 'store') note = JI_SET.has(star) ? '有点可惜:吉位最好留给卧室书房;不过保持整洁就好,不必焦虑。' : '正合适:让厨卫储物「镇」凶位,物尽其用。';
    else note = JI_SET.has(star) ? `${s.role}:适合${s.plain}。` : `${s.role}:${s.plain}。若能换到吉方更好,换不了就保持整洁明亮。`;
    return `<li><span class="${cls}">${ROOM_EMOJI2[m.t]} ${ROOM_TYPES[m.t]} · ${dir}方 — ${star}(${s.level})</span><small>${note}</small></li>`;
  }).join('');

  body.innerHTML = `<ul class="result-list">${rows}</ul>
    <p style="font-size:.85rem;color:var(--ink-soft)">按户型图标注的北向计算;调整上方罗盘的朝向可切换宅卦重新对照。</p>`;
}

// 挂到 updateState 之后再渲染一次户型读取
const _origUpdateState = updateState;
updateState = function () { _origUpdateState(); renderPlanMarks(); };
updateState();

/* ---------- 页脚年份 ---------- */
const fy = document.getElementById('footer-year');
if (fy) fy.textContent = new Date().getFullYear();
