import { NATAL_ARTIFACTS } from '../data/alchemyAndForge';
import { COMPANIONS } from '../data/companions';
import { calcElementMultiplier, ElementType } from '../data/elements';
import { ROGUELITE_RELICS } from '../data/exploration';
import { buildStageInfo } from '../data/stages';
import {
  calcCompanionStats,
  calcCritMultiplier,
  calcEffectiveRate,
  calcHeroTotalStats,
  calcMitigatedDamage,
  calcStageBaseScale,
} from './formulas';
import {
  BuildingId,
  BuildingState,
  CombatEvent,
  CombatStats,
  CombatUnitSnapshot,
  CompanionState,
  EquipSlot,
  EquipmentItem,
} from './types';

export interface CombatSimulationState {
  mode: 'stage' | 'tower' | 'explore';
  stage: number;
  zoneName: string;
  isBoss: boolean;
  strategyHint?: string;
  units: CombatUnitSnapshot[];
  turnOrderIndex: number;
  round: number;
  rage: number; // 0..100 本命法宝灵力怒气
  status: 'fighting' | 'victory' | 'defeat';
  events: CombatEvent[];
}

let eventSeq = 1;
function makeEvent(
  actorUid: string,
  targetUid: string,
  type: CombatEvent['type'],
  amount: number,
  text: string
): CombatEvent {
  eventSeq += 1;
  return {
    id: `ev_${eventSeq}`,
    timestamp: Date.now(),
    actorUid,
    targetUid,
    type,
    amount,
    text,
  };
}

const COMP_ELEMENT_MAP: Record<string, ElementType> = {
  gold: 'gold',
  wood: 'wood',
  water: 'water',
  fire: 'fire',
  thunder: 'gold',
};

