export type ElementType = 'gold' | 'wood' | 'earth' | 'water' | 'fire';

export const ELEMENT_META: Record<ElementType, { label: string; color: string; beats: ElementType }> = {
  gold: { label: '金', color: '#fbbf24', beats: 'wood' },
  wood: { label: '木', color: '#4ade80', beats: 'earth' },
  earth: { label: '土', color: '#d97706', beats: 'water' },
  water: { label: '水', color: '#38bdf8', beats: 'fire' },
  fire: { label: '火', color: '#f87171', beats: 'gold' },
};

export function calcElementMultiplier(attacker: ElementType, defender: ElementType): { mult: number; relation: 'advantage' | 'disadvantage' | 'neutral' } {
  if (ELEMENT_META[attacker].beats === defender) {
    return { mult: 1.3, relation: 'advantage' };
  }
  if (ELEMENT_META[defender].beats === attacker) {
    return { mult: 0.8, relation: 'disadvantage' };
  }
  return { mult: 1.0, relation: 'neutral' };
}
