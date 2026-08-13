import {
  calcBMR, calcTDEE, calcTargets, calcExerciseBurn, calcFoodNutrition,
  sumItems, calcDayStats, getActivityLabel, getGoalLabel, estimateWeightJinPerWeek
} from './calc.js';
import { FOOD_DB, getAllFoods, getFoodIcon, ACTIVITY_DB, MEAL_LABELS, MEAL_ICONS } from './fooddb.js';
import {
  getProfile, setProfile, getLogs, getDateLog, updateDateLog,
  clearAllData, exportData, importData, computeTargetsFromProfile, getTodayStr, addCustomFood, deleteCustomFood,
  getNickname, setNickname, getGreeting, setGreeting, getSubtitle, setSubtitle,
  getBreakfastIds, toggleBreakfastId, getAppIcon, setAppIcon, removeAppIcon
} from './store.js';

const state = {
  currentDate: getTodayStr(),
  profile: null,
  targets: null,
  charts: {},
  planPref: 'none'
};

const APP_VERSION = 'v1.0';

async function syncNetworkDate() {
  try {
    const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Shanghai');
    if (!res.ok) throw new Error('time api error');
    const data = await res.json();
    const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`;
    state.currentDate = dateStr;
  } catch (e) {
    // 联网失败时使用本地日期
  }
}

async function init() {
  await syncNetworkDate();

  state.profile = getProfile();
  state.targets = state.profile ? computeTargetsFromProfile(state.profile) : null;

  applyAppIcon();
  bindTabs();
  bindHome();
  bindMenu();
  bindPlan();
  bindProfile();
  bindProfileData();

  if (!state.profile) {
    switchTab('profile');
    document.getElementById('profile-title').textContent = '欢迎建档';
  } else {
    switchTab('home');
  }

  renderAll();
  loadWeather();
}

function renderAll() {
  state.targets = state.profile ? computeTargetsFromProfile(state.profile) : null;
  renderHome();
  renderMenuPage();
  renderPlanPage();
  renderTrendPage();
  renderProfilePage();
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Common helpers
function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${m}月${d}日`;
}

function getStats(date = state.currentDate) {
  const log = getDateLog(date);
  return calcDayStats({ dateLog: log, foodDB: getAllFoods(), targets: state.targets });
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
  const greetingEl = document.getElementById('home-greeting');
  if (greetingEl) {
    greetingEl.addEventListener('blur', () => {
      const val = greetingEl.textContent.trim();
      if (val) {
        setGreeting(val);
        showToast('问候语已保存');
      } else {
        greetingEl.textContent = getGreeting() || defaultGreeting();
      }
    });
    greetingEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        greetingEl.blur();
      }
    });
    greetingEl.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  }

  const subtitleEl = document.getElementById('home-subtitle');
  if (subtitleEl) {
    subtitleEl.addEventListener('blur', () => {
      const val = subtitleEl.textContent.trim();
      if (val) {
        setSubtitle(val);
        showToast('副标题已保存');
      } else {
        subtitleEl.textContent = getSubtitle() || '两人食堂 · 今日营业中';
      }
    });
    subtitleEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        subtitleEl.blur();
      }
    });
    subtitleEl.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  }

  const avatarBtn = document.getElementById('home-avatar');
  if (avatarBtn) avatarBtn.addEventListener('click', openSettingsModal);

  const locateBtn = document.getElementById('btn-weather-locate');
  if (locateBtn) {
    locateBtn.addEventListener('click', () => {
      locateBtn.classList.add('active');
      loadWeather(true).finally(() => setTimeout(() => locateBtn.classList.remove('active'), 400));
    });
  }

  const cityBtn = document.getElementById('btn-weather-city');
  if (cityBtn) {
    cityBtn.addEventListener('click', showCitySearchModal);
  }

  const humidityBtn = document.getElementById('btn-weather-humidity');
  if (humidityBtn) {
    humidityBtn.addEventListener('click', () => {
      loadWeather(true).catch(() => {});
    });
  }
}

