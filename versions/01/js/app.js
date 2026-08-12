import {
  calcBMR, calcTDEE, calcTargets, calcExerciseBurn, calcFoodNutrition,
  sumItems, calcDayStats, getActivityLabel, getGoalLabel
} from './calc.js';
import { FOOD_DB, ACTIVITY_DB, MEAL_LABELS, MEAL_ICONS } from './fooddb.js';
import {
  getProfile, setProfile, getLogs, getDateLog, updateDateLog,
  clearAllData, exportData, importData, computeTargetsFromProfile, getTodayStr
} from './store.js';

const state = {
  currentDate: getTodayStr(),
  profile: null,
  targets: null,
  charts: {},
  planPref: 'none'
};

const APP_VERSION = 'v1.0';

function init() {
  state.profile = getProfile();
  state.targets = state.profile ? computeTargetsFromProfile(state.profile) : null;

  bindTabs();
  bindHome();
  bindMenu();
  bindSport();
  bindPlan();
  bindProfile();
  bindSettings();

  if (!state.profile) {
    switchTab('profile');
    document.getElementById('profile-title').textContent = '欢迎建档';
  } else {
    switchTab('home');
  }

  renderAll();
}

function renderAll() {
  state.targets = state.profile ? computeTargetsFromProfile(state.profile) : null;
  renderHome();
  renderMenuPage();
  renderSportPage();
  renderPlanPage();
  renderTrendPage();
  renderProfilePage();
  renderSettingsPage();
}

// Tabs
function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.page').forEach(page => {
    page.classList.toggle('active', page.id === `page-${tab}`);
  });
  if (tab === 'trend') renderTrendPage();
  if (tab === 'menu') renderMenuPage();
  if (tab === 'sport') renderSportPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Common helpers
function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${m}月${d}日`;
}

function getStats(date = state.currentDate) {
  const log = getDateLog(date);
  return calcDayStats({ dateLog: log, foodDB: FOOD_DB, targets: state.targets });
}

function streakDay() {
  const logs = getLogs();
  const dates = Object.keys(logs).filter(d => d <= state.currentDate);
  return Math.max(1, dates.length);
}

function showModal(title, bodyHTML, footerHTML = '') {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" id="modal-close">×</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>
    </div>
  `;
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

// Home
function bindHome() {
  document.getElementById('btn-start-today').addEventListener('click', () => switchTab('menu'));
  document.getElementById('btn-add-food-home').addEventListener('click', () => switchTab('menu'));
  document.getElementById('btn-today-can').addEventListener('click', () => switchTab('plan'));
  document.getElementById('btn-random').addEventListener('click', randomFood);
  document.getElementById('btn-cook-decide').addEventListener('click', decideCook);
}

