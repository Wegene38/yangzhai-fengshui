/* ========== 玄空飞星 · 排盘与解释 ========== */

const DIRECTIONS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
const DIR_PALACE = { '北': '坎', '东北': '艮', '东': '震', '东南': '巽', '南': '离', '西南': '坤', '西': '兑', '西北': '乾' };

// 九宫飞泊顺序:中→乾→兑→艮→离→坎→坤→震→巽
const SEQ = ['中', '乾', '兑', '艮', '离', '坎', '坤', '震', '巽'];
const PAL_DIR_NAME = { '乾': '西北', '坎': '北', '艮': '东北', '震': '东', '巽': '东南', '离': '南', '坤': '西南', '兑': '西' };

// 天元龙阴阳:乾坤艮巽(阳) / 子午卯酉→坎离震兑(阴)
const YANG = new Set(['乾', '坤', '艮', '巽']);

// 九星:名称、颜色、九运语境的吉凶短评(简注)
const STAR_INFO = {
  1: { name: '一白贪狼', color: '#5d8aa8', note: '桃花人缘星;九运为未来生气,吉' },
  2: { name: '二黑病符', color: '#343f4b', note: '病符星,主疾病是非,凶' },
  3: { name: '三碧蚩尤', color: '#2e7d32', note: '是非星,主口舌官非,凶' },
  4: { name: '四绿文昌', color: '#43a047', note: '文昌星,利学业文书,平吉' },
  5: { name: '五黄廉贞', color: '#c9a227', note: '五黄大煞,主灾病,大凶' },
  6: { name: '六白武曲', color: '#8a9a5b', note: '武曲星,主权力偏财,平吉' },
  7: { name: '七赤破军', color: '#b03a2e', note: '破军星,退气破财口舌,凶' },
  8: { name: '八白左辅', color: '#bf8f30', note: '财星,刚退气仍稳,平吉' },
  9: { name: '九紫右弼', color: '#8e44ad', note: '喜庆星,当运最旺,大吉' },
};
const YUN_NAMES = ['一白', '二黑', '三碧', '四绿', '五黄', '六白', '七赤', '八白', '九紫'];

// ---------- 排盘 ----------
function flyBase(centerStar) { // 顺飞:各宫数字
  const out = {};
  SEQ.forEach((p, i) => { out[p] = ((centerStar - 1 + i) % 9) + 1; });
  return out;
}

function flyByPalace(baseStar, forward) { // baseStar 入中,顺/逆飞
  const out = {};
  SEQ.forEach((p, i) => {
    const v = forward ? (baseStar - 1 + i) : (baseStar - 1 - i);
    out[p] = ((v % 9) + 9) % 9 + 1;
  });
  return out;
}

// sitPalace/facingPalace: 坐/向宫位(天元龙)
function buildChart(yun, sitPalace, facingPalace) {
  const yunChart = flyBase(yun);
  const shan = flyByPalace(yunChart[sitPalace], YANG.has(sitPalace));
  const xiang = flyByPalace(yunChart[facingPalace], YANG.has(facingPalace));
  const chart = {};
  SEQ.forEach(p => { chart[p] = { yun: yunChart[p], shan: shan[p], xiang: xiang[p] }; });
  return chart;
}

function yearToYun(y) {
  if (y < 1864 || y > 2100) return null;
  const n = Math.floor(((y - 1864) % 180) / 20) + 1;
  return Math.min(n, 9);
}

// ---------- 状态 ----------
let yun = 9;
let facingIdx = 4; // 朝南

try {
  const savedY = parseInt(localStorage.getItem('yz_facing_idx'), 10);
  if (!Number.isNaN(savedY)) facingIdx = ((savedY % 8) + 8) % 8;
  const savedYear = parseInt(localStorage.getItem('yz_year'), 10);
  if (!Number.isNaN(savedYear)) { const y2 = yearToYun(savedYear); if (y2) { yun = y2; document.getElementById('year').value = savedYear; } }
} catch (e) { /* ignore */ }

// ---------- UI:朝向 ----------
const dirGrid = document.getElementById('dir-grid');
DIRECTIONS.forEach((d, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '朝' + d;
  btn.addEventListener('click', () => {
    facingIdx = i;
    try { localStorage.setItem('yz_facing_idx', String(i)); } catch (e) { /* ignore */ }
    renderAll();
  });
  dirGrid.appendChild(btn);
});

document.getElementById('year').addEventListener('input', function () {
  const y = parseInt(this.value, 10);
  const n = yearToYun(y);
  if (n) {
    yun = n;
    try { localStorage.setItem('yz_year', String(y)); } catch (e) { /* ignore */ }
    renderAll();
  }
});

// ---------- 渲染 ----------
let chart = null, sitPalace = '坎', facingPalace = '离';

function palaceClass(p) { return p === sitPalace ? 'sit' : p === facingPalace ? 'facing' : ''; }

