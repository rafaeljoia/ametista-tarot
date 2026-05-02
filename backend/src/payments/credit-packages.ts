export interface CreditPackage {
  id: string;
  label: string;
  /** BRL price */
  gross: number;
  /** Credits granted (1 BRL = 1 credit, with optional bonus) */
  credits: number;
  bonus: number;
  highlight?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'pkg_20', label: 'Iniciante', gross: 20, credits: 20, bonus: 0 },
  { id: 'pkg_50', label: 'Mais escolhido', gross: 50, credits: 55, bonus: 5, highlight: true },
  { id: 'pkg_100', label: 'Avançado', gross: 100, credits: 115, bonus: 15 },
  { id: 'pkg_200', label: 'Premium', gross: 200, credits: 240, bonus: 40 },
];

export function findPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}
