export const EXPENSE_CATEGORIES = [
  'Food',
  'Rent',
  'Travel',
  'Shopping',
  'Health',
  'Bills',
  'Entertainment',
  'Education',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PREDEFINED_TAGS = [
  'essential',
  'subscription',
  'reimbursable',
  'family',
  'work',
  'travel',
];

export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'INR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'AED',
  'SGD',
];

export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32);
}

export function parseTagsInput(raw: string): string[] {
  const tags = raw
    .split(',')
    .map(normalizeTag)
    .filter((t) => !!t);
  return [...new Set(tags)];
}
