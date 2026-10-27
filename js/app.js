/* ========== 阳宅风水 · 命卦测算 ========== */

// 八方顺序(顺时针,北在上)
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

// 九星信息:吉凶分色 + 小白友好的「人话」解读
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

// 两类命的吉利方向(用于一句话解读)
const GROUP_DIRS = {
  '东四命': ['北', '东', '东南', '南'],
  '西四命': ['西', '西北', '东北', '西南'],
};

/* ---------- 命卦计算 ---------- */
// 以立春(约 2 月 4 日)为年份分界;年份各位数字反复相加至一位数,
// 男命 11-n、女命 n+4,再按 9 取余,余数对应后天八卦(5 男寄坤、女寄艮)。
function computeMingGua(year, month, day, isMale) {
  if (month < 2 || (month === 2 && day < 4)) year -= 1;
  let n = String(year).split('').reduce((sum, ch) => sum + Number(ch), 0);
  while (n > 9) n = String(n).split('').reduce((sum, ch) => sum + Number(ch), 0);
  let num = isMale ? (11 - n) : (n + 4);
  num = ((num - 1) % 9) + 1;
  const map = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: isMale ? '坤' : '艮', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
  return map[num];
}

/* ---------- 罗盘图渲染 ---------- */
function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function sectorPath(cx, cy, r, a0, a1) {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  return `M ${cx} ${cy} L ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
}

function renderCompass(container, gua) {
  const size = 340, cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const stars = HOUSES[gua];
  let paths = '', labels = '';

  DIRECTIONS.forEach((dir, i) => {
    const star = stars[i];
    const info = STARS[star];
    const a0 = i * 45 - 22.5, a1 = i * 45 + 22.5, mid = i * 45;
    paths += `<path d="${sectorPath(cx, cy, r, a0, a1)}" fill="${info.color}" stroke="#f7f3e8" stroke-width="1.5"></path>`;

    const t1 = polar(cx, cy, r * 0.82, mid);
    const t2 = polar(cx, cy, r * 0.58, mid);
    const t3 = polar(cx, cy, r * 0.34, mid);
    labels += `<text x="${t1.x.toFixed(1)}" y="${t1.y.toFixed(1)}" fill="#f7f1e3" font-size="15" font-weight="700" text-anchor="middle" dominant-baseline="middle">${star}</text>`;
    labels += `<text x="${t2.x.toFixed(1)}" y="${t2.y.toFixed(1)}" fill="rgba(247,241,227,.92)" font-size="14" text-anchor="middle" dominant-baseline="middle">${dir}</text>`;
    labels += `<text x="${t3.x.toFixed(1)}" y="${t3.y.toFixed(1)}" fill="rgba(247,241,227,.75)" font-size="12" text-anchor="middle" dominant-baseline="middle">${DIR_TRIGRAM[dir]}</text>`;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${gua}宅八方吉凶罗盘图">
      <circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="none" stroke="#b8860b" stroke-width="3"></circle>
      ${paths}
      <circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="#fffdf7" stroke="#b8860b" stroke-width="2"></circle>
      <text x="${cx}" y="${cy - 8}" fill="#a63c2a" font-size="26" font-weight="700" text-anchor="middle" dominant-baseline="middle">${TRIGRAM_SYMBOL[gua]}</text>
      <text x="${cx}" y="${cy + 16}" fill="#2b2620" font-size="14" letter-spacing="4" text-anchor="middle" dominant-baseline="middle">${gua}宅</text>
    </svg>`;
}

/* ---------- 命卦测算交互 ---------- */
function starListHtml(names, gua) {
  return names.map(name => {
    const dir = DIRECTIONS[HOUSES[gua].indexOf(name)];
    const s = STARS[name];
    return `<li><b>${s.emoji} ${name} · ${dir}方(${s.role})</b><small>${s.plain}</small></li>`;
  }).join('');
}

document.getElementById('calc-form').addEventListener('submit', function (e) {
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
    `挑房间、放床头、摆书桌,优先选这四个方向;剩下的方向,让厨房、卫生间、储物间去「占」就好。`;

  document.getElementById('result-good').innerHTML =
    starListHtml(['生气', '延年', '天医', '伏位'], gua);
  document.getElementById('result-bad').innerHTML =
    starListHtml(['绝命', '五鬼', '六煞', '祸害'], gua);

  document.getElementById('result-sleep').innerHTML =
    `🛏️ <b>睡觉小技巧:</b>床头尽量靠吉方(${goodDirs.join(' / ')})的墙。就算不信这个,床头靠实墙、不靠窗,也确实睡得更踏实。`;

  renderCompass(document.getElementById('calc-compass'), gua);
  document.getElementById('calc-result').hidden = false;
  document.getElementById('calc-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

/* ---------- 初始化 ---------- */
document.getElementById('footer-year').textContent = new Date().getFullYear();