function applyAppIcon() {
  const dataUrl = getAppIcon();
  const favicon = document.getElementById('favicon-link');
  const apple = document.getElementById('apple-icon-link');
  const manifestLink = document.getElementById('manifest-link');

  if (dataUrl) {
    if (favicon) favicon.href = dataUrl;
    if (apple) apple.href = dataUrl;
    if (manifestLink) {
      try {
        const manifest = {
          name: '两人食堂 · 个人菜单',
          short_name: '两人食堂',
          description: '温馨的双人食堂个人菜单与热量管理',
          start_url: '/',
          display: 'standalone',
          background_color: '#FFFCFA',
          theme_color: '#FF7F5C',
          icons: [
            { src: dataUrl, sizes: '192x192', type: 'image/png' },
            { src: dataUrl, sizes: '512x512', type: 'image/png' }
          ]
        };
        const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
        manifestLink.href = URL.createObjectURL(blob);
      } catch (e) { /* ignore */ }
    }
  } else {
    if (favicon) favicon.href = 'data:image/svg+xml,%3Csvg%20xmlns=\'http://www.w3.org/2000/svg\'%20viewBox=\'0%200%20192%20192\'%3E%3Crect%20width=\'192\'%20height=\'192\'%20rx=\'40\'%20fill=\'%23FFF5F0\'/%3E%3Ccircle%20cx=\'96\'%20cy=\'96\'%20r=\'60\'%20fill=\'%23FF7F5C\'%20opacity=\'0.18\'/%3E%3Ccircle%20cx=\'96\'%20cy=\'96\'%20r=\'30\'%20fill=\'%23FF7F5C\'/%3E%3Ccircle%20cx=\'110\'%20cy=\'82\'%20r=\'9\'%20fill=\'%23FFF5F0\'/%3E%3C/svg%3E';
    if (apple) apple.href = 'data:image/svg+xml,%3Csvg%20xmlns=\'http://www.w3.org/2000/svg\'%20viewBox=\'0%200%20192%20192\'%3E%3Crect%20width=\'192\'%20height=\'192\'%20rx=\'40\'%20fill=\'%23FFF5F0\'/%3E%3Ccircle%20cx=\'96\'%20cy=\'96\'%20r=\'60\'%20fill=\'%23FF7F5C\'%20opacity=\'0.18\'/%3E%3Ccircle%20cx=\'96\'%20cy=\'96\'%20r=\'30\'%20fill=\'%23FF7F5C\'/%3E%3Ccircle%20cx=\'110\'%20cy=\'82\'%20r=\'9\'%20fill=\'%23FFF5F0\'/%3E%3C/svg%3E';
    if (manifestLink) manifestLink.href = 'manifest.json';
  }
}

function processIconImage(file, callback) {
  if (!file || !file.type.startsWith('image/')) {
    callback(new Error('请选择图片文件'));
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const size = 192;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFF5F0';
      ctx.fillRect(0, 0, size, size);
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      const dataUrl = canvas.toDataURL('image/png');
      callback(null, dataUrl);
    };
    img.onerror = () => callback(new Error('图片读取失败'));
    img.src = e.target.result;
  };
  reader.onerror = () => callback(new Error('文件读取失败'));
  reader.readAsDataURL(file);
}

function openSettingsModal() {
  const hasIcon = !!getAppIcon();
  const previewUrl = getAppIcon() || 'data:image/svg+xml,%3Csvg%20xmlns=\'http://www.w3.org/2000/svg\'%20viewBox=\'0%200%20192%20192\'%3E%3Crect%20width=\'192\'%20height=\'192\'%20rx=\'40\'%20fill=\'%23FFF5F0\'/%3E%3Ccircle%20cx=\'96\'%20cy=\'96\'%20r=\'60\'%20fill=\'%23FF7F5C\'%20opacity=\'0.18\'/%3E%3Ccircle%20cx=\'96\'%20cy=\'96\'%20r=\'30\'%20fill=\'%23FF7F5C\'/%3E%3Ccircle%20cx=\'110\'%20cy=\'82\'%20r=\'9\'%20fill=\'%23FFF5F0\'/%3E%3C/svg%3E';
  showModal('设置', `
    <div class="settings-section">
      <h4>主屏图标</h4>
      <p class="settings-tip">上传喜欢的头像，添加到手机桌面时会使用它作为应用图标。</p>
      <div class="icon-preview-wrap">
        <img id="settings-icon-preview" src="${previewUrl}" alt="图标预览" />
      </div>
      <label class="btn-primary btn-full" style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:12px;cursor:pointer;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        上传头像
        <input type="file" id="settings-icon-input" accept="image/*" style="display:none;" />
      </label>
      <button class="btn-soft btn-full" id="settings-icon-reset" style="margin-top:10px;${hasIcon ? '' : 'display:none;'}">恢复默认图标</button>
      <p class="settings-error" id="settings-icon-error"></p>
    </div>
  `);

  const input = document.getElementById('settings-icon-input');
  const preview = document.getElementById('settings-icon-preview');
  const error = document.getElementById('settings-icon-error');
  const resetBtn = document.getElementById('settings-icon-reset');

  input.addEventListener('change', () => {
    error.textContent = '';
    const file = input.files[0];
    if (!file) return;
    processIconImage(file, (err, dataUrl) => {
      if (err) {
        error.textContent = err.message;
        return;
      }
      try {
        setAppIcon(dataUrl);
        applyAppIcon();
        preview.src = dataUrl;
        resetBtn.style.display = 'inline-flex';
        showToast('主屏图标已保存');
      } catch (e) {
        error.textContent = e.message;
      }
    });
  });

  resetBtn.addEventListener('click', () => {
    removeAppIcon();
    applyAppIcon();
    preview.src = 'data:image/svg+xml,%3Csvg%20xmlns=\'http://www.w3.org/2000/svg\'%20viewBox=\'0%200%20192%20192\'%3E%3Crect%20width=\'192\'%20height=\'192\'%20rx=\'40\'%20fill=\'%23FFF5F0\'/%3E%3Ccircle%20cx=\'96\'%20cy=\'96\'%20r=\'60\'%20fill=\'%23FF7F5C\'%20opacity=\'0.18\'/%3E%3Ccircle%20cx=\'96\'%20cy=\'96\'%20r=\'30\'%20fill=\'%23FF7F5C\'/%3E%3Ccircle%20cx=\'110\'%20cy=\'82\'%20r=\'9\'%20fill=\'%23FFF5F0\'/%3E%3C/svg%3E';
    resetBtn.style.display = 'none';
    showToast('已恢复默认图标');
  });
}

