/* ========== 金锁玉关 · 八方砂水分析 ========== */

const DIRECTIONS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
const LUOSHU = { '北': '一坎', '西南': '二坤', '东': '三震', '东南': '四巽', '西北': '六乾', '西': '七兑', '东北': '八艮', '南': '九离' };
const NEED_SHA = new Set(['北', '西南', '东', '东南']); // 一二三四要砂;其余要水

// 每个方位:要砂/要水时的断语(有砂评、有水评、没有时的建议)
const LINES = {
  '北': {
    sha: ['good', '北边高实:有靠山,根基稳,传统主人丁与健康,大吉。'],
    shui: ['bad', '北边低洼见水(过路阴阳谓泄气):宜在北侧布置高柜、书柜、实墙「人造砂」,或选床头靠北墙。'],
  },
  '西南': {
    sha: ['good', '西南高实:传统利家宅女主人与脾胃,吉。'],
    shui: ['bad', '西南低动:此角宜放高大家具或常关闭,保持「实」感。'],
  },
  '东': {
    sha: ['good', '东边高实:利事业起步与家中长子,吉。'],
    shui: ['bad', '东边低洼:可在东侧放高家具造砂;若是大窗,白天拉开帘保持明亮即可。'],
  },
  '东南': {
    sha: ['good', '东南高实:传统利文昌与财禄,吉。'],
    shui: ['bad', '东南低动:文昌角宜静宜实,书柜放这边一举两得。'],
  },
  '西北': {
    shui: ['good', '西北低伏流动:开阔、门路都好,老话「乾宫见水利权财」。'],
    sha: ['bad', '西北高楼逼压(传统谓压运):此角保持简洁明亮,别堆高物,功能上留给走道/阳台。'],
  },
  '西': {
    shui: ['good', '西边低平开阔:传统谓利口才与愉悦,吉。'],
    sha: ['bad', '西边高物逼压:保持简洁;若是邻居高楼无法改变,此侧窗户常开帘采光。'],
  },
  '东北': {
    shui: ['good', '东北低平:利财源流动,吉。'],
    sha: ['bad', '东北高堵:保持门窗开阔;储物别堆到顶。'],
  },
  '南': {
    shui: ['good', '南边开阔低平:采光好、视野佳,正是「明堂」,与日照原理完全一致,大吉。'],
    sha: ['bad', '南边高楼逼压会挡光:窗台别堆物,用浅色窗帘;改变不了就靠灯光补足。'],
  },
};

// ---------- 状态 ----------
// state[dir] = 'sha' | 'shui' | 'none'
let state = {};
try {
  const plan = JSON.parse(localStorage.getItem('yz_plan_v1'));
  if (plan && Array.isArray(plan.marks)) {
    const R2D = 180 / Math.PI;
    plan.marks.forEach(m => {
      if (m.t !== 'sha' && m.t !== 'shui' && m.t !== 'high' && m.t !== 'water' && m.t !== 'tree' && m.t !== 'road' && m.t !== 'open') return;
      const dx = m.x - plan.cx, dy = m.y - plan.cy;
      const bearing = ((Math.atan2(dx, -dy) * R2D + (plan.north || 0)) % 360 + 360) % 360;
      const dir = DIRECTIONS[Math.round(bearing / 45) % 8];
      // 砂类标记
      if (m.t === 'sha' || m.t === 'high' || m.t === 'tree') state[dir] = 'sha';
      // 水类标记
      if (m.t === 'shui' || m.t === 'water' || m.t === 'road' || m.t === 'open') state[dir] = state[dir] || 'shui';
    });
  }
} catch (e) { /* ignore */ }

// ---------- UI ----------
const rowsBox = document.getElementById('js-rows');

function renderRows() {
  rowsBox.innerHTML = '';
  DIRECTIONS.forEach(dir => {
    const need = NEED_SHA.has(dir) ? '砂(宜高)' : '水(宜低)';
    const cur = state[dir] || 'none';
    const row = document.createElement('div');
    row.className = 'js-row';
    row.innerHTML = `
      <div class="js-dir">${LUOSHU[dir]} · ${dir}方<small>本派要:${need}</small></div>
      <div class="seg">
        <button data-v="sha" class="${cur === 'sha' ? 'on-sha' : ''}">⛰️ 砂(高)</button>
        <button data-v="shui" class="${cur === 'shui' ? 'on-shui' : ''}">💧 水(低)</button>
        <button data-v="none" class="${cur === 'none' ? 'active-none' : ''}">平/无</button>
      </div>
      <div class="js-note">${noteFor(dir, cur)}</div>`;
    row.querySelectorAll('.seg button').forEach(b =>
      b.addEventListener('click', () => {
        state[dir] = b.dataset.v === 'none' ? null : b.dataset.v;
        if (!state[dir]) delete state[dir];
        renderRows(); renderReport();
      }));
    rowsBox.appendChild(row);
  });
}

function noteFor(dir, cur) {
  if (!cur || cur === 'none') {
    return NEED_SHA.has(dir)
      ? '还没标。若这边确实没有高大物,可以想想能否布置高柜、实墙「造砂」。'
      : '还没标。若这边本来就开阔,那就正好符合「要水」。';
  }
  const [cls, text] = cur === 'sha' ? LINES[dir].sha : LINES[dir].shui;
  const want = NEED_SHA.has(dir) ? 'sha' : 'shui';
  const match = cur === want;
  return `<b class="${match ? 'good' : 'bad'}">${match ? '✔ 符合口诀' : '✖ 与口诀相反'}</b> ${text}`;
}

function renderReport() {
  let match = 0, counted = 0, fixRows = '';
  DIRECTIONS.forEach(dir => {
    const cur = state[dir];
    if (!cur) return;
    counted++;
    const want = NEED_SHA.has(dir) ? 'sha' : 'shui';
    if (cur === want) match++;
    else {
      fixRows += `<li><span class="neg">${dir}方</span>${cur === 'sha' ? '有砂但要水' : '有水但要砂'}<small>${cur === 'sha'
        ? '尽量简化:此侧少堆高物,保持门窗开阔、动线通畅,就是「造水」。'
        : '人造砂:高柜、书柜、实墙、床靠这面墙;没有条件就保持此角整洁静实。'}</small></li>`;
    }
  });

  let verdict;
  if (!counted) verdict = '把八方逐个标上「砂 / 水」,马上评分。';
  else {
    const pct = Math.round(match / counted * 100);
    if (pct >= 75) verdict = `🎉 <b>砂水得位 ${match}/${counted}:</b>大部分符合「一二十四砂、六七八九水」,格局很顺。`;
    else if (pct >= 50) verdict = `👍 <b>砂水得位 ${match}/${counted}:</b>过半符合。把下面几条反位的按「人造砂/水」微调,不必大动干戈。`;
    else verdict = `⚠️ <b>砂水得位 ${match}/${counted}:</b>反位偏多。注意:这只是传统视角——现代楼房不可能八方完美,优先处理「北要有砂(挡风)」和「南要有水(采光)」这两条最有实际意义的。`;
  }

  document.getElementById('js-report').innerHTML = `
    <div class="verdict">${verdict}</div>
    ${fixRows ? `<ul class="result-list" style="margin-top:.8rem">${fixRows}</ul>` : ''}
    <p style="font-size:.85rem;color:var(--ink-soft);margin-top:.6rem">
      小知识:这套口诀其实很「科学」——北要砂 = 挡冬季北风,南要水 = 迎采光暖阳,东砂西水与日照、视线的关系也都说得通。
    </p>`;
}

renderRows();
renderReport();
