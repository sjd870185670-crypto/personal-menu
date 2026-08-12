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
    exportedAt: new Date().toISOString()
  };
}

export function importData(data) {
  if (data.profile) setProfile(data.profile);
  if (data.logs) setLogs(data.logs);
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