function renderChart() {
  const facingName = DIRECTIONS[facingIdx];
  facingPalace = DIR_PALACE[facingName];
  const sitIdx = (facingIdx + 4) % 8;
  sitPalace = DIR_PALACE[DIRECTIONS[sitIdx]];
  chart = buildChart(yun, sitPalace, facingPalace);

  document.getElementById('yun-badge').textContent = `${YUN_NAMES[yun - 1]}运(${yun === 9 ? '2024-2043' : ''}) 坐${DIRECTIONS[sitIdx]}朝${facingName} · 坐${sitPalace}宫向${facingPalace}宫`;

  // 展示顺序:北在上(与传统南在上相反,便于与全站一致)
  const order = [
    ['西北', '乾'], ['北', '坎'], ['东北', '艮'],
    ['西', '兑'], ['中', '中'], ['东', '震'],
    ['西南', '坤'], ['南', '离'], ['东南', '巽'],
  ];
  const grid = document.getElementById('fx-grid');
  grid.innerHTML = '';
  order.forEach(([dir, p]) => {
    const c = chart[p];
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `fx-cell ${palaceClass(p)}`;
    const tag = p === sitPalace ? '坐' : p === facingPalace ? '向' : p === '中' ? '中宫' : '';
    cell.innerHTML = `
      <span class="fx-head">${dir}${p === '中' ? '' : ' · ' + p + '卦'}</span>
      <span class="fx-stars">
        <span class="fx-star" style="color:${STAR_INFO[c.shan].color}">${c.shan}</span>
        <span class="fx-yun">${c.yun}</span>
        <span class="fx-star" style="color:${STAR_INFO[c.xiang].color}">${c.xiang}</span>
      </span>
      ${tag ? `<span class="fx-tag">${tag}</span>` : ''}`;
    cell.addEventListener('click', () => {
      document.querySelectorAll('.fx-cell').forEach(x => x.classList.remove('active'));
      cell.classList.add('active');
      showPalaceDetail(dir, p, c);
    });
    grid.appendChild(cell);
  });

  renderSummary();
}

function showPalaceDetail(dir, p, c) {
  const box = document.getElementById('fx-detail');
  if (p === '中') {
    box.innerHTML = `<h4>⭐ 中宫 · ${c.yun} 运星入中</h4><p>中宫是全屋气场的「发动机」,宜空旷、明亮、整洁,别堆杂物。</p>`;
    return;
  }
  const s = STAR_INFO[c.shan], x = STAR_INFO[c.xiang];
  const roles = [];
  if (c.xiang === yun) roles.push('当运向星到此 = <b>旺财位</b>:宜大门、客厅、常活动的区域');
  if (c.shan === yun) roles.push('当运山星到此 = <b>旺丁位</b>:宜主卧、老人房,利健康人丁');
  if (c.xiang === 5 || c.xiang === 2) roles.push('向星病符到此:忌作大门主卧,宜卫生间/储物间「压住」,保持干燥通风');
  if (c.shan === 5) roles.push('山星五黄到此:忌久坐久卧,床头书桌避开这面墙');
  if (c.xiang === 4 || c.shan === 4) roles.push('文昌星到此:宜书房、书桌、孩子学习位');
  if (c.xiang === 1 || c.shan === 1) roles.push('一白生气星到此:吉,利人缘桃花');
  if (c.xiang === 7) roles.push('七赤退气:防盗防口舌,别放贵重物');
  if (!roles.length) roles.push('平位:正常使用,保持整洁明亮即可');

  box.innerHTML = `
    <h4>${dir} · ${p}卦 — 山星${c.shan} / 运星${c.yun} / 向星${c.xiang}</h4>
    <p>⛰️ 山星 ${c.shan}(${s.name}):${s.note} —— 管人丁健康。</p>
    <p>💰 向星 ${c.xiang}(${x.name}):${x.note} —— 管财禄运气。</p>
    <p class="detail-tip">💡 ${roles.map(r => '· ' + r).join('<br/>')}</p>`;
}

