// 内置食物库与活动库

export const FOOD_DB = [
  { id: 'egg', name: '鸡蛋', category: '蛋奶', kcal: 144, protein: 13, fat: 9, carb: 1, icon: '🥚' },
  { id: 'chicken_breast', name: '鸡胸肉', category: '肉禽', kcal: 165, protein: 31, fat: 3.6, carb: 0, icon: '🍗' },
  { id: 'rice_cooked', name: '米饭(熟)', category: '主食', kcal: 116, protein: 2.6, fat: 0.3, carb: 25.6, icon: '🍚' },
  { id: 'milk_whole', name: '牛奶(全脂)', category: '蛋奶', kcal: 61, protein: 3.2, fat: 3.3, carb: 4.8, icon: '🥛' },
  { id: 'oatmeal', name: '燕麦', category: '主食', kcal: 389, protein: 16.9, fat: 6.9, carb: 66, icon: '🥣' },
  { id: 'banana', name: '香蕉', category: '蔬果', kcal: 89, protein: 1.1, fat: 0.3, carb: 22.8, icon: '🍌' },
  { id: 'broccoli', name: '西兰花', category: '蔬果', kcal: 34, protein: 2.8, fat: 0.4, carb: 7, icon: '🥦' },
  { id: 'peanut', name: '花生', category: '坚果', kcal: 567, protein: 25.8, fat: 49.2, carb: 16.1, icon: '🥜' },
  { id: 'beef_steak', name: '牛排', category: '肉禽', kcal: 250, protein: 26, fat: 15, carb: 0, icon: '🥩' },
  { id: 'salmon', name: '三文鱼', category: '水产', kcal: 208, protein: 20, fat: 13, carb: 0, icon: '🐟' },
  { id: 'tofu', name: '豆腐', category: '豆制品', kcal: 76, protein: 8, fat: 4.8, carb: 1.9, icon: '🧊' },
  { id: 'bread', name: '全麦面包', category: '主食', kcal: 247, protein: 13, fat: 3.4, carb: 41, icon: '🍞' },
  { id: 'apple', name: '苹果', category: '蔬果', kcal: 52, protein: 0.3, fat: 0.2, carb: 13.8, icon: '🍎' },
  { id: 'yogurt', name: '酸奶(无糖)', category: '蛋奶', kcal: 59, protein: 10, fat: 0, carb: 3.6, icon: '🍶' },
  { id: 'sweet_potato', name: '红薯(熟)', category: '主食', kcal: 86, protein: 1.6, fat: 0.1, carb: 20.1, icon: '🍠' },
  { id: 'pasta_cooked', name: '意面(熟)', category: '主食', kcal: 158, protein: 5.8, fat: 0.9, carb: 31, icon: '🍝' },
  { id: 'spinach', name: '菠菜', category: '蔬果', kcal: 23, protein: 2.9, fat: 0.4, carb: 3.6, icon: '🥬' },
  { id: 'avocado', name: '牛油果', category: '蔬果', kcal: 160, protein: 2, fat: 14.7, carb: 8.5, icon: '🥑' },
  { id: 'almond', name: '杏仁', category: '坚果', kcal: 579, protein: 21.2, fat: 49.9, carb: 21.6, icon: '🌰' },
  { id: 'shrimp', name: '虾仁', category: '水产', kcal: 99, protein: 24, fat: 0.3, carb: 0, icon: '🍤' },
  { id: 'pork_tenderloin', name: '猪里脊', category: '肉禽', kcal: 143, protein: 26, fat: 3.5, carb: 0, icon: '🥓' },
  { id: 'quinoa_cooked', name: '藜麦(熟)', category: '主食', kcal: 120, protein: 4.4, fat: 1.9, carb: 21.3, icon: '🌾' },
  { id: 'carrot', name: '胡萝卜', category: '蔬果', kcal: 41, protein: 0.9, fat: 0.2, carb: 9.6, icon: '🥕' },
  { id: 'cottage_cheese', name: '茅屋奶酪', category: '蛋奶', kcal: 98, protein: 11, fat: 4.3, carb: 3.4, icon: '🧀' },
  { id: 'protein_powder', name: '蛋白粉', category: '补剂', kcal: 375, protein: 85, fat: 3, carb: 5, icon: '🥤' },
  { id: 'chocolate_dark', name: '黑巧克力', category: '零食', kcal: 546, protein: 4.9, fat: 31, carb: 61, icon: '🍫' },
  { id: 'olive_oil', name: '橄榄油', category: '油脂', kcal: 884, protein: 0, fat: 100, carb: 0, icon: '🫒' },
  { id: 'honey', name: '蜂蜜', category: '调味品', kcal: 304, protein: 0.3, fat: 0, carb: 82.4, icon: '🍯' },
  { id: 'potato_cooked', name: '土豆(熟)', category: '主食', kcal: 87, protein: 1.9, fat: 0.1, carb: 20.1, icon: '🥔' },
  { id: 'cucumber', name: '黄瓜', category: '蔬果', kcal: 15, protein: 0.7, fat: 0.1, carb: 3.6, icon: '🥒' },
  { id: 'tomato', name: '番茄', category: '蔬果', kcal: 18, protein: 0.9, fat: 0.2, carb: 3.9, icon: '🍅' },
  { id: 'mushroom', name: '香菇', category: '蔬果', kcal: 26, protein: 2, fat: 0.3, carb: 4.8, icon: '🍄' },
  { id: 'orange', name: '橙子', category: '蔬果', kcal: 47, protein: 0.9, fat: 0.1, carb: 11.8, icon: '🍊' },
  { id: 'grapes', name: '葡萄', category: '蔬果', kcal: 69, protein: 0.7, fat: 0.2, carb: 18.1, icon: '🍇' },
  { id: 'steamed_bun', name: '馒头', category: '主食', kcal: 223, protein: 7, fat: 1.1, carb: 47, icon: '🥟' },
  { id: 'dumpling', name: '水饺', category: '主食', kcal: 200, protein: 8, fat: 8, carb: 24, icon: '🥟' },
  { id: 'noodle_cooked', name: '面条(熟)', category: '主食', kcal: 137, protein: 4.5, fat: 0.2, carb: 28, icon: '🍜' },
  { id: 'lettuce', name: '生菜', category: '蔬果', kcal: 15, protein: 1.4, fat: 0.2, carb: 2.9, icon: '🥗' },
  { id: 'eggplant', name: '茄子', category: '蔬果', kcal: 25, protein: 1, fat: 0.2, carb: 6, icon: '🍆' },
  { id: 'corn', name: '玉米(熟)', category: '主食', kcal: 112, protein: 4, fat: 1.2, carb: 22.8, icon: '🌽' },
  { id: 'mango', name: '芒果', category: '蔬果', kcal: 60, protein: 0.8, fat: 0.4, carb: 15, icon: '🥭' },
  { id: 'strawberry', name: '草莓', category: '蔬果', kcal: 32, protein: 0.7, fat: 0.3, carb: 7.7, icon: '🍓' },
  { id: 'blueberry', name: '蓝莓', category: '蔬果', kcal: 57, protein: 0.7, fat: 0.3, carb: 14.5, icon: '🫐' },
  { id: 'ramen', name: '拉面', category: '主食', kcal: 436, protein: 10, fat: 15, carb: 66, icon: '🍜' },
  { id: 'pizza', name: '披萨', category: '快餐', kcal: 266, protein: 11, fat: 10, carb: 33, icon: '🍕' },
  { id: 'burger', name: '汉堡', category: '快餐', kcal: 295, protein: 17, fat: 14, carb: 24, icon: '🍔' },
  { id: 'fries', name: '薯条', category: '快餐', kcal: 312, protein: 3.4, fat: 15, carb: 41, icon: '🍟' },
  { id: 'sushi', name: '寿司', category: '快餐', kcal: 143, protein: 5, fat: 0.5, carb: 28, icon: '🍣' },
  { id: 'ice_cream', name: '冰淇淋', category: '零食', kcal: 207, protein: 3.5, fat: 11, carb: 24, icon: '🍦' }
];