function defaultGreeting() {
  const hour = new Date().getHours();
  let greet = '晚上好';
  if (hour < 12) greet = '早上好';
  else if (hour < 18) greet = '下午好';
  return `${greet}，小厨师`;
}

function renderHome() {
  const greetingEl = document.getElementById('home-greeting');
  if (greetingEl && !greetingEl.matches(':focus')) {
    greetingEl.textContent = getGreeting() || defaultGreeting();
  }
  const subtitleEl = document.getElementById('home-subtitle');
  if (subtitleEl && !subtitleEl.matches(':focus')) {
    subtitleEl.textContent = getSubtitle() || '两人食堂 · 今日营业中';
  }
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

  const weightEl = document.getElementById('weight-input');
  if (weightEl) weightEl.value = (getDateLog(getTodayStr()).weight) || '';

  // notice
  const notice = document.getElementById('home-notice');
  if (!state.profile) {
    notice.style.display = 'block';
    notice.className = 'notice';
    notice.textContent = '先去「建档」页面完成建档，才能看到热量目标哦。';
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
  const foods = getAllFoods();
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

// Weather
const WEATHER_CACHE_MINUTES = 30;
const WEATHER_CACHE_KEY = 'menu_v1_weather';

function loadWeather(force = false) {
  const cached = localStorage.getItem(WEATHER_CACHE_KEY);
  if (!force && cached) {
    try {
      const data = JSON.parse(cached);
      const age = Date.now() - (data.ts || 0);
      if (age < WEATHER_CACHE_MINUTES * 60 * 1000) {
        renderWeather(data);
        return Promise.resolve();
      }
    } catch (e) { /* ignore cache error */ }
  }
  return fetchWeatherByGeolocation();
}

function fetchWeatherByGeolocation() {
  renderWeatherLoading();
  if (!navigator.geolocation) {
    renderWeatherError('浏览器不支持定位');
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude).then(resolve).catch(resolve);
      },
      err => {
        console.warn('geo error', err);
        renderWeatherError('定位失败，请允许位置权限');
        resolve();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  });
}

async function fetchWeather(lat, lon, cityName = '') {
  renderWeatherLoading();
  try {
    const [weather, city] = await Promise.all([
      fetchOpenMeteo(lat, lon),
      cityName ? Promise.resolve(cityName) : fetchCityName(lat, lon)
    ]);
    const data = { ...weather, city, lat, lon, ts: Date.now() };
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
    renderWeather(data);
  } catch (e) {
    renderWeatherError('天气获取失败');
  }
}

async function fetchOpenMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather api error');
  const data = await res.json();
  return {
    tempC: Math.round(data.current.temperature_2m),
    humidity: data.current.relative_humidity_2m,
    code: data.current.weather_code,
    highC: Math.round(data.daily.temperature_2m_max[0]),
    lowC: Math.round(data.daily.temperature_2m_min[0])
  };
}

async function fetchCityName(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('geo api error');
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || '当前位置';
  } catch (e) {
    return '当前位置';
  }
}

async function geocodeCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=zh&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('geocode error');
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error('no results');
  return data.results;
}

async function fetchWeatherByCity(name) {
  renderWeatherLoading();
  try {
    const results = await geocodeCity(name);
    const city = results[0];
    await fetchWeather(city.latitude, city.longitude, city.name);
  } catch (e) {
    renderWeatherError('未找到该城市');
  }
}

function getClothingAdvice(tempC) {
  if (tempC >= 35) return '酷热，注意防暑，尽量待在阴凉处';
  if (tempC >= 30) return '炎热，短袖短裤，注意防晒补水';
  if (tempC >= 25) return '热，轻薄透气的夏装';
  if (tempC >= 20) return '温暖，轻薄外套或长袖，方便穿脱';
  if (tempC >= 15) return '凉爽，一件薄外套或卫衣';
  if (tempC >= 10) return '微凉，建议穿外套或针织衫';
  if (tempC >= 5) return '凉，厚外套或风衣，注意保暖';
  if (tempC >= 0) return '冷，羽绒服或棉衣，出门戴围巾';
  if (tempC >= -5) return '寒冷，厚羽绒服，注意防寒';
  return '极寒，全副武装，减少外出';
}

function renderWeatherLoading() {
  document.getElementById('weather-city').textContent = '定位中...';
  document.getElementById('weather-temp').textContent = '--°';
  document.getElementById('weather-desc').textContent = '--';
  document.getElementById('weather-advice').textContent = '获取天气中';
  document.getElementById('weather-humidity-label').textContent = '--%';
}

function renderWeatherError(msg) {
  document.getElementById('weather-city').textContent = msg;
  document.getElementById('weather-temp').textContent = '--°';
  document.getElementById('weather-desc').textContent = '--';
  document.getElementById('weather-advice').textContent = '点击定位或切换城市重试';
  document.getElementById('weather-humidity-label').textContent = '--%';
}