function renderHome() {
  const hour = new Date().getHours();
  let greet = '晚上好';
  if (hour < 12) greet = '早上好';
  else if (hour < 18) greet = '下午好';
  const name = state.profile ? (state.profile.nickname || '小厨师') : '小厨师';
  document.getElementById('home-greeting').textContent = `${greet}，${name}`;
  document.getElementById('streak-day').textContent = streakDay();

  const stats = getStats();
  const target = state.targets?.targetCalories || 0;
  document.getElementById('stat-intake').textContent = stats.intake.kcal;
  document.getElementById('stat-target').textContent = target;
  const net = stats.remaining;
  document.getElementById('stat-net').textContent = net > 0 ? `+${net}` : net;
  document.getElementById('net-label').textContent = state.profile?.goal === 'bulk' ? '还需吃' : '剩余';

  const pct = target ? Math.min(100, Math.round((stats.intake.kcal / target) * 100)) : 0;
  document.getElementById('progress-text').textContent = `${pct}%`;
  const fill = document.getElementById('progress-fill');
  fill.style.width = `${pct}%`;
  fill.className = 'progress-fill';
  if (stats.intake.kcal > target) fill.classList.add('over');
  else if (pct < 30 && state.profile?.goal !== 'bulk') fill.classList.add('under');

  const macros = state.targets?.macros || { protein: 0, fat: 0, carb: 0 };
  const pPct = macros.protein ? Math.min(100, Math.round((stats.intake.protein / macros.protein) * 100)) : 0;
  const fPct = macros.fat ? Math.min(100, Math.round((stats.intake.fat / macros.fat) * 100)) : 0;
  const cPct = macros.carb ? Math.min(100, Math.round((stats.intake.carb / macros.carb) * 100)) : 0;

  document.getElementById('protein-text').textContent = `${Math.round(stats.intake.protein)} / ${macros.protein} g`;
  document.getElementById('fat-text').textContent = `${Math.round(stats.intake.fat)} / ${macros.fat} g`;
  document.getElementById('carb-text').textContent = `${Math.round(stats.intake.carb)} / ${macros.carb} g`;
  document.getElementById('protein-fill').style.width = `${pPct}%`;
  document.getElementById('fat-fill').style.width = `${fPct}%`;
  document.getElementById('carb-fill').style.width = `${cPct}%`;

  // fridge count
  const todayLog = getDateLog(state.currentDate);
  const uniqueFoods = new Set();
  Object.values(todayLog.meals).forEach(items => items.forEach(i => uniqueFoods.add(i.foodId)));
  document.getElementById('fridge-count').textContent = `${uniqueFoods.size} 种食材 · 0 种快过期`;

  // notice
  const notice = document.getElementById('home-notice');
  if (!state.profile) {
    notice.style.display = 'block';
    notice.className = 'notice';
    notice.textContent = '先去「我们」页面完成建档，才能看到热量目标哦。';
  } else if (stats.intake.protein < macros.protein * 0.7) {
    notice.style.display = 'block';
    notice.className = 'notice';
    notice.textContent = `蛋白质还差 ${Math.round(macros.protein - stats.intake.protein)} 克，建议加餐鸡蛋或牛奶。`;
  } else if (state.profile.goal === 'cut' && stats.intake.kcal > target) {
    notice.style.display = 'block';
    notice.className = 'notice alert';
    notice.textContent = '今日摄入已超过目标，晚餐可以清淡一点。';
  } else if (state.profile.goal === 'bulk' && stats.intake.kcal < target * 0.8) {
    notice.style.display = 'block';
    notice.className = 'notice warn';
    notice.textContent = `离目标还差 ${target - stats.intake.kcal} kcal，记得加餐。`;
  } else {
    notice.style.display = 'none';
  }
}

function randomFood() {
  const foods = FOOD_DB;
  const f = foods[Math.floor(Math.random() * foods.length)];
  showModal('随机吃什么', `
    <div style="text-align:center;padding:20px 0;">
      <div style="font-size:64px;margin-bottom:12px;">${f.icon}</div>
      <div style="font-size:22px;font-weight:800;margin-bottom:6px;">${f.name}</div>
      <div style="color:var(--text-secondary);font-size:14px;">${f.kcal} kcal / 100g · 蛋白质 ${f.protein}g · 碳水 ${f.carb}g · 脂肪 ${f.fat}g</div>
    </div>
  `, `<button class="btn-primary btn-full" id="btn-random-ok">好，就它</button>`);
  document.getElementById('btn-random-ok').addEventListener('click', closeModal);
}

function decideCook() {
  const names = ['你', 'TA'];
  const loser = names[Math.floor(Math.random() * names.length)];
  showModal('今天谁做饭', `
    <div style="text-align:center;padding:30px 0;">
      <div style="font-size:56px;margin-bottom:16px;">🎲</div>
      <div style="font-size:20px;font-weight:700;">命运决定：</div>
      <div style="font-size:32px;font-weight:800;color:var(--primary);margin-top:8px;">${loser} 做饭</div>
      <div style="color:var(--text-secondary);font-size:13px;margin-top:8px;">输的人掌勺，赢的人洗碗</div>
    </div>
  `);
}