export const ACTIVITY_DB = [
  { id: 'walk', name: '步行', met: 3.5, icon: '🚶' },
  { id: 'jog', name: '慢跑', met: 7.0, icon: '🏃' },
  { id: 'cycle', name: '骑行', met: 7.5, icon: '🚴' },
  { id: 'strength', name: '力量训练', met: 5.0, icon: '🏋️' },
  { id: 'swim', name: '游泳', met: 8.0, icon: '🏊' },
  { id: 'yoga', name: '瑜伽', met: 2.5, icon: '🧘' },
  { id: 'hiit', name: 'HIIT', met: 11.0, icon: '🔥' },
  { id: 'housework', name: '家务', met: 2.3, icon: '🧹' },
  { id: 'dance', name: '跳舞', met: 5.5, icon: '💃' },
  { id: 'hike', name: '徒步', met: 6.0, icon: '🥾' },
  { id: 'boxing', name: '拳击', met: 9.0, icon: '🥊' },
  { id: 'basketball', name: '篮球', met: 6.5, icon: '🏀' },
  { id: 'football', name: '足球', met: 7.0, icon: '⚽' },
  { id: 'badminton', name: '羽毛球', met: 5.5, icon: '🏸' },
  { id: 'climb', name: '爬楼梯', met: 8.0, icon: '🪜' },
  { id: 'clean', name: '大扫除', met: 3.0, icon: '🧼' }
];

export const MEAL_LABELS = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐'
};

export const MEAL_ICONS = {
  breakfast: '🌅',
  lunch: '🌞',
  dinner: '🌙',
  snack: '✨'
};
