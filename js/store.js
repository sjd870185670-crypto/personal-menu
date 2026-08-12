// localStorage 数据持久化
import { calcBMR, calcTDEE, calcTargets } from './calc.js';

const PREFIX = 'menu_v1_';

function getKey(key) {
  return PREFIX + key;
}

export function getProfile() {
  const raw = localStorage.getItem(getKey('profile'));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function setProfile(profile) {
  localStorage.setItem(getKey('profile'), JSON.stringify(profile));
}

export function getNickname() {
  return localStorage.getItem(getKey('nickname')) || '';
}

export function setNickname(name) {
  localStorage.setItem(getKey('nickname'), String(name).trim());
}

export function getGreeting() {
  return localStorage.getItem(getKey('greeting')) || '';
}

export function setGreeting(text) {
  localStorage.setItem(getKey('greeting'), String(text).trim());
}

export function getSubtitle() {
  return localStorage.getItem(getKey('subtitle')) || '';
}

export function setSubtitle(text) {
  localStorage.setItem(getKey('subtitle'), String(text).trim());
}

export function getLogs() {
  const raw = localStorage.getItem(getKey('logs'));
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

export function setLogs(logs) {
  localStorage.setItem(getKey('logs'), JSON.stringify(logs));
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
  const raw = localStorage.getItem(getKey('customFoods'));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function setCustomFoods(list) {
  localStorage.setItem(getKey('customFoods'), JSON.stringify(list));
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
  const raw = localStorage.getItem(getKey('breakfastIds'));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function setBreakfastIds(ids) {
  localStorage.setItem(getKey('breakfastIds'), JSON.stringify(ids));
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
    const raw = localStorage.getItem(getKey('appIcon'));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj.dataUrl || null;
  } catch (e) {
    return null;
  }
}

export function setAppIcon(dataUrl) {
  try {
    localStorage.setItem(getKey('appIcon'), JSON.stringify({ dataUrl, hash: hashIconData(dataUrl) }));
  } catch (e) {
    throw new Error('图片过大，建议选择更小的图片');
  }
}

export function removeAppIcon() {
  localStorage.removeItem(getKey('appIcon'));
}
