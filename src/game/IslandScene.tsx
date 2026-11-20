import React, { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import { BUILDINGS } from '../data/buildings';
import { BuildingId } from '../core/types';
import { useGameStore } from '../store/gameStore';
import {
  CharacterRig,
  createCharacterRig,
  drawBuildingVisual,
  drawSpiritTree,
  getPixelAsset,
  getTileTexture,
  preloadGameSprites,
} from './SpriteFactory';

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface FloatingBanner {
  t: Text;
  vy: number;
  life: number;
}

const TILE_W = 86;
const TILE_H = 54;
const GRID_W = 6;
const GRID_H = 4;

function gridToLocal(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - (GRID_W - 1) / 2) * TILE_W,
    y: (gy - (GRID_H - 1) / 2) * TILE_H - 12,
  };
}

export const IslandScene: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chopTree = useGameStore((s) => s.chopTree);
  const collectBuilding = useGameStore((s) => s.collectBuilding);
  const selectSandboxTile = useGameStore((s) => s.selectSandboxTile);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    let initialized = false;
    const app = new Application();

    const particles: Particle[] = [];
    const banners: FloatingBanner[] = [];
    const discipleRigs = new Map<string, CharacterRig>();
    const buildingCache = new Map<string, { root: Container; visual: Container; badge: Text; lastLevel: number }>();

    let chopAnimTimer = 0;
    let treeShakeTimer = 0;
    let lightningTimer = 0;
    let lastCueId = useGameStore.getState().fxCue?.id ?? 0;
    let lastTreeLv = -1;
    let lastTilesKey = '';

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

      const stage = app.stage;

      // 1. 统一像素仙山云海背景
      const bgLayer = new Container();
      stage.addChild(bgLayer);
      const bgSprite = new Sprite(getPixelAsset('bgIsland'));
      bgSprite.anchor.set(0.5);
      bgLayer.addChild(bgSprite);

      // 2. 浮空主仙岛沙盘容器
      const islandRoot = new Container();
      stage.addChild(islandRoot);

      const cliffSprite = new Sprite(getPixelAsset('islandCliff'));
      cliffSprite.anchor.set(0.5, 0.14);
      cliffSprite.scale.set(2.5);
      islandRoot.addChild(cliffSprite);

      const tilesLayer = new Container();
      islandRoot.addChild(tilesLayer);

      const selectHighlight = new Graphics();
      islandRoot.addChild(selectHighlight);

      const objectsLayer = new Container();
      islandRoot.addChild(objectsLayer);

      // 中央太古灵树
      const treeHitArea = new Container();
      treeHitArea.eventMode = 'static';
      treeHitArea.cursor = 'pointer';
      treeHitArea.on('pointerdown', () => chopTree());
      objectsLayer.addChild(treeHitArea);

      const treeVisual = new Container();
      treeHitArea.addChild(treeVisual);

      const treeTitle = new Text({
        text: '太古灵树 Lv.1',
        style: { fontSize: 11, fontWeight: 'bold', fill: '#fef08a', stroke: { color: '#020617', width: 3.5 } },
      });
      treeTitle.anchor.set(0.5);
      treeTitle.position.set(0, 14);
      treeHitArea.addChild(treeTitle);

      // 主角像素剑修
      const heroRig = createCharacterRig({
        key: 'hero',
        primaryColor: '#38bdf8',
        accentColor: '#1e3a8a',
        isHero: true,
        scale: 0.95,
      });
      objectsLayer.addChild(heroRig.root);

      // 弟子层与攻岛妖兽
      const disciplesLayer = new Container();
      islandRoot.addChild(disciplesLayer);

      const raidEnemyRig = createCharacterRig({
        key: 'enemy_boss',
        primaryColor: '#ef4444',
        accentColor: '#7f1d1d',
        isEnemy: true,
        isBoss: true,
        scale: 0.95,
      });
      raidEnemyRig.root.visible = false;
      islandRoot.addChild(raidEnemyRig.root);

      const fxLayer = new Container();
      stage.addChild(fxLayer);

      const lightningOverlay = new Graphics();
      stage.addChild(lightningOverlay);

      const spawnParticles = (x: number, y: number, color: string, count: number) => {
        for (let i = 0; i < count; i++) {
          const p = new Graphics();
          p.rect(-2, -2, 4, 4).fill(color);
          p.position.set(x, y);
          fxLayer.addChild(p);
          const angle = Math.random() * Math.PI * 2;
          const speed = 45 + Math.random() * 90;
          particles.push({
            g: p,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 45,
            life: 0.55 + Math.random() * 0.35,
            maxLife: 0.9,
          });
        }
      };

      const spawnBanner = (x: number, y: number, text: string, color = '#fde047') => {
        const t = new Text({
          text,
          style: { fontSize: 14, fontWeight: 'bold', fill: color, stroke: { color: '#020617', width: 4 } },
        });
        t.anchor.set(0.5);
        t.position.set(x, y);
        fxLayer.addChild(t);
        banners.push({ t, vy: -40, life: 1.1 });
      };

      const rebuildTilesAndBuildings = () => {
        const state = useGameStore.getState();
        tilesLayer.removeChildren();
        // 清理旧建筑节点
        buildingCache.forEach((b) => objectsLayer.removeChild(b.root));
        buildingCache.clear();

        for (const tile of state.sandboxTiles) {
          const pos = gridToLocal(tile.x, tile.y);
          const sp = new Sprite(getTileTexture(tile.terrain, tile.unlocked));
          sp.anchor.set(0.5);
          sp.scale.set(2.58, 2.18);
          sp.position.set(pos.x, pos.y);
          sp.alpha = tile.unlocked ? 1 : 0.45;
          sp.eventMode = 'static';
          sp.cursor = 'pointer';
          sp.on('pointerdown', () => {
            if (tile.buildingId === 'spiritTree') {
              chopTree();
            } else if (tile.buildingId) {
              collectBuilding(tile.buildingId);
              selectSandboxTile(tile.x, tile.y);
            } else {
              selectSandboxTile(tile.x, tile.y);
            }
          });
          tilesLayer.addChild(sp);

          if (tile.buildingId === 'spiritTree') {
            treeHitArea.position.set(pos.x, pos.y - 6);
            const hPos = gridToLocal(tile.x - 0.68, tile.y + 0.15);
            heroRig.root.position.set(hPos.x, hPos.y);
          } else if (tile.buildingId) {
            const bid = tile.buildingId;
            const bRoot = new Container();
            bRoot.position.set(pos.x, pos.y - 4);
            bRoot.eventMode = 'static';
            bRoot.cursor = 'pointer';
            bRoot.on('pointerdown', () => {
              collectBuilding(bid);
              selectSandboxTile(tile.x, tile.y);
            });

            const visual = new Container();
            bRoot.addChild(visual);

            const label = new Text({
              text: BUILDINGS[bid].name,
              style: { fontSize: 10, fontWeight: 'bold', fill: '#fef3c7', stroke: { color: '#020617', width: 3 } },
            });
            label.anchor.set(0.5);
            label.position.set(0, 12);
            bRoot.addChild(label);

            const badge = new Text({
              text: '',
              style: { fontSize: 10, fontWeight: 'bold', fill: '#fde047', stroke: { color: '#020617', width: 3 } },
            });
            badge.anchor.set(0.5);
            badge.position.set(0, -42);
            bRoot.addChild(badge);

            objectsLayer.addChild(bRoot);
            buildingCache.set(bid, { root: bRoot, visual, badge, lastLevel: -1 });
          }
        }
      };

      const layoutScene = () => {
        const w = app.screen.width;
        const h = app.screen.height;
        const bgTex = getPixelAsset('bgIsland');
        const scale = Math.max(w / bgTex.width, h / bgTex.height);
        bgSprite.scale.set(scale);
        bgSprite.position.set(w * 0.5, h * 0.5);

        const fitScale = Math.min(1.05, w / 580, h / 370);
        islandRoot.scale.set(Math.max(0.54, fitScale));
      };

      rebuildTilesAndBuildings();
      layoutScene();
      app.renderer.on('resize', layoutScene);

      let elapsed = 0;
      app.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000;
        elapsed += dt;

        const state = useGameStore.getState();
        const w = app.screen.width;
        const h = app.screen.height;

        islandRoot.position.set(w * 0.5, h * 0.52 + Math.sin(elapsed * 1.3) * 3);

        const tilesKey = state.sandboxTiles.map((t) => `${t.unlocked ? 1 : 0}:${t.buildingId ?? '_'}`).join('|');
        if (tilesKey !== lastTilesKey) {
          lastTilesKey = tilesKey;
          rebuildTilesAndBuildings();
        }

        // 选中地块高亮框
        selectHighlight.clear();
        if (state.selectedTile) {
          const p = gridToLocal(state.selectedTile.x, state.selectedTile.y);
          selectHighlight
            .rect(p.x - TILE_W * 0.46, p.y - TILE_H * 0.44, TILE_W * 0.92, TILE_H * 0.88)
            .stroke({ width: 2.5, color: '#fbbf24' });
        }

        if (state.treeLevel !== lastTreeLv) {
          lastTreeLv = state.treeLevel;
          drawSpiritTree(treeVisual, state.treeLevel);
          treeTitle.text = `太古灵树 Lv.${state.treeLevel}`;
        }

        buildingCache.forEach((node, bid) => {
          const bState = state.buildings[bid as BuildingId];
          if (!bState) return;
          const lv = Math.max(1, bState.level);
          if (node.lastLevel !== lv) {
            node.lastLevel = lv;
            drawBuildingVisual(node.visual, bid as BuildingId, lv);
          }
          const isAuto = lv >= BUILDINGS[bid as BuildingId].autoUnlockLevel;
          if (isAuto) {
            node.badge.text = `Lv.${lv} 自动`;
            node.badge.style.fill = '#7dd3fc';
          } else {
            const stored = Math.floor(bState.storedAmount);
            node.badge.text = stored > 0 ? `收 +${stored}` : `Lv.${lv}`;
            node.badge.style.fill = stored > 0 ? '#fde047' : '#cbd5e1';
          }
        });

        // 同步宗门弟子像素巡逻动画
        state.disciples.forEach((d) => {
          let rig = discipleRigs.get(d.id);
          if (!rig) {
            rig = createCharacterRig({
              key: 'disciple',
              primaryColor: '#4ade80',
              accentColor: '#15803d',
              isDisciple: true,
              scale: 0.72,
            });
            disciplesLayer.addChild(rig.root);
            discipleRigs.set(d.id, rig);
          }
          const pos = gridToLocal(d.x - 0.5, d.y - 0.5);
          rig.root.position.set(pos.x, pos.y);
          const frameIdx = Math.floor(elapsed * 5) % 2 === 0 ? 1 : 2;
          rig.sprite.texture = rig.frames[frameIdx] ?? rig.frames[0];
          rig.sprite.scale.x = d.targetX >= d.x ? 1.85 : -1.85;
        });

        // 妖兽攻岛显示
        if (state.activeRaid) {
          raidEnemyRig.root.visible = true;
          const raidPos = gridToLocal(5.1, 1.5);
          raidEnemyRig.root.position.set(raidPos.x + Math.sin(elapsed * 4) * 8, raidPos.y);
          const fIdx = Math.floor(elapsed * 6) % 4;
          raidEnemyRig.sprite.texture = raidEnemyRig.frames[fIdx] ?? raidEnemyRig.frames[0];
        } else {
          raidEnemyRig.root.visible = false;
        }

        // 主角动画帧
        if (chopAnimTimer > 0) {
          chopAnimTimer -= dt;
          heroRig.sprite.texture = heroRig.frames[3] ?? heroRig.frames[0];
        } else {
          heroRig.sprite.texture = heroRig.frames[Math.floor(elapsed * 3) % 2] ?? heroRig.frames[0];
        }

        if (state.fxCue && state.fxCue.id !== lastCueId) {
          lastCueId = state.fxCue.id;
          const sc = islandRoot.scale.x;
          const treeWorldX = islandRoot.x + treeHitArea.x * sc;
          const treeWorldY = islandRoot.y + treeHitArea.y * sc;

          if (state.fxCue.type === 'chop' || state.fxCue.type === 'loot') {
            chopAnimTimer = 0.28;
            treeShakeTimer = 0.22;
            const colors = ['#cbd5e1', '#4ade80', '#38bdf8', '#c084fc', '#fbbf24', '#fb923c', '#f87171'];
            const pColor = colors[state.fxCue.quality ?? 0] ?? '#4ade80';
            spawnParticles(treeWorldX, treeWorldY - 12 * sc, pColor, 14);
            if (state.fxCue.text) {
              spawnBanner(treeWorldX, treeWorldY - 52 * sc, state.fxCue.text, pColor);
            }
          } else if (state.fxCue.type === 'breakthrough' || state.fxCue.type === 'breakthrough_fail') {
            lightningTimer = 0.75;
            spawnParticles(
              islandRoot.x + heroRig.root.x * sc,
              islandRoot.y + heroRig.root.y * sc,
              state.fxCue.type === 'breakthrough' ? '#c084fc' : '#ef4444',
              24
            );
            spawnBanner(
              islandRoot.x,
              islandRoot.y - 95 * sc,
              state.fxCue.text ?? '',
              state.fxCue.type === 'breakthrough' ? '#facc15' : '#f87171'
            );
          } else if (state.fxCue.type === 'collect' && state.fxCue.buildingId) {
            const bn = buildingCache.get(state.fxCue.buildingId)?.root;
            if (bn) {
              spawnParticles(islandRoot.x + bn.x * sc, islandRoot.y + bn.y * sc, '#fde047', 10);
              spawnBanner(islandRoot.x + bn.x * sc, islandRoot.y + bn.y * sc - 34 * sc, state.fxCue.text ?? '', '#4ade80');
            }
          }
        }

        if (treeShakeTimer > 0) {
          treeShakeTimer -= dt;
          treeVisual.x = Math.sin(elapsed * 65) * 4;
        } else {
          treeVisual.x = 0;
        }

        lightningOverlay.clear();
        if (lightningTimer > 0) {
          lightningTimer -= dt;
          lightningOverlay.rect(0, 0, w, h).fill({ color: '#581c87', alpha: lightningTimer * 0.25 });
          const sc = islandRoot.scale.x;
          const hx = islandRoot.x + heroRig.root.x * sc;
          const hy = islandRoot.y + heroRig.root.y * sc;
          lightningOverlay
            .moveTo(hx + (Math.random() - 0.5) * 24, 0)
            .lineTo(hx - 12, hy * 0.4)
            .lineTo(hx + 12, hy * 0.7)
            .lineTo(hx, hy - 10)
            .stroke({ width: 4, color: '#e9d5ff', alpha: Math.min(1, lightningTimer * 2) });
        }

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life -= dt;
          p.g.x += p.vx * dt;
          p.g.y += p.vy * dt;
          p.vy += 190 * dt;
          p.g.alpha = Math.max(0, p.life / p.maxLife);
          if (p.life <= 0) {
            fxLayer.removeChild(p.g);
            p.g.destroy();
            particles.splice(i, 1);
          }
        }

        for (let i = banners.length - 1; i >= 0; i--) {
          const b = banners[i];
          b.life -= dt;
          b.t.y += b.vy * dt;
          b.t.alpha = Math.min(1, b.life * 1.4);
          if (b.life <= 0) {
            fxLayer.removeChild(b.t);
            b.t.destroy();
            banners.splice(i, 1);
          }
        }
      });
    })();

    return () => {
      destroyed = true;
      if (initialized) {
        app.destroy(true, { children: true });
      }
    };
  }, [chopTree, collectBuilding, selectSandboxTile]);

  return <div ref={hostRef} className="w-full h-full relative" />;
};