function renderWeather(data) {
  const info = getWeatherInfo(data.code);
  document.getElementById('weather-city').textContent = data.city || '当前位置';
  document.getElementById('weather-temp').textContent = `${Math.round(data.tempC)}°`;
  document.getElementById('weather-desc').textContent = info.text;
  document.getElementById('weather-advice').textContent = getClothingAdvice(data.tempC);
  document.getElementById('weather-humidity-label').textContent = `${data.humidity ?? '--'}%`;
}

function showCitySearchModal() {
  showModal('切换城市', `
    <div style="display:flex;gap:10px;margin-bottom:12px;">
      <input type="text" id="city-search-input" placeholder="输入城市名，如北京" style="flex:1;padding:12px 14px;border:1px solid #E8DDD7;border-radius:999px;background:#FFFCFA;font-size:15px;outline:none;" />
      <button class="btn-primary" id="btn-city-search" style="padding:10px 18px;border-radius:999px;">搜索</button>
    </div>
    <div id="city-search-results"></div>
  `, '');
  const input = document.getElementById('city-search-input');
  const btn = document.getElementById('btn-city-search');
  const results = document.getElementById('city-search-results');

  const doSearch = async () => {
    const q = input.value.trim();
    if (!q) return;
    results.innerHTML = '<p style="color:var(--text-secondary);font-size:13px;">搜索中...</p>';
    try {
      const list = await geocodeCity(q);
      results.innerHTML = list.map(c => `
        <button class="city-result-item" data-lat="${c.latitude}" data-lon="${c.longitude}" data-name="${c.name}" style="width:100%;text-align:left;background:var(--surface);border:1px solid #F0E6E0;border-radius:12px;padding:12px 14px;margin-bottom:8px;font-size:14px;color:var(--text);cursor:pointer;">
          <div style="font-weight:700;">${c.name}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${c.admin1 || ''} ${c.country || ''}</div>
        </button>
      `).join('');
      results.querySelectorAll('.city-result-item').forEach(item => {
        item.addEventListener('click', () => {
          fetchWeather(parseFloat(item.dataset.lat), parseFloat(item.dataset.lon), item.dataset.name);
          closeModal();
          showToast(`已切换到 ${item.dataset.name}`);
        });
      });
    } catch (e) {
      results.innerHTML = '<p style="color:var(--text-secondary);font-size:13px;">未找到相关城市，请换个关键词试试</p>';
    }
  };

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  input.focus();
}

function getWeatherInfo(code) {
  const map = {
    0: { text: '晴', icon: 'sunny' },
    1: { text: '少云', icon: 'partly-cloudy' },
    2: { text: '多云', icon: 'partly-cloudy' },
    3: { text: '阴', icon: 'cloudy' },
    45: { text: '雾', icon: 'fog' },
    48: { text: '雾凇', icon: 'fog' },
    51: { text: '毛毛雨', icon: 'rain' },
    53: { text: '小雨', icon: 'rain' },
    55: { text: '中雨', icon: 'rain' },
    56: { text: '冻雨', icon: 'rain' },
    57: { text: '冻雨', icon: 'rain' },
    61: { text: '小雨', icon: 'rain' },
    63: { text: '中雨', icon: 'rain' },
    65: { text: '大雨', icon: 'rain' },
    66: { text: '冻雨', icon: 'rain' },
    67: { text: '冻雨', icon: 'rain' },
    71: { text: '小雪', icon: 'snow' },
    73: { text: '中雪', icon: 'snow' },
    75: { text: '大雪', icon: 'snow' },
    77: { text: '雪粒', icon: 'snow' },
    80: { text: '阵雨', icon: 'rain' },
    81: { text: '雷阵雨', icon: 'rain' },
    82: { text: '强阵雨', icon: 'rain' },
    85: { text: '阵雪', icon: 'snow' },
    86: { text: '强阵雪', icon: 'snow' },
    95: { text: '雷雨', icon: 'thunder' },
    96: { text: '雷雨伴冰雹', icon: 'thunder' },
    99: { text: '强雷雨', icon: 'thunder' }
  };
  return map[code] || { text: '未知', icon: 'cloudy' };
}