// Menu page
function bindMenu() {
  document.getElementById('menu-prev').addEventListener('click', () => changeDate(-1));
  document.getElementById('menu-next').addEventListener('click', () => changeDate(1));
  document.getElementById('btn-save-weight').addEventListener('click', () => {
    const w = parseFloat(document.getElementById('weight-input').value);
    if (!isNaN(w) && w > 20 && w < 300) {
      updateDateLog(state.currentDate, { weight: w });
      renderMenuPage();
      renderTrendPage();
      showToast('体重已保存');
    }
  });
}

function changeDate(delta) {
  const d = new Date(state.currentDate);
  d.setDate(d.getDate() + delta);
  state.currentDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  renderMenuPage();
}

function renderMenuPage() {
  document.getElementById('menu-date').textContent = state.currentDate === getTodayStr() ? `今天 · ${fmtDate(state.currentDate)}` : fmtDate(state.currentDate);
  const stats = getStats();
  const log = getDateLog(state.currentDate);

  document.getElementById('menu-intake').textContent = stats.intake.kcal;
  document.getElementById('menu-burn').textContent = stats.totalBurn;
  document.getElementById('menu-net').textContent = stats.netBalance > 0 ? `+${stats.netBalance}` : stats.netBalance;

  document.getElementById('weight-input').value = log.weight || '';

  const container = document.getElementById('meal-list');
  container.innerHTML = '';

  for (const key of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const items = log.meals[key];
    const total = stats.perMeal[key];
    const card = document.createElement('div');
    card.className = 'meal-card';
    card.innerHTML = `
      <div class="meal-header">
        <span class="meal-name"><span>${MEAL_ICONS[key]}</span> ${MEAL_LABELS[key]}</span>
        <span class="meal-cal">${total.kcal} kcal · 蛋 ${Math.round(total.protein)}g</span>
      </div>
      <div class="meal-items" id="meal-items-${key}"></div>
      <div class="add-food-row">
        <button class="btn-add" data-meal="${key}" style="flex:1;">➕ 添加${MEAL_LABELS[key]}</button>
      </div>
    `;
    container.appendChild(card);

    const list = card.querySelector(`#meal-items-${key}`);
    if (items.length === 0) {
      list.innerHTML = `<p class="empty-state">还没有记录${MEAL_LABELS[key]}</p>`;
    } else {
      items.forEach((item, idx) => {
        const food = FOOD_DB.find(f => f.id === item.foodId);
        if (!food) return;
        const n = calcFoodNutrition(food, item.grams);
        const row = document.createElement('div');
        row.className = 'meal-item';
        row.innerHTML = `
          <div class="item-info">
            <span>${food.icon}</span>
            <span>
              <span class="item-name">${food.name}</span>
              <span class="item-grams">${item.grams}g</span>
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="item-cal">${n.kcal} kcal</span>
            <button class="delete-btn" data-meal="${key}" data-idx="${idx}">×</button>
          </div>
        `;
        list.appendChild(row);
      });
    }
  }

  container.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => showAddFoodModal(btn.dataset.meal));
  });
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteFoodItem(btn.dataset.meal, parseInt(btn.dataset.idx)));
  });
}

