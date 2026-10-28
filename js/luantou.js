/* ========== 峦头派 · 环境分析 ========== */

const DIRECTIONS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
const norm360 = a => ((a % 360) + 360) % 360;

// 环境要素库:基础文本会传入位置关系(d:当前方位, sit:坐山, facing:朝向)
const FEATS = [
  { id: 'high', emoji: '🏔️', name: '高楼/山坡',
    text: (d, sit, facing) =>
      d === sit ? ['good', '背后有高楼或山坡作「靠山」,安稳有贵人,峦头第一大吉。']
      : d === facing ? ['neg', '前方高楼逼近,遮挡采光、压迫明堂,有压抑感。窗前保持整洁,室内灯光补足。']
      : ['good', '侧边有高楼,如龙虎环护,有庇护感,吉。'] },
  { id: 'tree', emoji: '🌳', name: '大树/树林',
    text: (d, sit, facing) =>
      d === facing ? ['neg', '门前大树挡光挡门(顶心杉),建议修剪或移栽。']
      : ['good', '绿化环绕,空气好,吉;注意近窗大树别遮光。'] },
  { id: 'road', emoji: '🛣️', name: '道路',
    text: () => ['pos', '有道路经过,出入便利;吉凶看形态——环抱吉,直冲、反弓凶(选「直冲路/反弓路」专项判断)。'] },
  { id: 'rush', emoji: '➡️', name: '直路正冲(枪煞)',
    text: (d, sit, facing) => ['neg',
      (d === facing ? '直路正对大门/阳台,' : '直路正冲这一侧,') + '车速气流直射,峦头大忌。化解:玄关屏风缓冲、窗台绿植、厚窗帘,尽量别把床放在被冲的墙后。'] },
  { id: 'curve', emoji: '🌙', name: '反弓路/反弓水',
    text: () => ['neg', '处于道路/河流反弓外侧(镰刀煞):噪音大、气流离心,传统谓不聚财。厚窗帘、绿植缓冲。'] },
  { id: 'jade', emoji: '🎀', name: '环抱路/玉带水',
    text: () => ['good', '玉带环腰!路或水环抱宅前,聚气聚财,峦头上上格。保持门前整洁即可。'] },
  { id: 'water', emoji: '🌊', name: '河湖/水池',
    text: (d, sit, facing) =>
      d === facing ? ['good', '明堂见水,传统「前水为聚财」,吉;注意防潮防蚊。']
      : d === sit ? ['neg', '坐后见水,传统谓根基不稳;实际注意防潮、选靠实墙的房间即可。']
      : ['good', '侧见秀水,环境宜人,吉。'] },
  { id: 'bridge', emoji: '🌉', name: '天桥/高架',
    text: () => ['neg', '邻近天桥/高架:噪音灰尘大;若其反弓或直切正对,为镰刀煞。隔音窗+厚帘+绿植三件套。'] },
  { id: 'power', emoji: '⚡', name: '电塔/变电站',
    text: () => ['neg', '电塔/变电站:主要是电磁与视觉顾虑,距离越远影响越小;别让卧室窗长期正对,绿植遮挡视线。'] },
  { id: 'sharp', emoji: '📐', name: '尖角/楼缝正对',
    text: () => ['neg', '尖角建筑或两楼窄缝正对(尖角煞/天斩煞):视觉压迫、强风穿缝。绿植屏风遮挡、常关帘。'] },
  { id: 'open', emoji: '⬜', name: '空地/广场(明堂)',
    text: (d, sit, facing) =>
      d === facing ? ['good', '前方空旷 = 「明堂开阔」,采光好、视野佳、前景感强,峦头大吉!']
      : ['good', '旁有空地,视野舒缓,吉。'] },
];
const FEAT_BY_ID = Object.fromEntries(FEATS.map(f => [f.id, f]));

// ---------- 状态 ----------
let facingIdx = 4; // 默认朝南
try {
  const saved = parseInt(localStorage.getItem('yz_facing_idx'), 10);
  if (!Number.isNaN(saved)) facingIdx = ((saved % 8) + 8) % 8;
} catch (e) { /* ignore */ }

// 各方位环境: { dirIndex: [featId] }
let env = {};
try {
  const savedPlan = JSON.parse(localStorage.getItem('yz_plan_v1'));
  if (savedPlan && Array.isArray(savedPlan.marks)) {
    const map = { high: 'high', tree: 'tree', road: 'road', rush: 'rush', curve: 'curve', jade: 'jade', water: 'water', bridge: 'bridge', power: 'power', sharp: 'sharp', open: 'open' };
    savedPlan.marks.forEach(m => {
      if (!map[m.t]) return;
      const dx = m.x - savedPlan.cx, dy = m.y - savedPlan.cy;
      const bearing = (Math.atan2(dx, -dy) * 180 / Math.PI + (savedPlan.north || 0) + 360) % 360;
      const idx = Math.round(bearing / 45) % 8;
      (env[idx] = env[idx] || []).push(map[m.t]);
    });
  }
} catch (e) { /* ignore */ }

