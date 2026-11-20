import React, { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import { CombatUnitSnapshot } from '../core/types';
import { ELEMENT_META } from '../data/elements';
import { useGameStore } from '../store/gameStore';
import { CharacterRig, createCharacterRig, getPixelAsset, preloadGameSprites } from './SpriteFactory';

interface UnitRenderNode {
  rig: CharacterRig;
  hpFill: Graphics;
  hpBg: Graphics;
  nameLabel: Text;
  baseX: number;
  baseY: number;
  lungeTimer: number;
  hitTimer: number;
}

interface FloatingDmg {
  text: Text;
  vy: number;
  vx: number;
  life: number;
}

interface SlashFx {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
}

export const CombatScene: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    let initialized = false;
    const app = new Application();
    const unitNodes = new Map<string, UnitRenderNode>();
    const floaters: FloatingDmg[] = [];
    const slashes: SlashFx[] = [];
    let lastProcessedEventIds = new Set<string>();
    let lastStageKey = '';
    let shakeTimer = 0;

    (async () => {
      await app.init({
        resizeTo: host,
        backgroundAlpha: 0,
        antialias: false,
        roundPixels: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      initialized = true;

      if (destroyed) {
        app.destroy(true, { children: true });
        return;
      }

      await preloadGameSprites();

      if (destroyed) {
        app.destroy(true, { children: true });
        return;
      }

      host.innerHTML = '';
      host.appendChild(app.canvas);

      const arenaRoot = new Container();
      app.stage.addChild(arenaRoot);

      const bgSprite = new Sprite(getPixelAsset('bgCombat'));
      bgSprite.anchor.set(0.5);
      arenaRoot.addChild(bgSprite);

      const gridLayer = new Graphics();
      arenaRoot.addChild(gridLayer);

      const unitsLayer = new Container();
      arenaRoot.addChild(unitsLayer);

      const fxLayer = new Container();
      arenaRoot.addChild(fxLayer);

      const drawArenaBg = () => {
        const w = app.screen.width;
        const h = app.screen.height;
        const bgTex = getPixelAsset('bgCombat');
        const scale = Math.max(w / bgTex.width, h / bgTex.height);
        bgSprite.scale.set(scale);
        bgSprite.position.set(w * 0.5, h * 0.5);

        // 九宫格站位地板刻线
        gridLayer.clear();
        const colW = w < 520 ? 38 : 64;
        const rowH = w < 520 ? 36 : 46;
        for (const isPlayer of [true, false]) {
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              const x = isPlayer ? w * 0.34 - c * colW : w * 0.66 + c * colW;
              const y = h * 0.54 + (r - 1) * rowH;
              gridLayer
                .rect(x - colW * 0.42, y - rowH * 0.35, colW * 0.84, rowH * 0.7)
                .stroke({ width: 1, color: isPlayer ? '#38bdf8' : '#f43f5e', alpha: 0.22 });
            }
          }
        }
      };

      const rebuildUnits = (units: CombatUnitSnapshot[]) => {
        unitsLayer.removeChildren();
        unitNodes.clear();
        const w = app.screen.width;
        const h = app.screen.height;
        const unitScale = w < 520 ? 0.76 : 1.02;
        const colW = w < 520 ? 38 : 64;
        const rowH = w < 520 ? 36 : 46;

        units.forEach((u) => {
          const x = u.isPlayerSide ? w * 0.34 - u.gridCol * colW : w * 0.66 + u.gridCol * colW;
          const y = h * 0.54 + (u.gridRow - 1) * rowH;

          const isBoss = !u.isPlayerSide && u.maxHp > 500;
          const rig = createCharacterRig({
            key: u.uid,
            name: u.name,
            primaryColor: u.primaryColor,
            accentColor: u.accentColor,
            element: u.element,
            isEnemy: !u.isPlayerSide,
            isBoss,
            isHero: u.isHero,
            role: u.role,
            scale: (isBoss ? 1.18 : 1.0) * unitScale,
          });
          rig.root.position.set(x, y);

          const hpBg = new Graphics();
          hpBg.rect(-24, -56, 48, 5).fill('#0f172a').stroke({ width: 1, color: '#475569' });
          rig.root.addChild(hpBg);

          const hpFill = new Graphics();
          rig.root.addChild(hpFill);

          const elemMeta = ELEMENT_META[u.element];
          const nameLabel = new Text({
            text: `[${elemMeta.label}] ${u.name}`,
            style: {
              fontSize: 10,
              fontWeight: 'bold',
              fill: elemMeta.color,
              stroke: { color: '#020617', width: 3 },
            },
          });
          nameLabel.anchor.set(0.5);
          nameLabel.position.set(0, -66);
          rig.root.addChild(nameLabel);

          unitsLayer.addChild(rig.root);
          unitNodes.set(u.uid, {
            rig,
            hpBg,
            hpFill,
            nameLabel,
            baseX: x,
            baseY: y,
            lungeTimer: 0,
            hitTimer: 0,
          });
        });
      };

      const spawnFloater = (x: number, y: number, label: string, color: string, big = false) => {
        const t = new Text({
          text: label,
          style: {
            fontSize: big ? 17 : 13,
            fontWeight: 'bold',
            fill: color,
            stroke: { color: '#020617', width: 4 },
          },
        });
        t.anchor.set(0.5);
        t.position.set(x + (Math.random() - 0.5) * 16, y - 50);
        fxLayer.addChild(t);
        floaters.push({ text: t, vx: (Math.random() - 0.5) * 20, vy: -48, life: 0.95 });
      };

      const spawnSlash = (fromX: number, fromY: number, toX: number, toY: number, color: string) => {
        const g = new Graphics();
        g.rect(-10, -2, 20, 4).fill(color);
        g.position.set(fromX, fromY);
        const angle = Math.atan2(toY - fromY, toX - fromX);
        g.rotation = angle;
        fxLayer.addChild(g);
        const speed = 580;
        slashes.push({
          g,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: Math.hypot(toX - fromX, toY - fromY) / speed,
        });
      };

      drawArenaBg();
      app.renderer.on('resize', () => {
        drawArenaBg();
        const c = useGameStore.getState().combat;
        if (c) rebuildUnits(c.units);
      });

      let elapsed = 0;
      app.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000;
        elapsed += dt;

        const combat = useGameStore.getState().combat;
        if (!combat) return;

        const stageKey = `${combat.mode}_${combat.stage}_${combat.units.map((u) => `${u.uid}:${u.gridRow},${u.gridCol}`).join(',')}`;
        if (stageKey !== lastStageKey) {
          lastStageKey = stageKey;
          lastProcessedEventIds = new Set(combat.events.map((e) => e.id));
          rebuildUnits(combat.units);
        }

        for (const ev of combat.events) {
          if (lastProcessedEventIds.has(ev.id)) continue;
          lastProcessedEventIds.add(ev.id);

          const actorNode = unitNodes.get(ev.actorUid);
          const targetNode = unitNodes.get(ev.targetUid);
          if (actorNode) {
            actorNode.lungeTimer = 0.22;
          }
          if (targetNode) {
            if (ev.type === 'crit' || ev.type === 'attack' || ev.type === 'combo' || ev.type === 'skill') {
              targetNode.hitTimer = 0.18;
              if (actorNode && actorNode !== targetNode) {
                spawnSlash(
                  actorNode.baseX,
                  actorNode.baseY - 14,
                  targetNode.baseX,
                  targetNode.baseY - 14,
                  ev.type === 'crit' ? '#fbbf24' : '#38bdf8'
                );
              }
            }
            if (ev.type === 'crit' || ev.type === 'skill') shakeTimer = 0.16;

            const colorMap: Record<string, string> = {
              attack: '#f8fafc',
              crit: '#fbbf24',
              combo: '#38bdf8',
              skill: '#c084fc',
              heal: '#4ade80',
              shield: '#2dd4bf',
              dodge: '#a3e635',
              stun: '#facc15',
            };
            spawnFloater(
              targetNode.baseX,
              targetNode.baseY,
              ev.text,
              colorMap[ev.type] ?? '#ffffff',
              ev.type === 'crit' || ev.type === 'skill'
            );
          }
        }

        combat.units.forEach((u) => {
          const node = unitNodes.get(u.uid);
          if (!node) return;

          node.rig.root.alpha = u.hp > 0 ? 1 : 0.2;
          node.rig.stunMark.visible = u.stunned && u.hp > 0;
          node.rig.chargeMark.visible = Boolean(u.chargingUlt) && u.hp > 0;

          const ratio = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)));
          node.hpFill.clear();
          if (ratio > 0) {
            node.hpFill.rect(-23, -55, 46 * ratio, 3).fill(u.isPlayerSide ? '#4ade80' : '#f43f5e');
          }
          if (u.shield > 0) {
            const shieldRatio = Math.min(1, u.shield / Math.max(1, u.maxHp));
            node.hpFill.rect(-23, -58, 46 * shieldRatio, 2).fill('#38bdf8');
          }

          if (node.lungeTimer > 0) {
            node.lungeTimer -= dt;
            const dir = u.isPlayerSide ? 1 : -1;
            node.rig.root.x = node.baseX + dir * Math.sin((node.lungeTimer / 0.22) * Math.PI) * 26;
            node.rig.sprite.texture = node.rig.frames[3] ?? node.rig.frames[0];
          } else if (node.hitTimer > 0) {
            node.hitTimer -= dt;
            node.rig.root.x = node.baseX + Math.sin(elapsed * 60) * 4;
          } else {
            node.rig.root.x = node.baseX;
            node.rig.sprite.texture = node.rig.frames[Math.floor(elapsed * 3) % 2] ?? node.rig.frames[0];
          }
        });

        for (let i = slashes.length - 1; i >= 0; i--) {
          const sl = slashes[i];
          sl.life -= dt;
          sl.g.x += sl.vx * dt;
          sl.g.y += sl.vy * dt;
          if (sl.life <= 0) {
            fxLayer.removeChild(sl.g);
            sl.g.destroy();
            slashes.splice(i, 1);
          }
        }

        for (let i = floaters.length - 1; i >= 0; i--) {
          const f = floaters[i];
          f.life -= dt;
          f.text.x += f.vx * dt;
          f.text.y += f.vy * dt;
          f.vy += 45 * dt;
          f.text.alpha = Math.min(1, f.life * 1.6);
          if (f.life <= 0) {
            fxLayer.removeChild(f.text);
            f.text.destroy();
            floaters.splice(i, 1);
          }
        }

        if (shakeTimer > 0) {
          shakeTimer -= dt;
          arenaRoot.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
        } else {
          arenaRoot.position.set(0, 0);
        }
      });
    })();

    return () => {
      destroyed = true;
      if (initialized) {
        app.destroy(true, { children: true });
      }
    };
  }, []);

  return <div ref={hostRef} className="w-full h-full relative" />;
};