function showAddFoodModal(mealKey) {
  let selected = null;
  let grams = 100;
  showModal(`添加${MEAL_LABELS[mealKey]}`, `
    <input type="text" class="search-input" id="food-search" placeholder="搜索食物：鸡蛋、米饭、鸡胸肉…" />
    <div class="search-results" id="food-results"></div>
    <div id="food-detail" style="display:none;margin-top:16px;">
      <div class="stepper">
        <button id="g-minus">−</button>
        <input type="number" id="grams-input" value="100" />
        <button id="g-plus">+</button>
      </div>
      <div style="text-align:center;color:var(--text-secondary);font-size:13px;" id="food-preview"></div>
    </div>
  `, `<button class="btn-primary btn-full" id="btn-confirm-food" disabled>确定添加</button>`);

  const input = document.getElementById('food-search');
  const results = document.getElementById('food-results');
  const detail = document.getElementById('food-detail');
  const gramsInput = document.getElementById('grams-input');
  const preview = document.getElementById('food-preview');
  const confirmBtn = document.getElementById('btn-confirm-food');

  function renderResults(query = '') {
    const q = query.trim().toLowerCase();
    const list = FOOD_DB.filter(f => f.name.includes(q) || f.category.includes(q)).slice(0, 50);
    results.innerHTML = list.map(f => `
      <div class="search-result" data-id="${f.id}">
        <div class="info"><span style="font-size:22px;">${f.icon}</span>
          <div><div class="name">${f.name}</div><div class="meta">${f.kcal} kcal/100g · ${f.category}</div></div>
        </div>
      </div>
    `).join('');
    results.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', () => {
        selected = FOOD_DB.find(f => f.id === el.dataset.id);
        detail.style.display = 'block';
        gramsInput.value = grams;
        updatePreview();
        confirmBtn.disabled = false;
      });
    });
  }

  function updatePreview() {
    if (!selected) return;
    const n = calcFoodNutrition(selected, grams);
    preview.innerHTML = `${grams}g ${selected.name} ≈ ${n.kcal} kcal · 蛋 ${n.protein}g · 脂 ${n.fat}g · 碳 ${n.carb}g`;
  }

  input.addEventListener('input', e => renderResults(e.target.value));
  renderResults();

  document.getElementById('g-minus').addEventListener('click', () => {
    grams = Math.max(10, grams - 10);
    gramsInput.value = grams;
    updatePreview();
  });
  document.getElementById('g-plus').addEventListener('click', () => {
    grams += 10;
    gramsInput.value = grams;
    updatePreview();
  });
  gramsInput.addEventListener('change', e => {
    grams = Math.max(1, parseInt(e.target.value) || 100);
    gramsInput.value = grams;
    updatePreview();
  });

  confirmBtn.addEventListener('click', () => {
    if (!selected) return;
    const log = getDateLog(state.currentDate);
    log.meals[mealKey].push({ foodId: selected.id, grams });
    updateDateLog(state.currentDate, { meals: log.meals });
    closeModal();
    renderAll();
  });
}

function deleteFoodItem(mealKey, idx) {
  const log = getDateLog(state.currentDate);
  log.meals[mealKey].splice(idx, 1);
  updateDateLog(state.currentDate, { meals: log.meals });
  renderAll();
}

// Sport page
function bindSport() {
  document.getElementById('btn-add-exercise').addEventListener('click', showAddExerciseModal);
  document.getElementById('btn-save-manual').addEventListener('click', () => {
    const mi = parseFloat(document.getElementById('manual-intake').value) || 0;
    const mb = parseFloat(document.getElementById('manual-burn').value) || 0;
    updateDateLog(state.currentDate, { manualIntake: mi, manualBurn: mb });
    renderAll();
    showToast('调整已保存');
  });
}

