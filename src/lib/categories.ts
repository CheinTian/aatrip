import type { TranslationKey } from "./i18n";

export const expenseCategories = [
  "餐饮",
  "住宿",
  "交通",
  "门票",
  "购物",
  "其他"
] as const;

export const expenseCategoryKeys: Record<string, TranslationKey> = {
  餐饮: "categories.food",
  住宿: "categories.lodging",
  交通: "categories.transport",
  门票: "categories.tickets",
  购物: "categories.shopping",
  其他: "categories.other"
};

export function expenseCategoryKey(category: string) {
  return expenseCategoryKeys[category];
}