function getWeatherIconSvg(type) {
  const icons = {
    sunny: `<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="14" fill="#FFB366"/><g stroke="#FFB366" stroke-width="3" stroke-linecap="round"><line x1="32" y1="6" x2="32" y2="12"/><line x1="32" y1="52" x2="32" y2="58"/><line x1="6" y1="32" x2="12" y2="32"/><line x1="52" y1="32" x2="58" y2="32"/><line x1="13.6" y1="13.6" x2="17.8" y2="17.8"/><line x1="46.2" y1="46.2" x2="50.4" y2="50.4"/><line x1="13.6" y1="50.4" x2="17.8" y2="46.2"/><line x1="46.2" y1="17.8" x2="50.4" y2="13.6"/></g></svg>`,
    'partly-cloudy': `<svg viewBox="0 0 64 64" fill="none"><circle cx="24" cy="26" r="10" fill="#FFD699"/><path d="M44 50H28c-5.5 0-10-4.5-10-10s4.5-10 10-10h2c1.7-5.2 6.6-9 12.5-9 6.9 0 12.5 5.6 12.5 12.5 0 4.5-2.4 8.5-6 10.7V50z" fill="#FFF5F0" stroke="#FFCCBC" stroke-width="2"/></svg>`,
    cloudy: `<svg viewBox="0 0 64 64" fill="none"><path d="M46 48H22c-6.6 0-12-5.4-12-12s5.4-12 12-12h2c2-6.2 7.9-10.7 14.8-10.7 8.1 0 14.7 6.6 14.7 14.7 0 5.3-2.8 10-7 12.6V48z" fill="#FFF5F0" stroke="#D7CCC8" stroke-width="2"/></svg>`,
    rain: `<svg viewBox="0 0 64 64" fill="none"><path d="M42 36H26c-5.5 0-10-4.5-10-10s4.5-10 10-10h2c1.7-5.2 6.6-9 12.5-9 6.9 0 12.5 5.6 12.5 12.5 0 4.5-2.4 8.5-6 10.7V36z" fill="#FFF5F0" stroke="#D7CCC8" stroke-width="2"/><g stroke="#81D4FA" stroke-width="2.5" stroke-linecap="round"><line x1="24" y1="40" x2="21" y2="48"/><line x1="34" y1="40" x2="31" y2="48"/><line x1="44" y1="40" x2="41" y2="48"/></g></svg>`,
    snow: `<svg viewBox="0 0 64 64" fill="none"><path d="M42 34H26c-5.5 0-10-4.5-10-10s4.5-10 10-10h2c1.7-5.2 6.6-9 12.5-9 6.9 0 12.5 5.6 12.5 12.5 0 4.5-2.4 8.5-6 10.7V34z" fill="#FFF5F0" stroke="#D7CCC8" stroke-width="2"/><g stroke="#B3E5FC" stroke-width="2" stroke-linecap="round"><line x1="24" y1="40" x2="24" y2="48"/><line x1="34" y1="40" x2="34" y2="48"/><line x1="44" y1="40" x2="44" y2="48"/></g></svg>`,
    thunder: `<svg viewBox="0 0 64 64" fill="none"><path d="M42 34H26c-5.5 0-10-4.5-10-10s4.5-10 10-10h2c1.7-5.2 6.6-9 12.5-9 6.9 0 12.5 5.6 12.5 12.5 0 4.5-2.4 8.5-6 10.7V34z" fill="#FFF5F0" stroke="#D7CCC8" stroke-width="2"/><path d="M34 36L26 46h6l-2 10 12-12h-6l4-8H34z" fill="#FFD54F" stroke="#FFCA28" stroke-width="1.5"/></svg>`,
    fog: `<svg viewBox="0 0 64 64" fill="none" stroke="#D7CCC8" stroke-width="3" stroke-linecap="round"><line x1="10" y1="22" x2="54" y2="22"/><line x1="14" y1="34" x2="50" y2="34"/><line x1="10" y1="46" x2="54" y2="46"/></svg>`
  };
  return icons[type] || icons.cloudy;
}

// Menu page
function bindMenu() {
  document.getElementById('menu-prev').addEventListener('click', () => changeDate(-1));
  document.getElementById('menu-next').addEventListener('click', () => changeDate(1));
  document.getElementById('btn-save-weight').addEventListener('click', () => {
    const w = parseFloat(document.getElementById('weight-input').value);
    if (!isNaN(w) && w > 20 && w < 300) {
      updateDateLog(getTodayStr(), { weight: w });
      renderHome();
      renderMenuPage();
      renderTrendPage();
      showToast('体重已保存');
    }
  });

  document.getElementById('plan-prefs').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.getElementById('plan-prefs').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.planPref = chip.dataset.pref;
  });
  document.getElementById('btn-generate-plan').addEventListener('click', generatePlan);
}

function changeDate(delta) {
  const d = new Date(state.currentDate);
  d.setDate(d.getDate() + delta);
  state.currentDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  renderMenuPage();
}

function renderMenuPage() {
  document.getElementById('menu-date').textContent = fmtDate(state.currentDate);
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
        <span class="meal-name">${MEAL_LABELS[key]}</span>
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
        const food = getAllFoods().find(f => f.id === item.foodId);
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

  const prefContainer = document.getElementById('plan-prefs');
  prefContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  prefContainer.querySelector(`[data-pref="${state.planPref}"]`)?.classList.add('active');
}