function renderSportPage() {
  const log = getDateLog(state.currentDate);
  const stats = getStats();
  document.getElementById('sport-total').textContent = `${stats.exerciseBurn + stats.manualBurn} kcal`;
  document.getElementById('manual-intake').value = log.manualIntake || '';
  document.getElementById('manual-burn').value = log.manualBurn || '';

  const list = document.getElementById('exercise-list');
  if (log.exercises.length === 0) {
    list.innerHTML = `<p class="empty-state">今天还没记录运动</p>`;
    return;
  }
  list.innerHTML = log.exercises.map((ex, idx) => `
    <div class="exercise-item">
      <span class="ex-name"><span>${ACTIVITY_DB.find(a => a.id === ex.metId)?.icon || '🔥'}</span> ${ex.name} · ${ex.minutes} 分钟</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="ex-cal">${ex.burnKcal} kcal</span>
        <button class="delete-btn" data-idx="${idx}">×</button>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteExercise(parseInt(btn.dataset.idx)));
  });
}

function showAddExerciseModal() {
  let selected = null;
  let minutes = 30;
  showModal('添加运动', `
    <div class="chips" id="act-chips">
      ${ACTIVITY_DB.map(a => `<span class="chip" data-id="${a.id}">${a.icon} ${a.name}</span>`).join('')}
    </div>
    <div class="stepper">
      <button id="m-minus">−</button>
      <input type="number" id="minutes-input" value="30" />
      <button id="m-plus">+</button>
    </div>
    <div style="text-align:center;color:var(--text-secondary);font-size:13px;" id="ex-preview"></div>
  `, `<button class="btn-primary btn-full" id="btn-confirm-ex" disabled>确定添加</button>`);

  const preview = document.getElementById('ex-preview');
  const confirmBtn = document.getElementById('btn-confirm-ex');

  function updatePreview() {
    if (!selected) return;
    const burn = calcExerciseBurn({ met: selected.met, weightKg: state.profile?.weight || 60, minutes });
    preview.textContent = `${minutes} 分钟 ${selected.name} ≈ ${burn} kcal`;
  }

  document.getElementById('act-chips').querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('act-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selected = ACTIVITY_DB.find(a => a.id === chip.dataset.id);
      confirmBtn.disabled = false;
      updatePreview();
    });
  });

  const minInput = document.getElementById('minutes-input');
  document.getElementById('m-minus').addEventListener('click', () => {
    minutes = Math.max(5, minutes - 5);
    minInput.value = minutes;
    updatePreview();
  });
  document.getElementById('m-plus').addEventListener('click', () => {
    minutes += 5;
    minInput.value = minutes;
    updatePreview();
  });
  minInput.addEventListener('change', e => {
    minutes = Math.max(1, parseInt(e.target.value) || 30);
    minInput.value = minutes;
    updatePreview();
  });

  confirmBtn.addEventListener('click', () => {
    if (!selected) return;
    const log = getDateLog(state.currentDate);
    const burn = calcExerciseBurn({ met: selected.met, weightKg: state.profile?.weight || 60, minutes });
    log.exercises.push({ metId: selected.id, name: selected.name, minutes, burnKcal: burn });
    updateDateLog(state.currentDate, { exercises: log.exercises });
    closeModal();
    renderAll();
  });
}

function deleteExercise(idx) {
  const log = getDateLog(state.currentDate);
  log.exercises.splice(idx, 1);
  updateDateLog(state.currentDate, { exercises: log.exercises });
  renderAll();
}

// Plan page
function bindPlan() {
  document.getElementById('plan-prefs').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.getElementById('plan-prefs').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.planPref = chip.dataset.pref;
  });
  document.getElementById('btn-generate-plan').addEventListener('click', generatePlan);
}

function renderPlanPage() {
  const prefContainer = document.getElementById('plan-prefs');
  if (!prefContainer.querySelector('.active')) {
    prefContainer.querySelector(`[data-pref="${state.planPref}"]`)?.classList.add('active');
  }
}

function generatePlan() {
  if (!state.targets) {
    showModal('提示', `<p class="empty-state">请先完成个人建档。</p>`);
    return;
  }

  const pref = state.planPref;
  let pool = FOOD_DB.slice();
  if (pref === 'vegetarian') pool = pool.filter(f => !['chicken_breast', 'beef_steak', 'salmon', 'shrimp', 'pork_tenderloin'].includes(f.id));
  if (pref === 'lowfat') pool = pool.filter(f => f.fat < 10);
  if (pref === 'highprotein') pool = pool.sort((a, b) => b.protein - a.protein);

  const ratios = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };
  const plan = {};

  for (const meal of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const targetKcal = Math.round(state.targets.targetCalories * ratios[meal]);
    const items = [];
    let remaining = targetKcal;
    let tries = 0;
    while (remaining > 50 && tries < 6) {
      const candidates = pool.filter(f => f.kcal <= remaining * 1.5);
      if (candidates.length === 0) break;
      const f = candidates[Math.floor(Math.random() * candidates.length)];
      let grams = 100;
      if (f.kcal < remaining * 0.4) {
        grams = Math.min(300, Math.max(50, Math.round(remaining / f.kcal * 50)));
      }
      const n = calcFoodNutrition(f, grams);
      items.push({ food: f, grams, ...n });
      remaining -= n.kcal;
      tries++;
    }
    plan[meal] = items;
  }

  const total = Object.values(plan).flat().reduce((s, i) => ({ kcal: s.kcal + i.kcal, protein: s.protein + i.protein, fat: s.fat + i.fat, carb: s.carb + i.carb }), { kcal: 0, protein: 0, fat: 0, carb: 0 });

  document.getElementById('plan-result').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px;">
      <strong>生成结果</strong>
      <span style="font-size:13px;color:var(--text-secondary);">${Math.round(total.kcal)} kcal · 蛋 ${Math.round(total.protein)}g</span>
    </div>
    ${Object.entries(plan).map(([meal, items]) => `
      <div class="plan-meal">
        <h4>${MEAL_ICONS[meal]} ${MEAL_LABELS[meal]}</h4>
        ${items.map(i => `
          <div class="plan-item"><span>${i.food.icon} ${i.food.name} ${i.grams}g</span><span>${i.kcal} kcal</span></div>
        `).join('')}
      </div>
    `).join('')}
    <button class="btn-primary btn-full" id="btn-adopt-plan">采用为今日菜单</button>
  `;

  document.getElementById('btn-adopt-plan').addEventListener('click', () => {
    const meals = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const [meal, items] of Object.entries(plan)) {
      meals[meal] = items.map(i => ({ foodId: i.food.id, grams: i.grams }));
    }
    updateDateLog(state.currentDate, { meals });
    renderAll();
    showToast('已采用为今日菜单');
    switchTab('menu');
  });
}

