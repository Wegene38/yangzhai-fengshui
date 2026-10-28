/* ========== 日照模拟器 · 太阳位置与图表 ========== */

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
const clamp1 = v => Math.max(-1, Math.min(1, v));

// 太阳位置(地平坐标系):返回高度角 alt 与方位角 az(北=0,顺时针)
// ENU 向量法:x_E = -cosδ·sinH;x_N = cosφ·sinδ − sinφ·cosδ·cosH;x_U = sinφ·sinδ + cosφ·cosδ·cosH
function solar(latDeg, declDeg, hour) {
  const φ = latDeg * D2R, δ = declDeg * D2R, H = (hour - 12) * 15 * D2R;
  const E = -Math.cos(δ) * Math.sin(H);
  const N = Math.cos(φ) * Math.sin(δ) - Math.sin(φ) * Math.cos(δ) * Math.cos(H);
  const U = Math.sin(φ) * Math.sin(δ) + Math.cos(φ) * Math.cos(δ) * Math.cos(H);
  return {
    alt: Math.asin(clamp1(U)) * R2D,
    az: (Math.atan2(E, N) * R2D + 360) % 360,
  };
}

// 昼长(小时);cosH0 = −tanφ·tanδ,极昼/极夜做钳制
function dayLength(latDeg, declDeg) {
  const cosH0 = -Math.tan(latDeg * D2R) * Math.tan(declDeg * D2R);
  if (cosH0 <= -1) return 24;
  if (cosH0 >= 1) return 0;
  return 2 * Math.acos(cosH0) * R2D / 15;
}

// 朝向墙面全天受晒时长(小时):太阳高度>0 且方位与朝向夹角 < 90°
function facadeHours(latDeg, declDeg, facing) {
  const dl = dayLength(latDeg, declDeg);
  if (dl <= 0) return 0;
  let hours = 0;
  for (let t = 12 - dl / 2; t <= 12 + dl / 2; t += 0.05) {
    const { alt, az } = solar(latDeg, declDeg, t);
    if (alt > 0 && Math.abs(norm180(az - facing)) < 90) hours += 0.05;
  }
  return Math.round(hours * 10) / 10;
}

// 正午阳光经 2.4m 高窗户照进屋内的深度(米);太阳在背面或高度过低则晒不到
function noonDepth(latDeg, declDeg, facing) {
  const { alt, az } = solar(latDeg, declDeg, 12);
  if (alt <= 2 || Math.abs(norm180(az - facing)) >= 90) return { d: 0, alt, hits: false };
  return { d: Math.min(2.4 / Math.tan(alt * D2R), 15), alt, hits: true };
}