function showAddFoodModal(mealKey) {
  let selected = null;
  let grams = 100;
  showModal(`添加${MEAL_LABELS[mealKey]}`, `
    <div class="add-food-card">
      <input type="text" class="search-input" id="food-search" placeholder="搜索食物：鸡蛋、米饭、鸡胸肉…" />
      <div id="custom-food-toggle" class="custom-food-toggle">➕ 找不到？手动添加食物</div>
      <form id="custom-food-form" style="display:none;">
        <div class="custom-food-fields">
          <input type="text" id="custom-name" placeholder="食物名称" required />
          <input type="text" id="custom-category" placeholder="类别，如主食/肉禽" value="" />
          <div style="display:flex;align-items:center;gap:10px;margin:4px 0 12px;">
            <span class="chip" id="custom-breakfast-tag">早餐</span>
            <span class="breakfast-hint">（如果是早餐请点亮早餐按钮）</span>
          </div>
          <div class="custom-food-hint">营养成分默认固定为 <b>100</b>，按 100g 标准计算热量</div>
          <div id="custom-nutrition-fields" style="display:none;">
            <input type="number" id="custom-kcal" placeholder="热量 kcal/100g" min="0" step="0.1" value="100" />
            <input type="number" id="custom-protein" placeholder="蛋白质 g/100g" min="0" step="0.1" value="100" />
            <input type="number" id="custom-fat" placeholder="脂肪 g/100g" min="0" step="0.1" value="100" />
            <input type="number" id="custom-carb" placeholder="碳水 g/100g" min="0" step="0.1" value="100" />
          </div>
          <div id="custom-nutrition-toggle" class="custom-nutrition-toggle"><span class="toggle-text">展开填写营养成分</span><svg class="toggle-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
        </div>
        <button type="submit" class="btn-secondary btn-full" id="btn-save-custom">保存到食物库</button>
      </form>
    </div>
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
  const customToggle = document.getElementById('custom-food-toggle');
  const customForm = document.getElementById('custom-food-form');

  const trashIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

  function renderResults(query = '') {
    const q = query.trim().toLowerCase();
    const breakfastIds = getBreakfastIds();
    const list = getAllFoods().filter(f => f.name.includes(q) || f.category.includes(q)).slice(0, 50);
    results.innerHTML = list.map(f => {
      const hasBreakfast = (f.tags && f.tags.includes('早餐')) || breakfastIds.includes(f.id);
      const canToggle = !f.custom;
      return `
      <div class="search-result" data-id="${f.id}">
        <div class="info"><span style="font-size:22px;">${f.icon}</span>
          <div><div class="name">${f.name}</div><div class="meta">${f.kcal} kcal/100g · ${f.category}${hasBreakfast ? ` · <span class="food-tag ${canToggle ? 'food-tag-toggle' : ''}" data-id="${f.id}">早餐${canToggle ? ' ×' : ''}</span>` : canToggle ? ` · <span class="food-tag food-tag-add" data-id="${f.id}">+ 早餐</span>` : ''}</div></div>
        </div>
        <button class="delete-food-btn ${f.custom ? '' : 'built-in'}" data-id="${f.id}" title="${f.custom ? '删除' : '内置食物不可删除'}" ${f.custom ? '' : 'disabled'}>${trashIcon}</button>
        ${f.custom ? `<span class="delete-confirm" data-id="${f.id}"><button class="confirm-yes" type="button" data-id="${f.id}">删除</button><button class="confirm-no" type="button">取消</button></span>` : ''}
      </div>
    `}).join('');
    results.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', () => {
        results.querySelectorAll('.search-result').forEach(r => r.classList.remove('selected'));
        el.classList.add('selected');
        selected = getAllFoods().find(f => f.id === el.dataset.id);
        detail.style.display = 'block';
        gramsInput.value = grams;
        updatePreview();
        confirmBtn.disabled = false;
      });
    });
    results.querySelectorAll('.delete-food-btn:not(.built-in)').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        btn.closest('.search-result').classList.add('confirming');
      });
    });
    results.querySelectorAll('.delete-food-btn.built-in').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        showToast('内置食物不可删除');
      });
    });
    results.querySelectorAll('.confirm-no').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        btn.closest('.search-result').classList.remove('confirming');
      });
    });
    results.querySelectorAll('.confirm-yes').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const food = getAllFoods().find(f => f.id === id);
        if (!food) return;
        deleteCustomFood(id);
        if (selected && selected.id === id) {
          selected = null;
          detail.style.display = 'none';
          confirmBtn.disabled = true;
        }
        renderResults(input.value);
        showToast('已删除');
      });
    });
    results.querySelectorAll('.food-tag-toggle, .food-tag-add').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const added = toggleBreakfastId(id);
        renderResults(input.value);
        showToast(added ? '已添加早餐标签' : '已移除早餐标签');
      });
    });
  }

  function selectFoodById(id) {
    selected = getAllFoods().find(f => f.id === id);
    if (!selected) return;
    renderResults('');
    detail.style.display = 'block';
    gramsInput.value = grams;
    updatePreview();
    confirmBtn.disabled = false;
    setTimeout(() => {
      const el = results.querySelector(`[data-id="${id}"]`);
      if (el) {
        results.querySelectorAll('.search-result').forEach(r => r.classList.remove('selected'));
        el.classList.add('selected');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 0);
  }

  function updatePreview() {
    if (!selected) return;
    const n = calcFoodNutrition(selected, grams);
    preview.innerHTML = `${grams}g ${selected.name} ≈ ${n.kcal} kcal · 蛋 ${n.protein}g · 脂 ${n.fat}g · 碳 ${n.carb}g`;
  }

  customToggle.addEventListener('click', () => {
    customForm.style.display = customForm.style.display === 'none' ? 'block' : 'none';
  });

  const nutritionFields = document.getElementById('custom-nutrition-fields');
  const nutritionToggle = document.getElementById('custom-nutrition-toggle');
  nutritionToggle.addEventListener('click', () => {
    const show = nutritionFields.style.display === 'none';
    nutritionFields.style.display = show ? 'block' : 'none';
    nutritionToggle.querySelector('.toggle-text').textContent = show ? '收起营养成分' : '展开填写营养成分';
    nutritionToggle.classList.toggle('expanded', show);
  });

  const breakfastTag = document.getElementById('custom-breakfast-tag');
  breakfastTag.addEventListener('click', () => {
    breakfastTag.classList.toggle('active');
  });

  customForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('custom-name').value.trim();
    const category = document.getElementById('custom-category').value.trim();
    const kcal = parseFloat(document.getElementById('custom-kcal').value) || 100;
    const protein = parseFloat(document.getElementById('custom-protein').value) || 100;
    const fat = parseFloat(document.getElementById('custom-fat').value) || 100;
    const carb = parseFloat(document.getElementById('custom-carb').value) || 100;
    if (!name) {
      showToast('请填写食物名称');
      return;
    }
    const id = 'custom_' + Date.now();
    const tags = breakfastTag.classList.contains('active') ? ['早餐'] : [];
    addCustomFood({ id, name, category: category || '自定义', kcal, protein, fat, carb, icon: getFoodIcon(name), tags });
    customForm.reset();
    nutritionFields.style.display = 'none';
    nutritionToggle.textContent = '展开填写营养成分';
    document.getElementById('custom-kcal').value = 100;
    document.getElementById('custom-protein').value = 100;
    document.getElementById('custom-fat').value = 100;
    document.getElementById('custom-carb').value = 100;
    document.getElementById('custom-category').value = '';
    breakfastTag.classList.remove('active');
    customForm.style.display = 'none';
    input.value = '';
    showToast('已保存到食物库');
    selectFoodById(id);
  });

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
  document.getElementById('btn-add-exercise').addEventListener('click', showAddExerciseModal);
  document.getElementById('btn-save-manual').addEventListener('click', () => {
    const mi = parseFloat(document.getElementById('manual-intake').value) || 0;
    const mb = parseFloat(document.getElementById('manual-burn').value) || 0;
    updateDateLog(state.currentDate, { manualIntake: mi, manualBurn: mb });
    renderAll();
    showToast('调整已保存');
  });
}

function renderPlanPage() {
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

function generatePlan() {
  if (!state.targets) {
    showModal('提示', `<p class="empty-state">请先完成个人建档。</p>`);
    return;
  }

  const pref = state.planPref;
  let pool = getAllFoods().slice();
  if (pref === 'vegetarian') pool = pool.filter(f => !['chicken_breast', 'beef_steak', 'salmon', 'shrimp', 'pork_tenderloin'].includes(f.id));
  if (pref === 'lowfat') pool = pool.filter(f => f.fat < 10);
  if (pref === 'highprotein') pool = pool.sort((a, b) => b.protein - a.protein);

  const breakfastPool = pool.filter(f => f.tags && f.tags.includes('早餐'));

  const ratios = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };
  const plan = {};

  for (const meal of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const targetKcal = Math.round(state.targets.targetCalories * ratios[meal]);
    const mealPool = meal === 'breakfast' ? (breakfastPool.length ? breakfastPool : pool) : pool;
    const items = [];
    let remaining = targetKcal;
    let tries = 0;
    while (remaining > 50 && tries < 6) {
      const candidates = mealPool.filter(f => f.kcal <= remaining * 1.5);
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
    <div class="plan-result-header">
      <strong>生成结果</strong>
      <div class="plan-result-right">
        <span class="plan-result-summary">${Math.round(total.kcal)} kcal · 蛋 ${Math.round(total.protein)}g</span>
        <button class="plan-toggle" type="button" id="btn-toggle-plan">收起</button>
      </div>
    </div>
    <div class="plan-body" id="plan-body">
      ${Object.entries(plan).map(([meal, items]) => `
        <div class="plan-meal">
          <h4>${MEAL_ICONS[meal]} ${MEAL_LABELS[meal]}</h4>
          ${items.map(i => `
            <div class="plan-item"><span>${i.food.icon} ${i.food.name} ${i.grams}g</span><span>${i.kcal} kcal</span></div>
          `).join('')}
        </div>
      `).join('')}
      <button class="btn-primary btn-full" id="btn-adopt-plan">采用为今日菜单</button>
    </div>
  `;

  const toggleBtn = document.getElementById('btn-toggle-plan');
  const body = document.getElementById('plan-body');
  const togglePlan = () => {
    const isCollapsed = body.classList.toggle('collapsed');
    toggleBtn.textContent = isCollapsed ? '展开' : '收起';
    toggleBtn.classList.toggle('collapsed', isCollapsed);
  };
  toggleBtn.addEventListener('click', togglePlan);

  document.getElementById('btn-adopt-plan').addEventListener('click', () => {
    const meals = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const [meal, items] of Object.entries(plan)) {
      meals[meal] = items.map(i => ({ foodId: i.food.id, grams: i.grams }));
    }
    updateDateLog(state.currentDate, { meals });
    renderAll();
    showToast('已采用为今日菜单');
    if (body && toggleBtn) {
      body.classList.add('collapsed');
      toggleBtn.textContent = '展开';
      toggleBtn.classList.add('collapsed');
    }
  });
}