export function createCombatSession(params: {
  mode?: 'stage' | 'tower' | 'explore';
  stage: number;
  heroName: string;
  heroElement?: ElementType;
  realmTier: number;
  realmSub: number;
  equipment: Partial<Record<EquipSlot, EquipmentItem>>;
  buildings: Record<BuildingId, BuildingState>;
  deployedCompanions: string[];
  companionStates: Record<string, CompanionState>;
  formationPositions?: Record<string, { row: number; col: number }>;
  cultivationArts?: Record<string, number>;
  activeArtId?: string | null;
  bloodlineLevels?: Record<string, number>;
  activeBloodlineId?: string | null;
  activeRelicIds?: string[];
  elixirBuffs?: { atkBuffTurns?: number; defBuffTurns?: number };
}): CombatSimulationState {
  const mode = params.mode ?? 'stage';
  const heroStats = calcHeroTotalStats(
    params.realmTier,
    params.realmSub,
    params.equipment,
    params.buildings,
    params.cultivationArts ?? {},
    params.activeArtId ?? null,
    params.bloodlineLevels ?? {},
    params.activeBloodlineId ?? null,
    params.activeRelicIds ?? [],
    params.elixirBuffs ?? {}
  );

  const heroPos = params.formationPositions?.hero ?? { row: 1, col: 1 };
  const units: CombatUnitSnapshot[] = [
    {
      uid: 'hero',
      name: params.heroName,
      isPlayerSide: true,
      isHero: true,
      role: 'hero',
      element: params.heroElement ?? 'gold',
      gridRow: heroPos.row,
      gridCol: heroPos.col,
      hp: heroStats.maxHp,
      maxHp: heroStats.maxHp,
      atk: heroStats.atk,
      def: heroStats.def,
      speed: heroStats.speed,
      stats: heroStats,
      skillCooldown: 2,
      maxCooldown: 3,
      stunned: false,
      stunImmune: false,
      shield: 0,
      primaryColor: '#fbbf24',
      accentColor: '#d97706',
    },
  ];

  params.deployedCompanions.forEach((cid, i) => {
    const cfg = COMPANIONS.find((c) => c.id === cid);
    const st = params.companionStates[cid];
    if (!cfg || !st || !st.unlocked) return;
    const cStats = calcCompanionStats(cfg, st, params.buildings);
    const defaultPos = cfg.role === 'tank' ? { row: 1, col: 0 } : { row: i % 3, col: 2 };
    const pos = params.formationPositions?.[cid] ?? defaultPos;
    units.push({
      uid: `comp_${cid}`,
      name: cfg.name,
      isPlayerSide: true,
      role: cfg.role,
      element: COMP_ELEMENT_MAP[cfg.element] ?? 'wood',
      gridRow: pos.row,
      gridCol: pos.col,
      hp: cStats.maxHp,
      maxHp: cStats.maxHp,
      atk: cStats.atk,
      def: cStats.def,
      speed: cStats.speed,
      stats: cStats,
      skillCooldown: cfg.skillCooldown - 1,
      maxCooldown: cfg.skillCooldown,
      stunned: false,
      stunImmune: false,
      shield: 0,
      primaryColor: cfg.primaryColor,
      accentColor: cfg.accentColor,
    });
  });

  const effectiveStage = mode === 'tower' ? params.stage * 2 + 2 : params.stage;
  const stageInfo = buildStageInfo(mode === 'tower' ? Math.max(10, params.stage * 5) : params.stage);
  const baseScale = calcStageBaseScale(effectiveStage);
  const enemyElems: ElementType[] = ['wood', 'fire', 'earth', 'water', 'gold'];

  stageInfo.enemies.forEach((tpl, idx) => {
    const eStats: CombatStats = {
      maxHp: Math.round(baseScale.hp * tpl.hpMult),
      atk: Math.round(baseScale.atk * tpl.atkMult),
      def: Math.round(baseScale.def * tpl.defMult),
      speed: baseScale.speed + idx * 3,
      crit: tpl.traits?.crit ?? 0.04,
      combo: tpl.traits?.combo ?? 0.02,
      dodge: tpl.traits?.dodge ?? 0.02,
      lifesteal: tpl.traits?.lifesteal ?? 0,
      stun: tpl.traits?.stun ?? 0,
      antiCrit: tpl.traits?.antiCrit ?? 0,
      antiCombo: tpl.traits?.antiCombo ?? 0,
      antiDodge: tpl.traits?.antiDodge ?? 0,
      antiLifesteal: 0,
      antiStun: 0,
      critDmg: 0,
      critRes: 0,
      dmgBoost: tpl.traits?.dmgBoost ?? 0,
      dmgReduce: tpl.traits?.dmgReduce ?? 0,
    };
    units.push({
      uid: `enemy_${idx}`,
      name: tpl.name,
      isPlayerSide: false,
      role: tpl.role,
      element: enemyElems[(params.stage + idx) % enemyElems.length],
      gridRow: idx === 0 ? 1 : idx === 1 ? 0 : 2,
      gridCol: tpl.role === 'tank' ? 0 : 1,
      hp: eStats.maxHp,
      maxHp: eStats.maxHp,
      atk: eStats.atk,
      def: eStats.def,
      speed: eStats.speed,
      stats: eStats,
      skillCooldown: 2,
      maxCooldown: 3,
      stunned: false,
      stunImmune: false,
      chargingUlt: false,
      shield: 0,
      primaryColor: tpl.primaryColor,
      accentColor: tpl.accentColor,
    });
  });

  units.sort((a, b) => b.speed - a.speed);

  let startRage = 25;
  for (const rid of params.activeRelicIds ?? []) {
    const relic = ROGUELITE_RELICS.find((r) => r.id === rid);
    if (relic?.effect.startRage) startRage = Math.min(100, startRage + relic.effect.startRage);
  }

  return {
    mode,
    stage: params.stage,
    zoneName: mode === 'tower' ? `镇妖古塔 · 第${params.stage}层` : mode === 'explore' ? `星图秘境 · 第${params.stage}域` : stageInfo.zoneName,
    isBoss: mode === 'tower' || stageInfo.isBoss,
    strategyHint: stageInfo.strategyHint,
    units,
    turnOrderIndex: 0,
    round: 1,
    rage: startRage,
    status: 'fighting',
    events: [],
  };
}

function applyDamage(target: CombatUnitSnapshot, dmg: number): number {
  let remaining = Math.max(1, Math.round(dmg));
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
  }
  target.hp = Math.max(0, target.hp - remaining);
  return Math.max(1, Math.round(dmg));
}

/**
 * 九宫格站位索敌逻辑：优先攻击最前排（gridCol 最小）的存活目标
 */