const fmtTime = t => {
  t = ((t % 24) + 24) % 24;
  const h = Math.floor(t), m = Math.round((t - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m === 60 ? 0 : m).padStart(2, '0')}`;
};

const dirName = az => DIRECTIONS[Math.round(((az % 360) + 360) % 360 / 45) % 8];

/* ---------- 全局状态 ---------- */
let lat = 39.9;
let facing = 180; // 角度:北=0,顺时针;默认朝南
let selectedSeason = SEASONS[3]; // 默认展示冬至

const CITIES = [
  { name: '北京', lat: 39.9 }, { name: '上海', lat: 31.2 }, { name: '广州', lat: 23.1 },
  { name: '成都', lat: 30.6 }, { name: '哈尔滨', lat: 45.8 }, { name: '乌鲁木齐', lat: 43.8 },
  { name: '武汉', lat: 30.6 }, { name: '拉萨', lat: 29.7 },
];

try {
  const saved = parseInt(localStorage.getItem('yz_facing_idx'), 10);
  if (!Number.isNaN(saved)) facing = ((saved % 8) + 8) % 8 * 45;
} catch (e) { /* ignore */ }

function saveFacing() {
  try { localStorage.setItem('yz_facing_idx', String(Math.round(facing / 45))); } catch (e) { /* ignore */ }
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
    renderAll();
  });
  cityChips.appendChild(btn);
});

document.getElementById('lat').addEventListener('input', function () {
  const v = parseFloat(this.value);
  if (!Number.isNaN(v) && v >= -66 && v <= 66) { lat = v; renderAll(); }
});

const dirGrid = document.getElementById('dir-grid');
DIRECTIONS.forEach((dir, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '朝' + dir;
  btn.dataset.idx = i;
  btn.addEventListener('click', () => { facing = i * 45; saveFacing(); renderAll(); });
  dirGrid.appendChild(btn);
});

/* ---------- ② 四季卡片 ---------- */
function renderSeasonCards() {
  const wrap = document.getElementById('season-cards');
  wrap.innerHTML = SEASONS.map(s => {
    const dl = dayLength(lat, s.decl);
    const rise = fmtTime(12 - dl / 2), set = fmtTime(12 + dl / 2);
    const hours = facadeHours(lat, s.decl, facing);
    const { alt } = solar(lat, s.decl, 12);
    return `<div class="season-card" style="border-top:4px solid ${s.color}">
      <h3 style="color:${s.color}">${s.name}<small>${s.date}</small></h3>
      <p>日出 ${rise} · 日落 ${set}(昼长 ${Math.floor(dl)} 小时 ${Math.round((dl % 1) * 60)} 分)</p>
      <p>你家朝向那面墙晒 <b>${hours} 小时</b></p>
      <p>正午太阳高度 <b>${alt.toFixed(1)}°</b></p>
    </div>`;
  }).join('');
}

/* ---------- ③ 剖面图 ---------- */
function renderSection() {
  const S = 48; // 1 米 = 48px
  const floorY = 205, wallX = 76, roomDepth = 8;
  const winTopY = floorY - 2.4 * S, sillY = floorY - 0.9 * S;
  let g = '';

  // 地板与进深刻度
  g += `<line x1="${wallX}" y1="${floorY}" x2="${wallX + roomDepth * S}" y2="${floorY}" stroke="#5c5346" stroke-width="2.5"/>`;
  for (let m = 0; m <= roomDepth; m++) {
    const x = wallX + m * S;
    g += `<line x1="${x}" y1="${floorY}" x2="${x}" y2="${floorY + 7}" stroke="#5c5346" stroke-width="1.5"/>`;
    if (m % 2 === 0) g += `<text x="${x}" y="${floorY + 24}" font-size="11" fill="#5c5346" text-anchor="middle">${m}m</text>`;
  }

  // 墙与窗(左墙:窗洞上、下两段实体,中间虚线表示玻璃)
  const wallColor = '#c9b892';
  g += `<rect x="${wallX - 14}" y="40" width="14" height="${winTopY - 40}" fill="${wallColor}" stroke="#8a7a5c"/>`;
  g += `<rect x="${wallX - 14}" y="${sillY}" width="14" height="${floorY - sillY}" fill="${wallColor}" stroke="#8a7a5c"/>`;
  g += `<line x1="${wallX}" y1="${winTopY}" x2="${wallX}" y2="${sillY}" stroke="#8a7a5c" stroke-width="2" stroke-dasharray="4 3"/>`;
  g += `<text x="${wallX - 22}" y="${(winTopY + sillY) / 2}" font-size="11" fill="#5c5346" text-anchor="end">窗</text>`;
  g += `<text x="${wallX - 22}" y="${(winTopY + sillY) / 2 + 14}" font-size="10" fill="#8a7a5c" text-anchor="end">2.4m</text>`;

  // 屋内地面浅色
  g += `<rect x="${wallX}" y="${floorY - 6}" width="${roomDepth * S}" height="6" fill="#efe8d6"/>`;

  // 四季正午光线
  const labels = [];
  SEASONS.forEach(s => {
    const { d, alt, hits } = noonDepth(lat, s.decl, facing);
    if (hits && d > 0.15) {
      const xHit = wallX + Math.max(d, 0.35) * S;
      g += `<line x1="${wallX}" y1="${winTopY}" x2="${xHit.toFixed(1)}" y2="${floorY}" stroke="${s.color}" stroke-width="3" stroke-linecap="round"/>`;
      g += `<circle cx="${xHit.toFixed(1)}" cy="${floorY - 5}" r="4" fill="${s.color}"/>`;
      labels.push(`<li><span class="dot" style="background:${s.color}"></span><b>${s.name}</b>&nbsp;正午太阳 ${alt.toFixed(1)}°,照进约 <b>${d.toFixed(1)} 米</b> 深</li>`);
    } else {
      labels.push(`<li><span class="dot" style="background:${s.color}"></span><b>${s.name}</b>&nbsp;${alt > 0 ? '正午太阳在房子背面,正面晒不到' : '正午太阳在地平线下'}(高度 ${alt.toFixed(1)}°)</li>`);
    }
  });

  // 小太阳装饰
  g += `<text x="${wallX - 24}" y="${winTopY - 12}" font-size="18">☀️</text>`;

  document.getElementById('section-svg').innerHTML = g;
  document.getElementById('depth-list').innerHTML = labels.join('');
}

/* ---------- ④ 俯视图 ---------- */
function renderSeasonTabs() {
  const wrap = document.getElementById('season-tabs');
  wrap.innerHTML = '';
  SEASONS.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = s.name;
    btn.classList.toggle('active', s.key === selectedSeason.key);
    btn.addEventListener('click', () => { selectedSeason = s; renderSeasonTabs(); renderTopviews(); });
    wrap.appendChild(btn);
  });
}

function topViewSVG(s, hour) {
  const W = 190, H = 175, cx = W / 2, cy = 88;
  const hw = 92, hh = 66; // 面宽 / 进深(图上像素)
  const { alt, az } = solar(lat, s.decl, hour);
  let g = `<rect x="${cx - hw / 2}" y="${cy - hh / 2}" width="${hw}" height="${hh}" rx="4" fill="#f2ead6" stroke="#b8860b" stroke-width="2"/>`;
  g += `<text x="${cx}" y="${cy + 4}" font-size="11" fill="#8a7a5c" text-anchor="middle">你家(朝${DIRECTIONS[Math.round(facing / 45) % 8]})</text>`;

  let cap;
  if (alt <= 0) {
    cap = `${hour} 点太阳还没升起来或已落山,晒不到`;
  } else {
    const delta = norm180(az - facing); // 视角:0=正前(上),顺时针为正
    const rad = delta * D2R;
    const dirX = Math.sin(rad), dirY = -Math.cos(rad);
    // 太阳箭头:从外圈指向房子
    const tx = cx + 78 * dirX, ty = cy + 78 * dirY;
    const hx = cx + 46 * dirX, hy = cy + 46 * dirY;
    const px = Math.cos(rad) * 5, py = Math.sin(rad) * 5;
    g += `<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="${s.color}" stroke-width="2.5"/>`;
    g += `<polygon points="${(hx - 9 * dirX).toFixed(1)},${(hy - 9 * dirY).toFixed(1)} ${(hx + px).toFixed(1)},${(hy + py).toFixed(1)} ${(hx - px).toFixed(1)},${(hy - py).toFixed(1)}" fill="${s.color}"/>`;
    g += `<text x="${(cx + 88 * dirX).toFixed(1)}" y="${(cy + 88 * dirY + 4).toFixed(1)}" font-size="13" text-anchor="middle">☀️</text>`;

    // 被晒到的边:高亮
    const left = cx - hw / 2, right = cx + hw / 2, top = cy - hh / 2, bottom = cy + hh / 2;
    let litText;
    if (Math.abs(delta) < 45) {
      g += `<line x1="${left}" y1="${top}" x2="${right}" y2="${top}" stroke="#ffd54f" stroke-width="6" stroke-linecap="round"/>`;
      litText = '<b>正面整排</b>都晒到';
    } else if (delta < 0) {
      g += `<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#ffd54f" stroke-width="6" stroke-linecap="round"/>`;
      litText = '晒<b>左侧房间</b>(图上看是左边)';
    } else if (delta > 0) {
      g += `<line x1="${right}" y1="${top}" x2="${right}" y2="${bottom}" stroke="#ffd54f" stroke-width="6" stroke-linecap="round"/>`;
      litText = '晒<b>右侧房间</b>(图上看是右边)';
    } else {
      litText = '太阳在房子<b>正后方</b>,晒不到正面';
    }
    if (Math.abs(delta) >= 135) litText = '太阳在房子<b>背后</b>,这一面晒不到';
    cap = `${hour} 点 ☀️ 在<b>${dirName(az)}方</b>(高度 ${alt.toFixed(0)}°)→ ${litText}`;
  }
  return { g, cap };
}