function renderSummary() {
  const box = document.getElementById('fx-summary');
  const shanSit = chart[sitPalace].shan, xiangFace = chart[facingPalace].xiang;
  const shanFace = chart[facingPalace].shan, xiangSit = chart[sitPalace].xiang;
  let banner = '';
  if (shanSit === yun && xiangFace === yun) banner = `🏆 <b>旺山旺向!</b>当运之星到坐又到向,人丁财禄两旺的大格局。把主卧安排在山星旺的宫位、大门/客厅安排在向星旺的宫位,如虎添翼。`;
  else if (shanFace === yun && xiangSit === yun) banner = `🌊 <b>上山下水。</b>当运之星反到位,传统谓丁财两退。化解思路:坐后宜有实墙高楼「补山」,向前宜见水或开阔「补水」;内部布置尽量把卧室放在山星旺宫、活动区放在向星旺宫。`;
  else if (shanFace === yun && xiangFace === yun) banner = `💎 <b>双星到向。</b>旺气全聚在向首(门前):旺财明显,但需「坐后实、向前收」,否则旺丁不足。明堂开阔即是好应。`;
  else if (shanSit === yun && xiangSit === yun) banner = `🏔️ <b>双星到坐。</b>旺气聚在坐山:利人丁健康,财气稍弱;可在向首布置水景/开阔以引财。`;
  else banner = `⚖️ <b>普通格局。</b>没有大吉大凶的全局结构,重点看下面各宫的旺位凶位,把房间「对号入座」。`;

  const shanGood = SEQ.filter(p => p !== '中' && chart[p].shan === yun).map(p => PAL_DIR_NAME[p]);
  const xiangGood = SEQ.filter(p => p !== '中' && chart[p].xiang === yun).map(p => PAL_DIR_NAME[p]);
  const sick = SEQ.filter(p => p !== '中' && (chart[p].xiang === 5 || chart[p].xiang === 2 || chart[p].shan === 5)).map(p => PAL_DIR_NAME[p]);
  const wen = SEQ.filter(p => p !== '中' && (chart[p].xiang === 4 || chart[p].shan === 4)).map(p => PAL_DIR_NAME[p]);

  box.innerHTML = `
    <div class="verdict">${banner}</div>
    <ul class="result-list" style="margin-top:.8rem">
      <li><span class="good">旺丁位</span> 山星当运:${shanGood.length ? shanGood.map(d => d + '方').join('、') : '无'}<small>宜主卧、老人房,睡在这里养精神。</small></li>
      <li><span class="pos">旺财位</span> 向星当运:${xiangGood.length ? xiangGood.map(d => d + '方').join('、') : '无'}<small>宜大门常开、客厅、办公位。</small></li>
      <li><span class="neg">病符位</span> 五黄二黑:${sick.length ? sick.map(d => d + '方').join('、') : '无'}<small>宜卫生间、储物间压制;忌大门主卧,床头避开。</small></li>
      <li><span class="good">文昌位</span> 四绿:${wen.length ? wen.map(d => d + '方').join('、') : '无'}<small>书桌放这里,学习考试加分(传统说法)。</small></li>
    </ul>`;
}

// ---------- 户型图读取 ----------
function renderPlan() {
  const body = document.getElementById('plan-body');
  let plan = null;
  try { plan = JSON.parse(localStorage.getItem('yz_plan_v1')); } catch (e) { /* ignore */ }
  const roomTypes = { door: '大门', master: '主卧', bed: '次卧', kids: '儿童房', study: '书房', kitchen: '厨房', toilet: '卫生间', living: '客厅', store: '储物间', balcony: '阳台' };
  if (!plan || !Array.isArray(plan.marks)) return;
  const marks = plan.marks.filter(m => roomTypes[m.t]);
  if (!marks.length) {
    body.innerHTML = '<p style="text-align:center;color:var(--ink-soft)">户型图里还没有标记房间。去 <a href="upload.html" style="color:#a63c2a">📐 户型图标注</a> 点几个房间位置。</p>';
    return;
  }
  const R2D = 180 / Math.PI;
  const rows = marks.map(m => {
    const dx = m.x - plan.cx, dy = m.y - plan.cy;
    const bearing = ((Math.atan2(dx, -dy) * R2D + (plan.north || 0)) % 360 + 360) % 360;
    const dir = DIRECTIONS[Math.round(bearing / 45) % 8];
    const p = DIR_PALACE[dir];
    const c = chart[p];
    let cls = 'pos', note;
    if (c.xiang === 5 || c.xiang === 2 || c.shan === 5) { cls = 'neg'; note = '病符/五黄宫:此房间压力大,建议改作卫生间/储物,或保持整洁通风'; }
    else if (c.shan === yun) { cls = 'good'; note = '山星当运:睡在这里利健康人丁,非常适合卧室'; }
    else if (c.xiang === yun) { cls = 'good'; note = '向星当运:动气财位,适合客厅/大门/办公,卧室睡旺财位也吉'; }
    else if (c.xiang === 7 || c.xiang === 3) { cls = 'neg'; note = '退气/是非星:注意口舌防盗,卧室无妨但床头别正对门'; }
    else { note = '平位:正常使用即可'; }
    return `<li><span class="${cls}">${{door:'🚪',master:'🛏️',bed:'🛌',kids:'🧒',study:'📚',kitchen:'🍳',toilet:'🚽',living:'🛋️',store:'📦',balcony:'🪴'}[m.t]} ${roomTypes[m.t]} · ${dir}方(${p}宫)</span> 山${c.shan}/向${c.xiang}<small>${note}</small></li>`;
  }).join('');
  body.innerHTML = `<ul class="result-list">${rows}</ul>
    <p style="font-size:.85rem;color:var(--ink-soft)">方位按你标注时设定的北向计算;朝向如与罗盘工具不一致,以两处各自设置为准。</p>`;
}

function renderAll() {
  document.querySelectorAll('#dir-grid button').forEach((b, i) =>
    b.classList.toggle('active', i === facingIdx));
  renderChart();
  renderPlan();
}

renderAll();