function pickTarget(units: CombatUnitSnapshot[], attackerIsPlayer: boolean): CombatUnitSnapshot | undefined {
  const opponents = units.filter((u) => u.isPlayerSide !== attackerIsPlayer && u.hp > 0);
  if (opponents.length === 0) return undefined;
  opponents.sort((a, b) => a.gridCol - b.gridCol || (a.role === 'tank' ? -1 : 1));
  return opponents[0];
}

/**
 * 手动/自动祭出本命法宝大招（消耗 100 点怒气）
 */
export function triggerNatalUltimate(
  state: CombatSimulationState,
  artifactId: 'zhuxian_sword' | 'hunyuan_bell' | 'jiuyou_banner',
  artifactLevel: number,
  forgeLevel: number
): { nextState: CombatSimulationState; events: CombatEvent[] } {
  if (state.status !== 'fighting' || state.rage < 100) {
    return { nextState: state, events: [] };
  }

  const units = state.units.map((u) => ({ ...u }));
  const hero = units.find((u) => u.isHero && u.hp > 0) ?? units.find((u) => u.isPlayerSide && u.hp > 0);
  if (!hero) return { nextState: state, events: [] };

  const cfg = NATAL_ARTIFACTS.find((a) => a.id === artifactId) ?? NATAL_ARTIFACTS[0];
  const powerMult = (1 + (artifactLevel - 1) * 0.22) * (1 + forgeLevel * 0.08);
  const events: CombatEvent[] = [];

  if (cfg.id === 'hunyuan_bell') {
    const allies = units.filter((u) => u.isPlayerSide && u.hp > 0);
    for (const ally of allies) {
      const shieldAmt = Math.round(ally.maxHp * 0.32 * powerMult);
      const healAmt = Math.round(ally.maxHp * 0.14 * powerMult);
      ally.shield += shieldAmt;
      ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
      events.push(makeEvent(hero.uid, ally.uid, 'shield', shieldAmt, `金钟盾+${shieldAmt}`));
    }
  } else {
    const enemies = units.filter((u) => !u.isPlayerSide && u.hp > 0);
    let totalHeal = 0;
    for (const enemy of enemies) {
      const elem = calcElementMultiplier(cfg.element, enemy.element);
      const coeff = (cfg.id === 'zhuxian_sword' ? 2.15 : 1.75) * powerMult * elem.mult;
      const dmg = calcMitigatedDamage(hero.atk, enemy.def, coeff, hero.stats.dmgBoost, enemy.stats.dmgReduce);
      const finalDmg = applyDamage(enemy, dmg);
      totalHeal += Math.round(finalDmg * 0.25);
      const tag = elem.relation === 'advantage' ? '克制 ' : '';
      events.push(makeEvent(hero.uid, enemy.uid, 'skill', finalDmg, `${tag}${cfg.ultName} -${finalDmg}`));
      if (cfg.id === 'jiuyou_banner' && enemy.hp > 0 && Math.random() < 0.55) {
        enemy.stunned = true;
        enemy.chargingUlt = false;
        events.push(makeEvent(hero.uid, enemy.uid, 'stun', 0, '噬魂震晕!'));
      }
    }
    if (cfg.id === 'jiuyou_banner' && totalHeal > 0) {
      const allies = units.filter((u) => u.isPlayerSide && u.hp > 0);
      allies.forEach((ally) => {
        const eachHeal = Math.round(totalHeal / Math.max(1, allies.length));
        ally.hp = Math.min(ally.maxHp, ally.hp + eachHeal);
        events.push(makeEvent(hero.uid, ally.uid, 'heal', eachHeal, `魂炎汲取 +${eachHeal}`));
      });
    }
  }

  const enemyAlive = units.some((u) => !u.isPlayerSide && u.hp > 0);
  return {
    nextState: {
      ...state,
      units,
      rage: 0,
      status: enemyAlive ? state.status : 'victory',
      events: [...state.events.slice(-24), ...events],
    },
    events,
  };
}

