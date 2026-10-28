/* ========== 日照模拟器 · 太阳位置与互动图表 ========== */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const DIRECTIONS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];

// 四个代表节气(太阳直射点纬度 = 赤纬)
const SEASONS = [
  { key: 'chunfen', name: '春分', date: '3 月 21 日前后', decl: 0,     color: '#8a9a5b' },
  { key: 'xiazhi',  name: '夏至', date: '6 月 21 日前后', decl: 23.44, color: '#e67e22' },
  { key: 'qiufen',  name: '秋分', date: '9 月 23 日前后', decl: 0,     color: '#c0902a' },
  { key: 'dongzhi', name: '冬至', date: '12 月 21 日前后', decl: -23.44, color: '#5d8aa8' },
];

const norm180 = a => ((a % 360) + 540) % 360 - 180;
const norm360 = a => ((a % 360) + 360) % 360;
const clamp1 = v => Math.max(-1, Math.min(1, v));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// 太阳位置(地平坐标系):高度角 alt、方位角 az(北=0,顺时针)
function solar(latDeg, declDeg, hour) {
  const φ = latDeg * D2R, δ = declDeg * D2R, H = (hour - 12) * 15 * D2R;
  const E = -Math.cos(δ) * Math.sin(H);
  const N = Math.cos(φ) * Math.sin(δ) - Math.sin(φ) * Math.cos(δ) * Math.cos(H);
  const U = Math.sin(φ) * Math.sin(δ) + Math.cos(φ) * Math.cos(δ) * Math.cos(H);
  return { alt: Math.asin(clamp1(U)) * R2D, az: (Math.atan2(E, N) * R2D + 360) % 360 };
}

function dayLength(latDeg, declDeg) {
  const cosH0 = -Math.tan(latDeg * D2R) * Math.tan(declDeg * D2R);
  if (cosH0 <= -1) return 24;
  if (cosH0 >= 1) return 0;
  return 2 * Math.acos(cosH0) * R2D / 15;
}

// 朝向墙面全天受晒时长(小时)
function facadeHours(latDeg, declDeg, facingDeg) {
  const dl = dayLength(latDeg, declDeg);
  if (dl <= 0) return 0;
  let hours = 0;
  for (let t = 12 - dl / 2; t <= 12 + dl / 2; t += 0.05) {
    const { alt, az } = solar(latDeg, declDeg, t);
    if (alt > 0 && Math.abs(norm180(az - facingDeg)) < 90) hours += 0.05;
  }
  return Math.round(hours * 10) / 10;
}

const noonAlt = (latDeg, declDeg) => 90 - Math.abs(latDeg - declDeg);