let selDir = facingIdx;

// ---------- UI:朝向按钮 ----------
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

// ---------- UI:方位 chips + 勾选面板 ----------
const dirChips = document.getElementById('dir-chips');
const checkPalette = document.getElementById('check-palette');

function renderChips() {
  dirChips.innerHTML = '';
  DIRECTIONS.forEach((d, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const n = (env[i] || []).length;
    btn.innerHTML = `${d}方${n ? `<span class="cnt">(${n})</span>` : ''}`;
    btn.classList.toggle('active', i === selDir);
    btn.addEventListener('click', () => { selDir = i; renderChips(); renderPalette(); });
    dirChips.appendChild(btn);
  });
}

function renderPalette() {
  const cur = env[selDir] || [];
  checkPalette.innerHTML = '';
  FEATS.forEach(f => {
    const label = document.createElement('label');
    label.className = cur.includes(f.id) ? 'on' : '';
    label.innerHTML = `<input type="checkbox" ${cur.includes(f.id) ? 'checked' : ''}/> ${f.emoji} ${f.name}`;
    label.querySelector('input').addEventListener('change', function () {
      env[selDir] = env[selDir] || [];
      if (this.checked) env[selDir].push(f.id);
      else env[selDir] = env[selDir].filter(x => x !== f.id);
      renderChips(); renderPalette(); renderReport();
    });
    checkPalette.appendChild(label);
  });
}

// ---------- 报告 ----------
function renderReport() {
  const sitIdx = (facingIdx + 4) % 8;
  const sit = DIRECTIONS[sitIdx], facing = DIRECTIONS[facingIdx];
  const body = document.getElementById('report-body');
  let good = 0, bad = 0, rows = '';

  // 结构检查:靠山 / 明堂
  const sitFeats = env[sitIdx] || [], faceFeats = env[facingIdx] || [];
  rows += `<li><span class="${sitFeats.includes('high') || sitFeats.includes('tree') ? 'good' : 'neg'}">${sitFeats.includes('high') || sitFeats.includes('tree') ? '✔ 有靠山' : '✖ 缺靠山'}</span> — 坐山方(${sit})${sitFeats.includes('high') || sitFeats.includes('tree') ? '有高楼/大树,背后有依托。' : '没有高楼大树。小技巧:床头靠实墙、身后是书柜,就是「人造靠山」。'}</li>`;
  rows += `<li><span class="${faceFeats.includes('open') || faceFeats.includes('water') || faceFeats.includes('jade') ? 'good' : 'neg'}">${faceFeats.includes('open') || faceFeats.includes('water') || faceFeats.includes('jade') ? '✔ 明堂开阔' : '△ 明堂一般'}</span> — 朝向方(${facing})${faceFeats.includes('open') || faceFeats.includes('water') || faceFeats.includes('jade') ? '开阔或见水,前景好,吉。' : '不算开阔。尽量别在窗前堆高大家具,保持视野。'}</li>`;

  DIRECTIONS.forEach((d, i) => {
    (env[i] || []).forEach(fid => {
      const f = FEAT_BY_ID[fid];
      if (!f) return;
      const [cls, text] = f.text(d, sit, facing);
      if (cls === 'good') good++; else if (cls === 'neg') bad++;
      rows += `<li><span class="${cls === 'good' ? 'good' : cls === 'neg' ? 'neg' : 'pos'}">${cls === 'good' ? '吉' : cls === 'neg' ? '凶' : '中'}</span> ${d}方 · ${f.emoji} ${f.name}<small>${text}</small></li>`;
    });
  });

  let verdict;
  const total = good + bad;
  if (!total) verdict = '还没有勾选环境要素。按真实情况勾几个,马上出结论。';
  else if (bad === 0) verdict = `🎉 <b>峦头格局很好:</b>${good} 项全吉,山环水抱。保持现状,注意整洁采光即可。`;
  else if (good >= bad) verdict = `👍 <b>峦头整体偏吉:</b>吉 ${good} 项、凶 ${bad} 项。把上面带「凶」的几条按化解方法处理,就不影响大局。`;
  else verdict = `⚠️ <b>峦头偏凶:</b>吉 ${good} 项、凶 ${bad} 项。重点处理「直冲/反弓/尖角」类:它们多数能用<b>玄关、绿植、窗帘</b>缓冲化解,不必焦虑。`;

  body.innerHTML = `
    ${rows ? `<ul class="result-list">${rows}</ul>` : ''}
    <div class="verdict">${verdict}</div>
    <p style="font-size:.85rem;color:var(--ink-soft);margin-top:.6rem">
      坐山 = ${sit}(背后)、向首 = ${facing}(面前)。峦头讲「坐实朝空」:背后宜有依托,面前宜开阔。
    </p>`;
}

function renderAll() {
  document.querySelectorAll('#dir-grid button').forEach((b, i) =>
    b.classList.toggle('active', i === facingIdx));
  if (selDir === undefined || selDir === null) selDir = facingIdx;
  renderChips();
  renderPalette();
  renderReport();
}

renderAll();