export function stepCombatTurn(state: CombatSimulationState): { nextState: CombatSimulationState; turnEvents: CombatEvent[] } {
  if (state.status !== 'fighting') {
    return { nextState: state, turnEvents: [] };
  }

  const units = state.units.map((u) => ({ ...u }));
  const turnEvents: CombatEvent[] = [];
  let nextRage = state.rage;

  let checked = 0;
  let idx = state.turnOrderIndex;
  let round = state.round;
  while (checked < units.length && units[idx].hp <= 0) {
    idx = (idx + 1) % units.length;
    if (idx === 0) round += 1;
    checked += 1;
  }

  const actor = units[idx];
  if (!actor || actor.hp <= 0) {
    return { nextState: { ...state, status: 'defeat' }, turnEvents };
  }

  if (actor.stunned) {
    actor.stunned = false;
    actor.stunImmune = true;
    actor.chargingUlt = false;
    turnEvents.push(makeEvent(actor.uid, actor.uid, 'stun', 0, '眩晕跳过'));
  } else {
    actor.stunImmune = false;
    const compCfg = actor.uid.startsWith('comp_')
      ? COMPANIONS.find((c) => `comp_${c.id}` === actor.uid)
      : undefined;

    // Boss 蓄力释放高伤大招（给玩家留出手动护盾/打断窗口）
    if (!actor.isPlayerSide && state.isBoss && actor.chargingUlt) {
      actor.chargingUlt = false;
      actor.skillCooldown = actor.maxCooldown;
      const allies = units.filter((u) => u.isPlayerSide && u.hp > 0);
      for (const ally of allies) {
        const elem = calcElementMultiplier(actor.element, ally.element);
        const dmg = calcMitigatedDamage(actor.atk, ally.def, 1.55 * elem.mult, actor.stats.dmgBoost, ally.stats.dmgReduce);
        const finalDmg = applyDamage(ally, dmg);
        turnEvents.push(makeEvent(actor.uid, ally.uid, 'crit', finalDmg, `妖王灭世 -${finalDmg}`));
      }
      nextRage = Math.min(100, nextRage + 18);
    } else if (!actor.isPlayerSide && state.isBoss && actor.skillCooldown <= 0) {
      actor.chargingUlt = true;
      turnEvents.push(makeEvent(actor.uid, actor.uid, 'skill', 0, '妖王蓄力大招!'));
    } else {
      const readySkill = actor.skillCooldown <= 0;
      if (readySkill) {
        actor.skillCooldown = actor.maxCooldown;
        if (compCfg?.specialEffect === 'heal') {
          const allies = units
            .filter((u) => u.isPlayerSide === actor.isPlayerSide && u.hp > 0)
            .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)
            .slice(0, 2);
          for (const ally of allies) {
            const healAmt = Math.round(actor.atk * compCfg.skillCoeff);
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
            turnEvents.push(makeEvent(actor.uid, ally.uid, 'heal', healAmt, `+${healAmt}`));
          }
          if (actor.isPlayerSide) nextRage = Math.min(100, nextRage + 14);
        } else if (compCfg?.specialEffect === 'shield') {
          const shieldAmt = Math.round(actor.maxHp * 0.28);
          actor.shield += shieldAmt;
          turnEvents.push(makeEvent(actor.uid, actor.uid, 'shield', shieldAmt, `护盾 +${shieldAmt}`));
          if (actor.isPlayerSide) nextRage = Math.min(100, nextRage + 14);
        } else {
          const target = pickTarget(units, actor.isPlayerSide);
          if (target) {
            const elem = calcElementMultiplier(actor.element, target.element);
            const ratio = (compCfg ? compCfg.skillCoeff : actor.isHero ? 1.75 : 1.45) * elem.mult;
            const jitter = 0.95 + Math.random() * 0.1;
            let dmg = calcMitigatedDamage(actor.atk, target.def, ratio, actor.stats.dmgBoost, target.stats.dmgReduce) * jitter;
            const critRate = calcEffectiveRate(actor.stats.crit, target.stats.antiCrit);
            const isCrit = Math.random() < critRate;
            if (isCrit) {
              dmg *= calcCritMultiplier(actor.stats.critDmg, target.stats.critRes);
            }
            const finalDmg = applyDamage(target, dmg);
            const elemTag = elem.relation === 'advantage' ? '克制 ' : '';
            turnEvents.push(
              makeEvent(actor.uid, target.uid, isCrit ? 'crit' : 'skill', finalDmg, `${elemTag}${isCrit ? '暴击 ' : '神通 '}-${finalDmg}`)
            );
            if (actor.isPlayerSide) nextRage = Math.min(100, nextRage + 16);
            else nextRage = Math.min(100, nextRage + 8);

            if (compCfg?.specialEffect === 'stun' && target.hp > 0 && !target.stunImmune) {
              const stunRate = calcEffectiveRate(actor.stats.stun + 0.35, target.stats.antiStun);
              if (Math.random() < stunRate) {
                target.stunned = true;
                target.chargingUlt = false;
                turnEvents.push(makeEvent(actor.uid, target.uid, 'stun', 0, '神雷震晕!'));
              }
            }
          }
        }
      } else {
        actor.skillCooldown = Math.max(0, actor.skillCooldown - 1);
        let comboChain = 0;
        let currentComboRate = 0;
        do {
          const target = pickTarget(units, actor.isPlayerSide);
          if (!target) break;

          const dodgeRate = calcEffectiveRate(target.stats.dodge, actor.stats.antiDodge);
          if (Math.random() < dodgeRate) {
            turnEvents.push(makeEvent(actor.uid, target.uid, 'dodge', 0, '闪避!'));
          } else {
            const elem = calcElementMultiplier(actor.element, target.element);
            const coeff = (comboChain === 0 ? 1.0 : 0.8) * elem.mult;
            const jitter = 0.95 + Math.random() * 0.1;
            let dmg = calcMitigatedDamage(actor.atk, target.def, coeff, actor.stats.dmgBoost, target.stats.dmgReduce) * jitter;
            const critRate = calcEffectiveRate(actor.stats.crit, target.stats.antiCrit);
            const isCrit = Math.random() < critRate;
            if (isCrit) {
              dmg *= calcCritMultiplier(actor.stats.critDmg, target.stats.critRes);
            }
            const finalDmg = applyDamage(target, dmg);
            const evType: CombatEvent['type'] = comboChain > 0 ? 'combo' : isCrit ? 'crit' : 'attack';
            const prefix = comboChain > 0 ? '连击 ' : isCrit ? '暴击 ' : elem.relation === 'advantage' ? '克制 ' : '';
            turnEvents.push(makeEvent(actor.uid, target.uid, evType, finalDmg, `${prefix}-${finalDmg}`));

            if (actor.isPlayerSide) nextRage = Math.min(100, nextRage + 12);
            else nextRage = Math.min(100, nextRage + 7);

            const lsRate = calcEffectiveRate(actor.stats.lifesteal, target.stats.antiLifesteal);
            if (lsRate > 0 && actor.hp > 0) {
              const heal = Math.max(1, Math.round(finalDmg * lsRate));
              actor.hp = Math.min(actor.maxHp, actor.hp + heal);
              turnEvents.push(makeEvent(actor.uid, actor.uid, 'heal', heal, `吸血 +${heal}`));
            }

            if (target.hp > 0 && !target.stunImmune) {
              const stunRate = calcEffectiveRate(actor.stats.stun, target.stats.antiStun);
              if (Math.random() < stunRate) {
                target.stunned = true;
                target.chargingUlt = false;
                turnEvents.push(makeEvent(actor.uid, target.uid, 'stun', 0, '击晕!'));
              }
            }
          }

          if (comboChain === 0) {
            currentComboRate = calcEffectiveRate(actor.stats.combo, target.stats.antiCombo);
          } else {
            currentComboRate *= 0.65;
          }
          comboChain += 1;
        } while (comboChain < 4 && Math.random() < currentComboRate);
      }
    }
  }

  const playerAlive = units.some((u) => u.isPlayerSide && u.hp > 0);
  const enemyAlive = units.some((u) => !u.isPlayerSide && u.hp > 0);

  let status: CombatSimulationState['status'] = 'fighting';
  if (!enemyAlive) status = 'victory';
  else if (!playerAlive || round > 30) status = 'defeat';

  const nextIdx = (idx + 1) % units.length;
  const nextRound = nextIdx === 0 ? round + 1 : round;

  return {
    nextState: {
      ...state,
      units,
      turnOrderIndex: nextIdx,
      round: nextRound,
      rage: nextRage,
      status,
      events: [...state.events.slice(-24), ...turnEvents],
    },
    turnEvents,
  };
}