const fmtTime = t => {
  t = ((t % 24) + 24) % 24;
  const h = Math.floor(t), m = Math.round((t - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m === 60 ? 0 : m).padStart(2, '0')}`;
};

const fmtCN = t => {
  t = ((t % 24) + 24) % 24;
  const h = Math.floor(t), m = Math.floor((t - h) * 60);
  const cn = h < 6 ? '凌晨' : h < 11 ? '上午' : h < 13 ? '中午' : h < 18 ? '下午' : '晚上';
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  return `${cn} ${h12}:${String(m).padStart(2, '0')}`;
};

const dirName = az => DIRECTIONS[Math.round(norm360(az) / 45) % 8];

/* ---------- 全局状态 ---------- */
let lat = 39.9;
let facing = 180;                 // 朝向角度:北=0 顺时针
let selSeason = SEASONS[3];       // 默认冬至
let t = 9;                        // 当前时刻(真太阳时)
let secAlt = 26.7;                // 剖面图太阳高度角

const CITIES = [
  { name: '北京', lat: 39.9 }, { name: '上海', lat: 31.2 }, { name: '广州', lat: 23.1 },
  { name: '成都', lat: 30.6 }, { name: '哈尔滨', lat: 45.8 }, { name: '乌鲁木齐', lat: 43.8 },
  { name: '武汉', lat: 30.6 }, { name: '拉萨', lat: 29.7 },
];

try {
  const saved = parseInt(localStorage.getItem('yz_facing_idx'), 10);
  if (!Number.isNaN(saved)) facing = (((saved % 8) + 8) % 8) * 45;
} catch (e) { /* ignore */ }

function saveFacing() {
  try { localStorage.setItem('yz_facing_idx', String(Math.round(norm360(facing) / 45) % 8)); } catch (e) { /* ignore */ }
}

function dayWindow() {
  const dl = dayLength(lat, selSeason.decl);
  return { dl, rise: 12 - dl / 2, set: 12 + dl / 2 };
}

/* ---------- ① 设置区 ---------- */
const cityChips = document.getElementById('city-chips');
CITIES.forEach(c => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = `${c.name} ${c.lat}°`;
  btn.dataset.lat = c.lat;
  btn.addEventListener('click', () => {
    lat = c.lat;
    document.getElementById('lat').value = c.lat;
    clampTimes();
    renderAll();
  });
  cityChips.appendChild(btn);
});

document.getElementById('lat').addEventListener('input', function () {
  const v = parseFloat(this.value);
  if (!Number.isNaN(v) && v >= -66 && v <= 66) { lat = v; clampTimes(); renderAll(); }
});

const dirGrid = document.getElementById('dir-grid');
DIRECTIONS.forEach((dir, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '朝' + dir;
  btn.dataset.idx = i;
  btn.addEventListener('click', () => { facing = i * 45; saveFacing(); clampTimes(); renderAll(); });
  dirGrid.appendChild(btn);
});

const seasonTabs = document.getElementById('season-tabs');
SEASONS.forEach(s => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = s.name;
  btn.dataset.key = s.key;
  btn.addEventListener('click', () => { selSeason = s; clampTimes(); renderAll(); });
  seasonTabs.appendChild(btn);
});

function clampTimes() {
  const { rise, set } = dayWindow();
  t = clamp(t, rise + 0.02, Math.max(rise + 0.02, set - 0.02));
  secAlt = clamp(secAlt, 4, 80);
}

/* ---------- ② 互动俯视图 ---------- */
const topSvg = document.getElementById('top-svg');
const TW = 420, TC = 210, R_SUN = 160;
const HOUSE_HW = 120, HOUSE_HH = 88; // 面宽/进深(px,约 10px=1m)

// 凸包(影子多边形用,8 个点)
function hull(pts) {
  pts = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}

function viewPoint(viewDeg, r) {
  const a = viewDeg * D2R;
  return [TC + r * Math.sin(a), TC - r * Math.cos(a)];
}

// 由拖拽位置反推时刻:在当日弧线上找方位最接近的点
function timeFromPointer(px, py) {
  const viewAng = Math.atan2(px - TC, -(py - TC)) * R2D;
  const azWanted = norm360(viewAng + facing);
  const { rise, set } = dayWindow();
  let best = rise, bestDiff = 1e9;
  for (let tt = rise; tt <= set + 1e-6; tt += 0.02) {
    const diff = Math.abs(norm180(solar(lat, selSeason.decl, tt).az - azWanted));
    if (diff < bestDiff) { bestDiff = diff; best = tt; }
  }
  return { t: best, night: bestDiff > 10 };
}

function renderTop(nightMsg) {
  const s = selSeason;
  const { rise, set, dl } = dayWindow();
  const { alt, az } = solar(lat, s.decl, t);
  const delta = norm180(az - facing);
  const facingName = DIRECTIONS[Math.round(norm360(facing) / 45) % 8];

  let g = '';

  // 夜环(全天圆)与白昼弧(金色轨迹)
  g += `<circle cx="${TC}" cy="${TC}" r="${R_SUN}" fill="none" stroke="#e5dcc6" stroke-width="2" stroke-dasharray="3 6"/>`;
  if (dl > 0.01) {
    const azR = solar(lat, s.decl, rise).az, azS = solar(lat, s.decl, set).az;
    const [x1, y1] = viewPoint(norm180(azR - facing), R_SUN);
    const [x2, y2] = viewPoint(norm180(azS - facing), R_SUN);
    const span = norm360(azS - azR);
    g += `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R_SUN} ${R_SUN} 0 ${span > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="#d4af37" stroke-width="5" stroke-linecap="round" opacity="0.85"/>`;
    g += `<text x="${x1.toFixed(1)}" y="${(y1 - 10).toFixed(1)}" font-size="11" fill="#b8860b" text-anchor="middle">日出</text>`;
    g += `<text x="${x2.toFixed(1)}" y="${(y2 - 10).toFixed(1)}" font-size="11" fill="#b8860b" text-anchor="middle">日落</text>`;
  }

  // 世界方位标注(随朝向旋转,北为红色)
  DIRECTIONS.forEach((dir, i) => {
    const [x, y] = viewPoint(i * 45 - facing, 198);
    g += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="11" fill="${dir === '北' ? '#a63c2a' : '#8a7a5c'}" font-weight="${dir === '北' ? 700 : 400}" text-anchor="middle" dominant-baseline="middle">${dir}</text>`;
  });

  // 影子(10m 高楼的凸包,裁剪在图内)
  if (alt > 1) {
    const L = Math.min(100 / Math.tan(Math.max(alt, 3) * D2R), 300);
    const sd = delta + 180;
    const dx = Math.sin(sd * D2R), dy = -Math.cos(sd * D2R);
    const corners = [
      [TC - HOUSE_HW / 2, TC - HOUSE_HH / 2], [TC + HOUSE_HW / 2, TC - HOUSE_HH / 2],
      [TC + HOUSE_HW / 2, TC + HOUSE_HH / 2], [TC - HOUSE_HW / 2, TC + HOUSE_HH / 2],
    ];
    const poly = hull(corners.concat(corners.map(([x, y]) => [x + L * dx, y + L * dy])));
    g += `<polygon points="${poly.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="rgba(43,38,32,0.16)"/>`;
  }

  // 受光边高亮
  const left = TC - HOUSE_HW / 2, right = TC + HOUSE_HW / 2, top = TC - HOUSE_HH / 2, bottom = TC + HOUSE_HH / 2;
  let litText;
  if (Math.abs(delta) < 45) {
    g += `<line x1="${left}" y1="${top}" x2="${right}" y2="${top}" stroke="#ffd54f" stroke-width="8" stroke-linecap="round"/>`;
    litText = `太阳正对着你家正面,<b>靠${facingName}边的一排房间最晒</b>`;
  } else if (delta <= -45 && delta >= -135) {
    g += `<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#ffd54f" stroke-width="8" stroke-linecap="round"/>`;
    litText = '太阳斜照<b>左侧面</b>,靠左那排房间晒到';
  } else if (delta >= 45 && delta <= 135) {
    g += `<line x1="${right}" y1="${top}" x2="${right}" y2="${bottom}" stroke="#ffd54f" stroke-width="8" stroke-linecap="round"/>`;
    litText = '太阳斜照<b>右侧面</b>,靠右那排房间晒到';
  } else {
    litText = '太阳在房子<b>背后</b>,正面完全晒不到';
  }

  // 房子
  g += `<rect x="${left}" y="${top}" width="${HOUSE_HW}" height="${HOUSE_HH}" rx="6" fill="#f2ead6" stroke="#b8860b" stroke-width="2.5"/>`;
  g += `<text x="${TC}" y="${TC + 4}" font-size="13" fill="#8a7a5c" text-anchor="middle">你家 · 朝${facingName}</text>`;

  // 光线与太阳
  const [sx2, sy2] = viewPoint(delta, R_SUN);
  g += `<line x1="${sx2.toFixed(1)}" y1="${sy2.toFixed(1)}" x2="${TC}" y2="${TC}" stroke="${s.color}" stroke-width="2" stroke-dasharray="5 5" opacity="0.65"/>`;
  g += `<circle cx="${sx2.toFixed(1)}" cy="${sy2.toFixed(1)}" r="17" fill="#ffd54f" stroke="#e67e22" stroke-width="2.5"/>`;
  g += `<text x="${sx2.toFixed(1)}" y="${(sy2 + 6).toFixed(1)}" font-size="17" text-anchor="middle">☀️</text>`;

  topSvg.innerHTML = g;

  // 读数与说明
  const shadowM = alt > 3 ? (10 / Math.tan(Math.max(alt, 3) * D2R)) : null;
  document.getElementById('top-readout').innerHTML =
    `🕐 <b>${fmtCN(t)}</b> · ☀️ 在 <b>${dirName(az)}方</b> · 高度 <b>${alt.toFixed(0)}°</b> · ${s.name}`;
  const shadowText = shadowM ? `整栋楼(10 米高)的影子约 <b>${shadowM.toFixed(0)} 米</b>长` : '影子非常长';
  document.getElementById('top-cap').innerHTML = nightMsg
    ? `🌙 那个方向是「夜区」——太阳一天只走金色那段弧(从${dirName(solar(lat, s.decl, rise).az)}方经白天到${dirName(solar(lat, s.decl, set).az)}方),太阳已帮你停在最边上。`
    : `${litText};${shadowText}。`;
  document.getElementById('day-stats').textContent =
    dl > 0.01
      ? `${s.name}这天:日出 ${fmtTime(rise)} · 日落 ${fmtTime(set)} · 昼长 ${Math.floor(dl)} 小时 ${Math.round(dl % 1 * 60)} 分 · 你家朝向这面墙晒 ${facadeHours(lat, s.decl, facing)} 小时`
      : `${s.name}这天极昼/极夜,模拟不展示`;
}

