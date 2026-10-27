/* ========== 阳宅风水 · 八宅测算 ========== */

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

// 九星信息:吉凶分色与释义
const STARS = {
  '生气': { color: '#b03a2e', level: '大吉', desc: '贪狼吉星,主事业与人丁兴旺,宜大门、主卧、书房' },
  '延年': { color: '#bf5b2a', level: '吉',   desc: '武曲吉星,主婚姻感情与寿元,宜主卧、老人房' },
  '天医': { color: '#c0902a', level: '中吉', desc: '巨门吉星,主健康与贵人,宜卧室、儿童房' },
  '伏位': { color: '#8a9a5b', level: '小吉', desc: '辅弼吉星,主平稳安定,宜常坐久卧之处' },
  '祸害': { color: '#6b7f8e', level: '小凶', desc: '禄存凶星,主是非损耗,宜作储物间压制' },
  '六煞': { color: '#5d6d7e', level: '凶',   desc: '文曲凶星,主口舌烦扰,宜厨房、卫生间压制' },
  '五鬼': { color: '#45505c', level: '大凶', desc: '廉贞凶星,主口舌火患,宜厨房(火炼)或卫生间压制' },
  '绝命': { color: '#343f4b', level: '大凶', desc: '破军凶星,主体弱破财,最忌大门主卧,宜卫生间压制' },
};

const TRIGRAM_SYMBOL = { '坎': '☵', '离': '☲', '震': '☳', '巽': '☴', '乾': '☰', '坤': '☷', '艮': '☶', '兑': '☱' };
const EAST_FOUR = ['坎', '离', '震', '巽'];

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

function renderLegend(container) {
  container.innerHTML = Object.keys(STARS).map(name => {
    const s = STARS[name];
    return `<span class="chip"><span class="dot" style="background:${s.color}"></span>${name}·${s.level}</span>`;
  }).join('');
}

/* ---------- 命卦测算交互 ---------- */
function starListHtml(names, gua) {
  return names.map(name => {
    const dir = DIRECTIONS[HOUSES[gua].indexOf(name)];
    return `<li><b>${name} · ${dir}方</b><small>${STARS[name].desc}</small></li>`;
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

  document.getElementById('result-gua-symbol').textContent = TRIGRAM_SYMBOL[gua];
  document.getElementById('result-gua-name').textContent = gua + '命';
  document.getElementById('result-gua-trigram').textContent = group;
  document.getElementById('result-group').textContent = `${group} · 宜配${group.slice(0, 2)}宅`;
  document.getElementById('result-year').textContent =
    `出生 ${value} · ${isMale ? '男' : '女'}命${month < 2 || (month === 2 && day < 4) ? `(立春前,按 ${year - 1} 年计)` : ''}`;

  document.getElementById('result-good').innerHTML =
    starListHtml(['生气', '延年', '天医', '伏位'], gua);
  document.getElementById('result-bad').innerHTML =
    starListHtml(['绝命', '五鬼', '六煞', '祸害'], gua);

  renderCompass(document.getElementById('calc-compass'), gua);
  document.getElementById('calc-result').hidden = false;
  document.getElementById('calc-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

/* ---------- 宅向吉凶交互 ---------- */
function dirOf(gua, star) {
  return DIRECTIONS[HOUSES[gua].indexOf(star)];
}

function renderHouse(gua) {
  document.getElementById('house-title').textContent = `${gua}宅 · 八方吉凶与布局建议`;
  const items = [
    ['大门', `宜开在 <b style="color:${STARS['生气'].color}">${dirOf(gua, '生气')}</b> 或 <b style="color:${STARS['延年'].color}">${dirOf(gua, '延年')}</b> 方,纳吉气入宅`],
    ['主卧', `宜设于 ${dirOf(gua, '生气')}、${dirOf(gua, '延年')} 或 ${dirOf(gua, '天医')} 方`],
    ['书房', `宜设于 ${dirOf(gua, '伏位')} 或 ${dirOf(gua, '生气')} 方,利静思与学业`],
    ['厨房', `宜压凶方,设在 ${dirOf(gua, '祸害')} 或 ${dirOf(gua, '六煞')} 方,灶口朝吉方`],
    ['卫生间', `宜设于 ${dirOf(gua, '五鬼')} 或 ${dirOf(gua, '绝命')} 方,以洁污压制凶星`],
    ['忌', `大门、主卧落于 ${dirOf(gua, '绝命')}、${dirOf(gua, '五鬼')} 方,宜调整功能分区`],
  ];
  document.getElementById('house-advice-list').innerHTML =
    items.map(([k, v]) => `<li><b>${k}</b>${v}</li>`).join('');
  renderCompass(document.getElementById('house-compass'), gua);
}

document.getElementById('house-select').addEventListener('change', function () {
  renderHouse(this.value);
});

/* ---------- 初始化 ---------- */
renderHouse('坎');
renderLegend(document.getElementById('house-legend'));
document.getElementById('footer-year').textContent = new Date().getFullYear();