// Trend page
function renderTrendPage() {
  const logs = getLogs();
  const dates = Object.keys(logs).sort();
  const weightData = dates.map(d => logs[d].weight ?? null);
  const balanceData = dates.map(d => {
    const stats = calcDayStats({ dateLog: logs[d], foodDB: FOOD_DB, targets: state.targets });
    return stats.netBalance;
  });

  const summary = document.getElementById('trend-summary');
  if (dates.length === 0) {
    summary.innerHTML = `<p class="empty-state">还没有历史数据</p>`;
    return;
  }

  const validWeights = weightData.filter(w => w != null);
  const avgWeight = validWeights.length ? (validWeights.reduce((a, b) => a + b, 0) / validWeights.length).toFixed(1) : '-';
  const avgBalance = balanceData.length ? Math.round(balanceData.reduce((a, b) => a + b, 0) / balanceData.length) : 0;
  const weightChange = validWeights.length >= 2 ? (validWeights[validWeights.length - 1] - validWeights[0]).toFixed(1) : '-';

  summary.innerHTML = `
    <div class="section-title"><h3>周/月小结</h3></div>
    <div class="range-summary">
      <div class="box"><div class="v">${dates.length}</div><div class="k">记录天数</div></div>
      <div class="box"><div class="v">${avgWeight}</div><div class="k">平均体重 kg</div></div>
      <div class="box"><div class="v">${weightChange}</div><div class="k">体重变化 kg</div></div>
    </div>
    <div class="notice">平均每日热量差额 ${avgBalance > 0 ? '+' + avgBalance : avgBalance} kcal。减脂建议每周 -0.5kg 左右，过快可能掉肌肉。</div>
  `;

  setTimeout(() => {
    renderChart('weight-chart', dates, weightData, '体重 kg', '#FF7A5C');
    renderChart('balance-chart', dates, balanceData, '净差额 kcal', '#A8D5A2', true);
  }, 0);
}

