// localStorage 数据持久化
import { calcBMR, calcTDEE, calcTargets } from './calc.js';

const PREFIX = 'menu_v1_';

function getKey(key) {
  return PREFIX + key;
}

// 统一读取：在禁用存储的上下文（无痕/App 内浏览器）中 getItem 可能抛错，安全降级为 null
function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

// 统一写入：写完回读校验，确认真的持久化成功；被禁用时抛出清晰中文错误
function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    const check = localStorage.getItem(key);
    if (check === null && value !== null) {
      throw new Error('write-not-persisted');
    }
  } catch (e) {
    const name = (e && e.name) || '';
    const blocked = name === 'SecurityError' || name === 'QuotaExceededError' || (e && e.message === 'write-not-persisted');
    if (blocked) {
      throw new Error('无法保存：当前浏览器环境禁用了本地存储（常见于无痕模式、微信/QQ 等 App 内浏览器，或"添加到主屏幕"的受限模式）。请改用手机自带浏览器（Safari / Chrome）打开本页面后再建档。');
    }
    throw e;
  }
}

// 检测存储是否可用：在页面加载时就告诉用户，避免事后才发现保存无效
export function isStorageAvailable() {
  try {
    const testKey = getKey('__test__');
    storageSet(testKey, '1');
    storageGet(testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

export function getProfile() {
  const raw = storageGet(getKey('profile'));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function setProfile(profile) {
  storageSet(getKey('profile'), JSON.stringify(profile));
}

export function getNickname() {
  return storageGet(getKey('nickname')) || '';
}

export function setNickname(name) {
  storageSet(getKey('nickname'), String(name).trim());
}

export function getGreeting() {
  return storageGet(getKey('greeting')) || '';
}

export function setGreeting(text) {
  storageSet(getKey('greeting'), String(text).trim());
}

export function getSubtitle() {
  return storageGet(getKey('subtitle')) || '';
}

export function setSubtitle(text) {
  storageSet(getKey('subtitle'), String(text).trim());
}

export function getLogs() {
  const raw = storageGet(getKey('logs'));
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

export function setLogs(logs) {
  storageSet(getKey('logs'), JSON.stringify(logs));
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
  keys.forEach(k => localStorage.removeItem(k));
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
  const raw = storageGet(getKey('customFoods'));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function setCustomFoods(list) {
  storageSet(getKey('customFoods'), JSON.stringify(list));
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
  const raw = storageGet(getKey('breakfastIds'));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function setBreakfastIds(ids) {
  storageSet(getKey('breakfastIds'), JSON.stringify(ids));
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
  } catch (e) {
    return '';
  }
}

export function getAppIcon() {
  try {
    const raw = storageGet(getKey('appIcon'));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj.dataUrl || null;
  } catch (e) {
    return null;
  }
}

export function setAppIcon(dataUrl) {
  try {
    storageSet(getKey('appIcon'), JSON.stringify({ dataUrl, hash: hashIconData(dataUrl) }));
  } catch (e) {
    throw new Error('图片过大，建议选择更小的图片');
  }
}

export function removeAppIcon() {
  localStorage.removeItem(getKey('appIcon'));
}
