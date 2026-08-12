// 热量与宏量营养素计算引擎（纯函数）

export function calcBMR({ gender, age, height, weight }) {
  if (gender === 'female') {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
  return 10 * weight + 6.25 * height - 5 * age + 5;
}

export function calcTDEE(bmr, activityFactor) {
  return Math.round(bmr * activityFactor);
}

export function calcTargets({ weight, activity, goal, tdee, customSurplusDeficit }) {
  // 安全护栏：缺口/盈余不超过 TDEE 的 20%
  const maxDelta = Math.round(tdee * 0.2);
  let delta = 0;
  if (goal === 'bulk') delta = customSurplusDeficit != null ? customSurplusDeficit : 400;
  if (goal === 'cut') delta = customSurplusDeficit != null ? -customSurplusDeficit : -400;
  delta = Math.max(-maxDelta, Math.min(maxDelta, delta));

  const targetCalories = Math.round(tdee + delta);

  // 蛋白系数
  let proteinFactor = 1.8;
  if (goal === 'bulk') proteinFactor = 2.0;
  if (goal === 'cut') proteinFactor = 1.8;
  if (goal === 'maintain') proteinFactor = 1.6;

  const proteinG = Math.round(weight * proteinFactor);
  const fatKcal = targetCalories * 0.25;
  const fatG = Math.round(fatKcal / 9);
  const proteinKcal = proteinG * 4;
  const carbKcal = targetCalories - proteinKcal - fatKcal;
  const carbG = Math.max(0, Math.round(carbKcal / 4));

  return {
    tdee,
    targetCalories,
    delta,
    maxDelta,
    macros: {
      protein: proteinG,
      fat: fatG,
      carb: carbG
    }
  };
}

export function calcExerciseBurn({ met, weightKg, minutes }) {
  return Math.round(met * weightKg * (minutes / 60));
}

export function calcFoodNutrition(food, grams) {
  const ratio = grams / 100;
  return {
    kcal: Math.round(food.kcal * ratio),
    protein: Math.round(food.protein * ratio * 10) / 10,
    fat: Math.round(food.fat * ratio * 10) / 10,
    carb: Math.round(food.carb * ratio * 10) / 10
  };
}

export function sumItems(items, foodDB) {
  const total = { kcal: 0, protein: 0, fat: 0, carb: 0 };
  for (const item of items) {
    const food = foodDB.find(f => f.id === item.foodId);
    if (!food) continue;
    const n = calcFoodNutrition(food, item.grams);
    total.kcal += n.kcal;
    total.protein += n.protein;
    total.fat += n.fat;
    total.carb += n.carb;
  }
  return total;
}

export function calcDayStats({ dateLog, foodDB, targets }) {
  const meals = dateLog?.meals || { breakfast: [], lunch: [], dinner: [], snack: [] };
  const perMeal = {};
  let intake = { kcal: 0, protein: 0, fat: 0, carb: 0 };
  for (const [key, items] of Object.entries(meals)) {
    const t = sumItems(items, foodDB);
    perMeal[key] = t;
    intake.kcal += t.kcal;
    intake.protein += t.protein;
    intake.fat += t.fat;
    intake.carb += t.carb;
  }
  intake.kcal = Math.round(intake.kcal);
  intake.protein = Math.round(intake.protein * 10) / 10;
  intake.fat = Math.round(intake.fat * 10) / 10;
  intake.carb = Math.round(intake.carb * 10) / 10;

  const manualIntake = (dateLog?.manualIntake || 0);
  intake.kcal += manualIntake;

  const exercises = dateLog?.exercises || [];
  let exerciseBurn = 0;
  for (const ex of exercises) {
    exerciseBurn += ex.burnKcal || 0;
  }
  const manualBurn = dateLog?.manualBurn || 0;
  const totalBurn = exerciseBurn + manualBurn;

  const netBalance = intake.kcal - (targets?.targetCalories || 0) - totalBurn;

  return {
    perMeal,
    intake,
    exerciseBurn,
    manualBurn,
    totalBurn,
    netBalance,
    remaining: (targets?.targetCalories || 0) - intake.kcal + totalBurn,
    weight: dateLog?.weight || null
  };
}

export function getActivityLabel(factor) {
  const map = {
    1.2: '久坐',
    1.375: '轻度',
    1.55: '中度',
    1.725: '高度',
    1.9: '极高'
  };
  return map[factor] || '自定义';
}

export function getGoalLabel(goal) {
  const map = {
    bulk: '增重',
    cut: '减脂',
    maintain: '维持'
  };
  return map[goal] || '维持';
}