function renderChart(canvasId, labels, data, label, color, zeroLine = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (state.charts[canvasId]) {
    state.charts[canvasId].destroy();
  }
  state.charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data,
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderColor: color,
        fill: true,
        tension: 0.3,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 10 }, maxTicksLimit: 6 }, grid: { display: false } },
        y: {
          beginAtZero: !zeroLine,
          grid: { color: '#f0e8e4' },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

// 建档页
function bindProfile() {
  document.getElementById('profile-form').addEventListener('submit', e => {
    e.preventDefault();
    const profile = {
      gender: document.getElementById('gender').value,
      age: parseInt(document.getElementById('age').value),
      height: parseFloat(document.getElementById('height').value),
      weight: parseFloat(document.getElementById('weight').value),
      activity: parseFloat(document.getElementById('activity').value),
      goal: document.getElementById('goal').value
    };
    if (!profile.gender || !profile.age || !profile.height || !profile.weight || !profile.activity) {
      showToast('请填写完整信息');
      return;
    }
    setProfile(profile);
    state.profile = profile;
    state.targets = computeTargetsFromProfile(profile);
    renderAll();
    showToast('档案已保存');
    switchTab('home');
  });
}

function renderProfilePage() {
  if (!state.profile) {
    document.getElementById('target-grid').style.display = 'none';
    return;
  }
  document.getElementById('target-grid').style.display = 'grid';
  document.getElementById('profile-title').textContent = '个人档案';

  const bmr = calcBMR(state.profile);
  const tdee = calcTDEE(bmr, state.profile.activity);
  const targets = state.targets;

  document.getElementById('t-bmr').textContent = Math.round(bmr);
  document.getElementById('t-tdee').textContent = tdee;
  document.getElementById('t-target').textContent = targets.targetCalories;
  document.getElementById('t-delta').textContent = (targets.delta > 0 ? '+' : '') + targets.delta;

  document.getElementById('gender').value = state.profile.gender;
  document.getElementById('age').value = state.profile.age;
  document.getElementById('height').value = state.profile.height;
  document.getElementById('weight').value = state.profile.weight;
  document.getElementById('activity').value = state.profile.activity;
  document.getElementById('goal').value = state.profile.goal;
}

// 设置页（数据管理）
function bindSettings() {
  document.getElementById('btn-export').addEventListener('click', () => {
    const data = JSON.stringify(exportData(), null, 2);
    navigator.clipboard.writeText(data).then(() => showToast('数据已复制到剪贴板'));
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    showModal('导入数据', `
      <p style="font-size:13px;color:var(--text-secondary);">请粘贴之前导出的 JSON 数据：</p>
      <textarea id="import-area" style="width:100%;height:120px;border:1px solid #E8DDD7;border-radius:12px;padding:12px;font-size:13px;"></textarea>
    `, `<button class="btn-primary btn-full" id="btn-confirm-import">导入</button>`);
    document.getElementById('btn-confirm-import').addEventListener('click', () => {
      try {
        const data = JSON.parse(document.getElementById('import-area').value);
        importData(data);
        state.profile = getProfile();
        state.targets = computeTargetsFromProfile(state.profile);
        renderAll();
        closeModal();
        showToast('导入成功');
      } catch (e) {
        showToast('JSON 格式错误');
      }
    });
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    if (confirm('确定清空所有数据吗？此操作不可恢复。')) {
      clearAllData();
      state.profile = null;
      state.targets = null;
      renderAll();
      showToast('数据已清空');
      switchTab('profile');
    }
  });
}

function renderSettingsPage() {
  // 数据管理页内容静态，无需额外渲染
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `position:fixed;left:50%;bottom:110px;transform:translateX(-50%);background:#3D322B;color:#fff;padding:10px 18px;border-radius:999px;font-size:14px;z-index:200;box-shadow:var(--shadow);`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 1800);
}

// Go
document.addEventListener('DOMContentLoaded', init);
