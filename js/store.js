// localStorage + cookie 双保险数据持久化
import { calcBMR, calcTDEE, calcTargets } from './calc.js';

const PREFIX = 'menu_v1_';

// 采用双备份的 key（数据量小、且不能丢的）
const DUAL_BACKUP_KEYS = new Set(['profile', 'nickname', 'subtitle', 'breakfastIds']);

function getKey(key) { return PREFIX + key; }

// ---------------- cookie 读写 ----------------
function setCookie(name, value, days = 365) {
  try {
    const encoded = encodeURIComponent(value);
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encoded}; expires=${expires}; path=/; SameSite=Lax; Secure`;
    return true;
  } catch (e) { return false; }
}

function getCookie(name) {
  try {
    const key = encodeURIComponent(name) + '=';
    const parts = document.cookie.split(';');
    for (let part of parts) {
      part = part.trim();
      if (part.indexOf(key) === 0) return decodeURIComponent(part.substring(key.length));
    }
  } catch (e) {}
  return null;
}

// ---------------- 底层双存储 ----------------
function storageRead(key) {
  const full = getKey(key);
  try {
    const v = localStorage.getItem(full);
    if (v !== null) return v;
  } catch (e) {}
  try {
    const v = getCookie(full);
    if (v !== null) return v;
  } catch (e) {}
  return null;
}

function storageWrite(key, value) {
  const full = getKey(key);
  let ok = false;
  // 1. 尝试 localStorage
  try {
    localStorage.setItem(full, value);
    ok = true;
  } catch (e) {}
  // 2. 对核心 key 再尝试 cookie 备份
  if (DUAL_BACKUP_KEYS.has(key)) {
    try {
      if (setCookie(full, value)) ok = true;
    } catch (e) {}
  }
  // 3. 全失败才抛错
  if (!ok) {
    throw new Error('无法保存：当前浏览器环境禁用了本地存储（常见于无痕模式、小米/微信/QQ 等 App 内浏览器、或"添加到主屏幕"的受限模式）。请改用手机自带浏览器（Safari / Chrome）打开本页面后再建档。');
  }
}

// 检测至少有一种存储可用
export function isStorageAvailable() {
  try {
    const testKey = getKey('__test__');
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    try {
      const testKey = getKey('__test__');
      if (setCookie(testKey, '1')) return true;
    } catch (e2) {}
    return false;
  }
}

// ---------------- 对外 API ----------------
export function getProfile() {
  const raw = storageRead('profile');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

export function setProfile(profile) {
  storageWrite('profile', JSON.stringify(profile));
}

export function getNickname() { return storageRead('nickname') || ''; }
export function setNickname(name) { storageWrite('nickname', String(name).trim()); }

export function getGreeting() { return storageRead('greeting') || ''; }
export function setGreeting(text) { storageWrite('greeting', String(text).trim()); }

export function getSubtitle() { return storageRead('subtitle') || ''; }
export function setSubtitle(text) { storageWrite('subtitle', String(text).trim()); }

export function getLogs() {
  const raw = storageRead('logs');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

export function setLogs(logs) {
  // 日志可能较大，只用 localStorage，不备份 cookie
  try { localStorage.setItem(getKey('logs'), JSON.stringify(logs)); }
  catch (e) { throw new Error('无法保存记录：浏览器存储空间不足或已被禁用。'); }
}

export function getDateLog(date) {
  const logs = getLogs();
  if (!logs[date]) {
    logs[date] = {
      meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
      exercises: [],
      weight: null,
      manualIntake: 0,
      manualBurn: 0
    };
  }
  return logs[date];
}

export function updateDateLog(date, patch) {
  const logs = getLogs();
  logs[date] = { ...getDateLog(date), ...patch };
  setLogs(logs);
  return logs[date];
}

export function clearAllData() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
  keys.forEach(k => {
    try { localStorage.removeItem(k); } catch (e) {}
  });
  // 同时清理 cookie
  try {
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim();
      if (name.startsWith(encodeURIComponent(PREFIX))) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure`;
      }
    });
  } catch (e) {}
}

export function exportData() {
  return {
    profile: getProfile(),
    logs: getLogs(),
    customFoods: getCustomFoods(),
    breakfastIds: getBreakfastIds(),
    nickname: getNickname(),
    subtitle: getSubtitle(),
    appIcon: getAppIcon(),
    exportedAt: new Date().toISOString()
  };
}

export function importData(data) {
  if (data.profile) setProfile(data.profile);
  if (data.logs) setLogs(data.logs);
  if (data.customFoods) setCustomFoods(data.customFoods);
  if (Array.isArray(data.breakfastIds)) setBreakfastIds(data.breakfastIds);
  if (data.nickname) setNickname(data.nickname);
  if (data.subtitle) setSubtitle(data.subtitle);
  if (data.appIcon) setAppIcon(data.appIcon);
}

export function computeTargetsFromProfile(profile) {
  if (!profile) return null;
  const bmr = calcBMR(profile);
  const tdee = calcTDEE(bmr, profile.activity);
  return calcTargets({ weight: profile.weight, activity: profile.activity, goal: profile.goal, tdee });
}

export function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getCustomFoods() {
  const raw = storageRead('customFoods');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}

export function setCustomFoods(list) {
  // 自定义食物可能较大，仍优先用 localStorage；失败再尝试 cookie（仅小数据）
  const s = JSON.stringify(list);
  try {
    localStorage.setItem(getKey('customFoods'), s);
  } catch (e) {
    if (s.length < 1500) {
      try { setCookie(getKey('customFoods'), s); return; } catch (e2) {}
    }
    throw new Error('无法保存自定义食物：浏览器存储空间不足或已被禁用。');
  }
}

export function addCustomFood(food) {
  const list = getCustomFoods();
  if (list.some(f => f.name === food.name)) return list;
  list.push(food);
  setCustomFoods(list);
  return list;
}

export function deleteCustomFood(id) {
  const list = getCustomFoods().filter(f => f.id !== id);
  setCustomFoods(list);
  return list;
}

export function getBreakfastIds() {
  const raw = storageRead('breakfastIds');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}

export function setBreakfastIds(ids) {
  storageWrite('breakfastIds', JSON.stringify(ids));
}

export function toggleBreakfastId(id) {
  const ids = getBreakfastIds();
  const idx = ids.indexOf(id);
  if (idx >= 0) ids.splice(idx, 1);
  else ids.push(id);
  setBreakfastIds(ids);
  return ids.includes(id);
}

function hashIconData(dataUrl) {
  try {
    const b64 = dataUrl.split(',')[1];
    const bin = atob(b64);
    let h = 0;
    for (let i = 0; i < Math.min(bin.length, 512); i++) {
      h = (h * 31 + bin.charCodeAt(i)) | 0;
    }
    return String(h);
  } catch (e) { return ''; }
}

export function getAppIcon() {
  try {
    const raw = localStorage.getItem(getKey('appIcon'));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj.dataUrl || null;
  } catch (e) { return null; }
}

export function setAppIcon(dataUrl) {
  try {
    localStorage.setItem(getKey('appIcon'), JSON.stringify({ dataUrl, hash: hashIconData(dataUrl) }));
  } catch (e) {
    throw new Error('图片过大，建议选择更小的图片');
  }
}

export function removeAppIcon() {
  try { localStorage.removeItem(getKey('appIcon')); } catch (e) {}
}