// Trend page
function renderTrendPage() {
  const logs = getLogs();
  const dates = Object.keys(logs).sort();
  const weightData = dates.map(d => logs[d].weight ?? null);
  const balanceData = dates.map(d => {
    const stats = calcDayStats({ dateLog: logs[d], foodDB: getAllFoods(), targets: state.targets });
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
function updateCustomGoalPreview() {
  const goal = document.getElementById('goal').value;
  const input = document.getElementById('custom-goal-value');
  const label = document.getElementById('custom-goal-label');
  const hint = document.getElementById('custom-goal-hint');
  const group = document.getElementById('custom-goal-group');

  if (goal === 'maintain') {
    group.style.display = 'none';
    return;
  }

  group.style.display = 'block';
  label.textContent = goal === 'cut' ? '每日热量缺口 kcal' : '每日热量盈余 kcal';
  const val = Math.max(0, parseInt(input.value) || 0);
  const jin = estimateWeightJinPerWeek(goal === 'cut' ? -val : val);
  const sign = jin > 0 ? '+' : '';
  hint.textContent = val > 0 ? `约等于每周 ${sign}${jin} 斤` : '请填写热量数值';
}

function bindProfile() {
  const goalSelect = document.getElementById('goal');
  const customInput = document.getElementById('custom-goal-value');

  if (goalSelect) goalSelect.addEventListener('change', updateCustomGoalPreview);
  if (customInput) customInput.addEventListener('input', updateCustomGoalPreview);

  const form = document.getElementById('profile-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const goal = document.getElementById('goal').value;
    const customVal = goal !== 'maintain' ? Math.max(0, parseInt(document.getElementById('custom-goal-value').value) || 0) : 0;
    const profile = {
      gender: document.getElementById('gender').value,
      age: parseInt(document.getElementById('age').value),
      height: parseFloat(document.getElementById('height').value),
      weight: parseFloat(document.getElementById('weight').value),
      activity: parseFloat(document.getElementById('activity').value),
      goal
    };
    if (goal !== 'maintain') {
      profile.customSurplusDeficit = customVal || 400;
    }
    if (!profile.gender || !profile.age || !profile.height || !profile.weight || !profile.activity) {
      showToast('请填写完整信息');
      return;
    }
    try {
      setProfile(profile);
      state.profile = profile;
      state.targets = computeTargetsFromProfile(profile);
      renderAll();
    } catch (err) {
      console.error('保存档案后渲染出错：', err);
    }
    showToast('保存成功');
    switchTab('home');
  });
}

function renderProfilePage() {
  if (!state.profile) {
    document.getElementById('target-grid').style.display = 'none';
    document.getElementById('custom-goal-group').style.display = 'none';
    return;
  }
  document.getElementById('target-grid').style.display = 'grid';
  document.getElementById('profile-title').textContent = '个人档案';

  const bmr = calcBMR(state.profile);
  const tdee = calcTDEE(bmr, state.profile.activity);
  const targets = state.targets;
  const jin = estimateWeightJinPerWeek(targets.delta);
  const jinSign = jin > 0 ? '+' : '';

  document.getElementById('t-bmr').textContent = Math.round(bmr);
  document.getElementById('t-tdee').textContent = tdee;
  document.getElementById('t-target').textContent = targets.targetCalories;
  document.getElementById('t-target-hint').textContent = `目标热量 kcal${jin !== 0 ? '（约 ' + jinSign + jin + ' 斤/周）' : ''}`;
  document.getElementById('t-delta').textContent = (targets.delta > 0 ? '+' : '') + targets.delta;
  document.getElementById('t-delta-hint').textContent = targets.delta === 0 ? '维持当前体重' : (targets.delta > 0 ? '每日盈余' : '每日缺口');

  document.getElementById('gender').value = state.profile.gender;
  document.getElementById('age').value = state.profile.age;
  document.getElementById('height').value = state.profile.height;
  document.getElementById('weight').value = state.profile.weight;
  document.getElementById('activity').value = state.profile.activity;
  document.getElementById('goal').value = state.profile.goal;

  const customInput = document.getElementById('custom-goal-value');
  if (state.profile.goal !== 'maintain') {
    customInput.value = state.profile.customSurplusDeficit || 400;
  } else {
    customInput.value = '';
  }
  updateCustomGoalPreview();
}

// 数据管理（已合并到建档页）
function bindProfileData() {
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

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `position:fixed;left:50%;bottom:110px;transform:translateX(-50%);background:#3D322B;color:#fff;padding:10px 18px;border-radius:999px;font-size:14px;z-index:200;box-shadow:var(--shadow);`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 1800);
}

// Go
document.addEventListener('DOMContentLoaded', init);