/* 俯视图拖拽 */
let topDragging = false;
function topPointer(e) {
  const rect = topSvg.getBoundingClientRect();
  const scale = TW / rect.width;
  const px = (e.clientX - rect.left) * scale, py = (e.clientY - rect.top) * scale;
  const r = timeFromPointer(px, py);
  t = r.t;
  renderTop(r.night);
}
topSvg.addEventListener('pointerdown', e => {
  topDragging = true; stopPlay();
  topSvg.setPointerCapture(e.pointerId);
  topPointer(e);
});
topSvg.addEventListener('pointermove', e => { if (topDragging) topPointer(e); });
topSvg.addEventListener('pointerup', () => { topDragging = false; });
topSvg.addEventListener('pointercancel', () => { topDragging = false; });

/* 播放动画 */
let playing = false, animStart = 0;
const playBtn = document.getElementById('play-btn');
function stopPlay() { playing = false; playBtn.textContent = '▶ 让太阳自动跑一整天'; }
playBtn.addEventListener('click', () => {
  if (playing) { stopPlay(); return; }
  const { rise, set, dl } = dayWindow();
  if (dl <= 0.01) return;
  playing = true;
  playBtn.textContent = '⏸ 暂停';
  animStart = performance.now() - ((t - rise) / dl) * 12000;
  requestAnimationFrame(playStep);
});
function playStep(now) {
  if (!playing) return;
  const { rise, set, dl } = dayWindow();
  const p = (now - animStart) / 12000;
  if (p >= 1) { t = set; renderTop(false); stopPlay(); playBtn.textContent = '▶ 再看一遍'; return; }
  t = rise + p * dl;
  renderTop(false);
  requestAnimationFrame(playStep);
}