function renderTopviews() {
  const wrap = document.getElementById('topviews');
  const hours = [[9, '上午 9 点'], [12, '正午 12 点'], [15, '下午 3 点']];
  wrap.innerHTML = hours.map(([h, label]) => {
    const { g, cap } = topViewSVG(selectedSeason, h);
    return `<div class="mini">
      <svg viewBox="0 0 ${190} ${175}">${g}</svg>
      <p class="mini-cap"><b>${label}</b> · ${selectedSeason.name}<br/>${cap}</p>
    </div>`;
  }).join('');
}

/* ---------- ⑤ 结论 ---------- */
function renderConclusion() {
  const winter = facadeHours(lat, -23.44, facing);
  const summer = facadeHours(lat, 23.44, facing);
  const { alt: altW } = solar(lat, -23.44, 12);
  const facingName = DIRECTIONS[Math.round(facing / 45) % 8];

  let mood;
  if (winter >= 6) mood = '冬天也能晒到大半天太阳,属于采光很好的朝向 👍';
  else if (winter >= 3) mood = '冬天能晒到小半天太阳,中规中矩。';
  else if (winter >= 1) mood = '冬天太阳很少,屋里容易显阴冷,注意灯光明亮和保暖。';
  else mood = '冬天正午晒不到太阳(朝北的典型情况),白天也偏阴,建议灯光补足、选暖色装修。';

  let extra = '';
  const fn = facingName;
  if (fn === '西' || fn === '西南') extra = '<p>🌞 另外:你家<b>下午西晒明显</b>,夏天西边房间会热,备好遮阳帘或隔热膜。</p>';
  else if (fn === '东') extra = '<p>🌅 你家<b>上午阳光最好</b>,下午就背阴了——起居习惯早睡早起的话很合适。</p>';
  else if (fn === '东南' || fn === '南' || fn === '西南') extra = '<p>🏠 传统说「坐北朝南好」,从日照看确实成立:冬天太阳低、南面晒得深,夏天太阳高、反而晒不进深处,冬暖夏凉。</p>';

  const cot = altW > 3 ? (1 / Math.tan(altW * D2R)) : null;
  const spacing = cot
    ? `🏠 <b>买房看楼间距:</b>${selectedSeason ? '冬至' : ''}正午太阳只有 ${altW.toFixed(1)}°,前楼每高 1 米,影子就长约 <b>${cot.toFixed(1)} 米</b>。想让冬天正午的阳光照进你家,楼间距最好 ≥ 前楼高度 × ${cot.toFixed(1)}。`
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
    b.classList.toggle('active', Math.round(facing / 45) === Number(b.dataset.idx)));
  renderSeasonCards();
  renderSection();
  renderSeasonTabs();
  renderTopviews();
  renderConclusion();
}

renderAll();
