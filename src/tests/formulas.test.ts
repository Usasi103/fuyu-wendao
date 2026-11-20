import { describe, expect, it } from 'vitest';
import { createCombatSession, stepCombatTurn, triggerNatalUltimate } from '../core/combatEngine';
import { calcElementMultiplier } from '../data/elements';
import { generateRealmMap } from '../data/exploration';
import {
  calcBuildingRatePerSec,
  calcBuildingUpgradeCost,
  calcCombatPower,
  calcCritMultiplier,
  calcEffectiveRate,
  calcExpRequired,
  calcHeroRealmBaseStats,
  calcHeroTotalStats,
  calcIslandLevelCap,
  calcMitigatedDamage,
  calcTribulationSuccessRate,
  getTreeQualityProbabilities,
  getUnlockStatus,
} from '../core/formulas';
import { generateEquipment, reforgeItemSubStats, rollQuality } from '../core/lootEngine';

describe('核心数值公式与平衡性校验', () => {
  it('境界属性与修为需求应呈单调递增', () => {
    let prevAtk = 0;
    let prevExp = 0;
    for (let t = 0; t <= 4; t++) {
      for (let s = 1; s <= 9; s++) {
        const stats = calcHeroRealmBaseStats(t, s);
        const exp = calcExpRequired(t, s);
        expect(stats.atk).toBeGreaterThan(prevAtk);
        expect(exp).toBeGreaterThan(prevExp);
        prevAtk = stats.atk;
        prevExp = exp;
      }
    }
  });

  it('灵树品质概率总和严格为 1，且高等级树掉落期望更高', () => {
    const p1 = getTreeQualityProbabilities(1);
    const p8 = getTreeQualityProbabilities(8);
    expect(p1.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(p8.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);

    const expectedTier1 = p1.reduce((acc, p, idx) => acc + p * idx, 0);
    const expectedTier8 = p8.reduce((acc, p, idx) => acc + p * idx, 0);
    expect(expectedTier8).toBeGreaterThan(expectedTier1);
  });

  it('第 20 抽保底必然触发高品质装备', () => {
    const res = rollQuality(5, 19);
    expect(res.quality).toBeGreaterThanOrEqual(3);
    expect(res.nextPity).toBe(0);
  });

  it('装备生成应产出有效战力与属性', () => {
    const { item } = generateEquipment(10, 4, 0);
    expect(item.atk).toBeGreaterThan(0);
    expect(item.power).toBeGreaterThan(0);
    expect(
      calcCombatPower({ maxHp: item.hp, atk: item.atk, def: item.def, speed: item.speed, subStats: item.subStats }, Math.max(1, item.level * 0.65))
    ).toBe(item.power);
  });

  it('防御减伤公式不会产生 0 伤害死局，且抗性抵消限制在 0~80%', () => {
    const dmg = calcMitigatedDamage(100, 999999, 1);
    expect(dmg).toBeCloseTo(8, 3); // 8% 保底伤害
    expect(calcEffectiveRate(0.95, 0.05)).toBe(0.8);
    expect(calcEffectiveRate(0.15, 0.4)).toBe(0);
    expect(calcCritMultiplier(0, 1.0)).toBe(1.25);
  });

  it('建筑升级回本时间合理且推图应带来正向收益加成', () => {
    const baseRate = calcBuildingRatePerSec('spiritArray', 1, 0);
    const nextRate = calcBuildingRatePerSec('spiritArray', 2, 0);
    const cost = calcBuildingUpgradeCost('spiritArray', 1);
    const paybackSec = cost / (nextRate - baseRate);
    expect(paybackSec).toBeGreaterThan(10);
    expect(paybackSec).toBeLessThan(3600);

    const stageBoosted = calcBuildingRatePerSec('spiritArray', 1, 20);
    expect(stageBoosted).toBeGreaterThan(baseRate);
  });

  it('小队即时战斗模拟能够在有限回合内正常结算', () => {
    let sim = createCombatSession({
      stage: 1,
      heroName: '测试道友',
      realmTier: 1,
      realmSub: 1,
      equipment: {},
      buildings: {
        spiritArray: { id: 'spiritArray', level: 1, storedAmount: 0, bonusProgress: 0 },
        springPool: { id: 'springPool', level: 1, storedAmount: 0, bonusProgress: 0 },
        alchemyFurnace: { id: 'alchemyFurnace', level: 1, storedAmount: 0, bonusProgress: 0 },
        beastGarden: { id: 'beastGarden', level: 1, storedAmount: 0, bonusProgress: 0 },
        herbFarm: { id: 'herbFarm', level: 0, storedAmount: 0, bonusProgress: 0 },
        forge: { id: 'forge', level: 0, storedAmount: 0, bonusProgress: 0 },
        thunderTower: { id: 'thunderTower', level: 0, storedAmount: 0, bonusProgress: 0 },
      },
      deployedCompanions: ['turtle_guardian'],
      companionStates: {
        turtle_guardian: { id: 'turtle_guardian', unlocked: true, level: 2, star: 1, investedFood: 18 },
      },
    });

    let steps = 0;
    while (sim.status === 'fighting' && steps < 100) {
      sim = stepCombatTurn(sim).nextState;
      steps += 1;
    }
    expect(sim.status).not.toBe('fighting');
    expect(sim.events.length).toBeGreaterThan(0);
  });

  it('渐进解锁、渡劫成功率与心法/洗练机制工作正常', () => {
    const lv1 = getUnlockStatus(0, 1, 0, 1);
    expect(lv1.alchemyFurnace).toBe(false);
    expect(lv1.autoChop).toBe(false);
    expect(lv1.tower).toBe(false);

    const zhuji = getUnlockStatus(1, 1, 5, 3);
    expect(zhuji.alchemyFurnace).toBe(true);
    expect(zhuji.autoChop).toBe(true);
    expect(zhuji.cultivationArts).toBe(true);
    expect(zhuji.tower).toBe(true);

    const noPill = calcTribulationSuccessRate(0, 950, 0);
    const withPills = calcTribulationSuccessRate(0, 950, 2);
    expect(withPills.rate).toBeGreaterThan(noPill.rate);
    expect(withPills.rate).toBeLessThanOrEqual(1);

    const emptyBuildings = {
      spiritArray: { id: 'spiritArray' as const, level: 1, storedAmount: 0, bonusProgress: 0 },
      springPool: { id: 'springPool' as const, level: 1, storedAmount: 0, bonusProgress: 0 },
      alchemyFurnace: { id: 'alchemyFurnace' as const, level: 1, storedAmount: 0, bonusProgress: 0 },
      beastGarden: { id: 'beastGarden' as const, level: 1, storedAmount: 0, bonusProgress: 0 },
      herbFarm: { id: 'herbFarm' as const, level: 0, storedAmount: 0, bonusProgress: 0 },
      forge: { id: 'forge' as const, level: 0, storedAmount: 0, bonusProgress: 0 },
      thunderTower: { id: 'thunderTower' as const, level: 0, storedAmount: 0, bonusProgress: 0 },
    };
    const baseHero = calcHeroTotalStats(1, 1, {}, emptyBuildings, {}, null);
    const artHero = calcHeroTotalStats(1, 1, {}, emptyBuildings, { sword_heart: 2 }, 'sword_heart');
    expect(artHero.atk).toBeGreaterThan(baseHero.atk);
    expect(artHero.crit).toBeGreaterThan(baseHero.crit);

    const { item } = generateEquipment(10, 5, 19);
    const reforged = reforgeItemSubStats(item);
    expect(reforged.id).toBe(item.id);
    expect(reforged.quality).toBe(item.quality);

    // 蓝图/推图上限、建筑驻守+35%、血脉增减伤公式校验
    expect(calcIslandLevelCap(0)).toBe(2);
    expect(calcIslandLevelCap(6)).toBe(5);
    const baseBld = calcBuildingRatePerSec('spiritArray', 1, 0, false);
    const garrisonBld = calcBuildingRatePerSec('spiritArray', 1, 0, true);
    expect(garrisonBld).toBeCloseTo(baseBld * 1.35, 4);

    const blStats = calcHeroTotalStats(1, 1, {}, emptyBuildings, {}, null, { qinglong: 2 }, 'qinglong');
    expect(blStats.dmgBoost).toBeGreaterThan(0);
    expect(calcMitigatedDamage(100, 0, 1, 0.25, 0)).toBeGreaterThan(calcMitigatedDamage(100, 0, 1, 0, 0.25));
  });

  it('五行生克、秘境星图生成与本命法宝大招触发工作正常', () => {
    expect(calcElementMultiplier('gold', 'wood')).toEqual({ mult: 1.3, relation: 'advantage' });
    expect(calcElementMultiplier('wood', 'gold')).toEqual({ mult: 0.8, relation: 'disadvantage' });
    expect(calcElementMultiplier('gold', 'water')).toEqual({ mult: 1.0, relation: 'neutral' });

    const map = generateRealmMap(1);
    expect(map.width).toBe(7);
    expect(map.height).toBe(5);
    expect(map.tiles).toHaveLength(35);
    expect(map.tiles.find((t) => t.x === map.playerX && t.y === map.playerY)?.type).toBe('start');
    expect(map.tiles.some((t) => t.type === 'boss')).toBe(true);

    const buildings = {
      spiritArray: { id: 'spiritArray' as const, level: 1, storedAmount: 0, bonusProgress: 0 },
      springPool: { id: 'springPool' as const, level: 1, storedAmount: 0, bonusProgress: 0 },
      alchemyFurnace: { id: 'alchemyFurnace' as const, level: 1, storedAmount: 0, bonusProgress: 0 },
      beastGarden: { id: 'beastGarden' as const, level: 1, storedAmount: 0, bonusProgress: 0 },
      herbFarm: { id: 'herbFarm' as const, level: 1, storedAmount: 0, bonusProgress: 0 },
      forge: { id: 'forge' as const, level: 1, storedAmount: 0, bonusProgress: 0 },
      thunderTower: { id: 'thunderTower' as const, level: 1, storedAmount: 0, bonusProgress: 0 },
    };
    const sim = createCombatSession({
      mode: 'explore',
      stage: 1,
      heroName: '像素剑修',
      heroElement: 'gold',
      realmTier: 1,
      realmSub: 2,
      equipment: {},
      buildings,
      deployedCompanions: ['turtle_guardian'],
      companionStates: { turtle_guardian: { id: 'turtle_guardian', unlocked: true, level: 2, star: 1, investedFood: 0 } },
    });
    const fullRageSim = { ...sim, rage: 100 };
    const { nextState, events } = triggerNatalUltimate(fullRageSim, 'zhuxian_sword', 2, 1);
    expect(nextState.rage).toBe(0);
    expect(events.length).toBeGreaterThan(0);
  });
});