/* ---------- ③ 互动剖面图 ---------- */
const secSvg = document.getElementById('sec-svg');
const SW = 560;
const S = 48, floorY = 208, wallX = 84;
const winTopY = floorY - 2.4 * S;
const SEC_R = 165;

function renderSection() {
  let g = '';

  // 地板与刻度
  g += `<line x1="${wallX}" y1="${floorY}" x2="${wallX + 8 * S}" y2="${floorY}" stroke="#5c5346" stroke-width="2.5"/>`;
  for (let m = 0; m <= 8; m++) {
    const x = wallX + m * S;
    g += `<line x1="${x}" y1="${floorY}" x2="${x}" y2="${floorY + 7}" stroke="#5c5346" stroke-width="1.5"/>`;
    if (m % 2 === 0) g += `<text x="${x}" y="${floorY + 24}" font-size="11" fill="#5c5346" text-anchor="middle">${m}m</text>`;
  }
  g += `<rect x="${wallX}" y="${floorY - 6}" width="${8 * S}" height="6" fill="#efe8d6"/>`;

  // 墙与窗
  const wallColor = '#c9b892';
  g += `<rect x="${wallX - 14}" y="42" width="14" height="${winTopY - 42}" fill="${wallColor}" stroke="#8a7a5c"/>`;
  g += `<rect x="${wallX - 14}" y="${floorY - 0.9 * S}" width="14" height="${0.9 * S}" fill="${wallColor}" stroke="#8a7a5c"/>`;
  g += `<line x1="${wallX}" y1="${winTopY}" x2="${wallX}" y2="${floorY - 0.9 * S}" stroke="#8a7a5c" stroke-width="2" stroke-dasharray="4 3"/>`;
  g += `<text x="${wallX - 22}" y="${(winTopY + floorY - 0.45 * S) / 2}" font-size="11" fill="#5c5346" text-anchor="end">窗</text>`;
  g += `<text x="${wallX - 22}" y="${(winTopY + floorY - 0.45 * S) / 2 + 14}" font-size="10" fill="#8a7a5c" text-anchor="end">2.4m</text>`;

  // 太阳轨迹弧(可拖动)
  const [ax0, ay0] = [wallX + SEC_R * Math.cos(2 * D2R), winTopY - SEC_R * Math.sin(2 * D2R)];
  const [ax1, ay1] = [wallX + SEC_R * Math.cos(80 * D2R), winTopY - SEC_R * Math.sin(80 * D2R)];
  g += `<path d="M ${ax0.toFixed(1)} ${ay0.toFixed(1)} A ${SEC_R} ${SEC_R} 0 0 0 ${ax1.toFixed(1)} ${ay1.toFixed(1)}" fill="none" stroke="#d4af37" stroke-width="4" stroke-linecap="round" opacity="0.8"/>`;

  // 节气参考点(吸附)
  const marks = [
    { name: '冬至', alt: noonAlt(lat, -23.44), color: '#5d8aa8' },
    { name: '春分/秋分', alt: noonAlt(lat, 0), color: '#8a9a5b' },
    { name: '夏至', alt: noonAlt(lat, 23.44), color: '#e67e22' },
  ].filter(m => m.alt >= 4 && m.alt <= 80);

  let nearName = null;
  marks.forEach(m => {
    const [mx, my] = [wallX + SEC_R * Math.cos(m.alt * D2R), winTopY - SEC_R * Math.sin(m.alt * D2R)];
    g += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5" fill="#fff" stroke="${m.color}" stroke-width="2.5"/>`;
    g += `<text x="${(mx + 9).toFixed(1)}" y="${(my + 4).toFixed(1)}" font-size="11" fill="${m.color}">${m.name}</text>`;
    if (Math.abs(secAlt - m.alt) < 1.6) nearName = m;
  });

  // 光线与照深
  const alpha = secAlt * D2R;
  const depthM = Math.min(2.4 / Math.tan(alpha), 15);
  const xHit = wallX + Math.max(depthM, 0.3) * S;
  g += `<line x1="${wallX}" y1="${winTopY}" x2="${xHit.toFixed(1)}" y2="${floorY}" stroke="#e67e22" stroke-width="3.5" stroke-linecap="round"/>`;
  g += `<line x1="${xHit.toFixed(1)}" y1="${floorY}" x2="${xHit.toFixed(1)}" y2="${floorY - 30}" stroke="#a63c2a" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  g += `<text x="${(xHit + 6).toFixed(1)}" y="${floorY - 36}" font-size="13" font-weight="700" fill="#a63c2a">照进 ${(depthM).toFixed(1)} 米</text>`;

  // 太阳手柄
  const [sx, sy] = [wallX + SEC_R * Math.cos(alpha), winTopY - SEC_R * Math.sin(alpha)];
  g += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="17" fill="#ffd54f" stroke="#e67e22" stroke-width="2.5"/>`;
  g += `<text x="${sx.toFixed(1)}" y="${(sy + 6).toFixed(1)}" font-size="17" text-anchor="middle">☀️</text>`;

  secSvg.innerHTML = g;

  document.getElementById('sec-cap').innerHTML =
    `☀️ 太阳高度 <b>${secAlt.toFixed(0)}°</b>${nearName ? `(≈<b>${nearName.name}</b>的正午)` : ''} → 正午阳光照进约 <b>${depthM.toFixed(1)} 米</b>` +
    (depthM < 1 ? '——基本只晒到窗边。' : depthM > 4 ? '——能一直晒到屋子深处!' : '。');
}

let secDragging = false;
function secPointer(e) {
  const rect = secSvg.getBoundingClientRect();
  const scale = SW / rect.width;
  const px = (e.clientX - rect.left) * scale, py = (e.clientY - rect.top) * scale;
  let a = Math.atan2(winTopY - py, px - wallX) * R2D;
  a = clamp(a, 4, 80);
  const marks = [
    { name: '冬至', alt: noonAlt(lat, -23.44) },
    { name: '春分/秋分', alt: noonAlt(lat, 0) },
    { name: '夏至', alt: noonAlt(lat, 23.44) },
  ];
  for (const m of marks) if (Math.abs(a - m.alt) < 2.2 && m.alt >= 4 && m.alt <= 80) { a = m.alt; break; }
  secAlt = a;
  renderSection();
}
secSvg.addEventListener('pointerdown', e => {
  secDragging = true;
  secSvg.setPointerCapture(e.pointerId);
  secPointer(e);
});
secSvg.addEventListener('pointermove', e => { if (secDragging) secPointer(e); });
secSvg.addEventListener('pointerup', () => { secDragging = false; });
secSvg.addEventListener('pointercancel', () => { secDragging = false; });

/* ---------- ④ 结论 ---------- */
function renderConclusion() {
  const winter = facadeHours(lat, -23.44, facing);
  const summer = facadeHours(lat, 23.44, facing);
  const altW = noonAlt(lat, -23.44);
  const facingName = DIRECTIONS[Math.round(norm360(facing) / 45) % 8];

  let mood;
  if (winter >= 6) mood = '冬天也能晒到大半天太阳,属于采光很好的朝向 👍';
  else if (winter >= 3) mood = '冬天能晒到小半天太阳,中规中矩。';
  else if (winter >= 1) mood = '冬天太阳很少,屋里容易显阴冷,注意灯光明亮和保暖。';
  else mood = '冬天正午晒不到太阳(朝北的典型情况),白天也偏阴,建议灯光补足、选暖色装修。';

  let extra = '';
  if (facingName === '西' || facingName === '西南') extra = '<p>🌞 另外:你家<b>下午西晒明显</b>,夏天西边房间会热,备好遮阳帘或隔热膜。</p>';
  else if (facingName === '东') extra = '<p>🌅 你家<b>上午阳光最好</b>,下午就背阴了——起居习惯早睡早起的话很合适。</p>';
  else if (facingName === '东南' || facingName === '南' || facingName === '西南') extra = '<p>🏠 传统说「坐北朝南好」,从日照看确实成立:冬天太阳低、南面晒得深,夏天太阳高、反而晒不进深处,冬暖夏凉。</p>';

  const cot = altW > 3 ? 1 / Math.tan(altW * D2R) : null;
  const spacing = cot
    ? `🏠 <b>买房看楼间距:</b>冬至正午太阳只有 ${altW.toFixed(1)}°,前楼每高 1 米,影子就长约 <b>${cot.toFixed(1)} 米</b>。想让冬天正午的阳光照进你家,楼间距最好 ≥ 前楼高度 × ${cot.toFixed(1)}。`
    : '';

  document.getElementById('conclusion').innerHTML =
    `<p>📌 <b>一句话解读:</b>你的房子朝${facingName},冬至(最冷时)这面墙每天晒 <b>${winter} 小时</b>太阳,夏至晒 <b>${summer} 小时</b>。${mood}</p>${extra}`;
  document.getElementById('spacing-tip').innerHTML = spacing;
}

/* ---------- 渲染入口 ---------- */
function renderAll() {
  document.querySelectorAll('#city-chips button').forEach(b =>
    b.classList.toggle('active', Math.abs(parseFloat(b.dataset.lat) - lat) < 0.001));
  document.querySelectorAll('#dir-grid button').forEach(b =>
    b.classList.toggle('active', Math.round(norm360(facing) / 45) % 8 === Number(b.dataset.idx)));
  document.querySelectorAll('#season-tabs button').forEach(b =>
    b.classList.toggle('active', b.dataset.key === selSeason.key));
  renderTop(false);
  renderSection();
  renderConclusion();
}

/* 初始化 */
clampTimes();
t = clamp(9, dayWindow().rise + 0.02, dayWindow().set - 0.02);
secAlt = clamp(noonAlt(lat, -23.44), 4, 80);
renderAll();
