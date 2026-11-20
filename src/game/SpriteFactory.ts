import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { BuildingId } from '../core/types';
import { ELEMENT_META, ElementType } from '../data/elements';

export interface CharacterRig {
  root: Container;
  body: Container;
  sprite: Sprite;
  frames: Texture[];
  auraRing: Graphics;
  stunMark: Text;
  chargeMark: Text;
}

const PIXEL_PATHS = {
  bgIsland: './assets/pixel/px_bg_island.png',
  bgCombat: './assets/pixel/px_bg_combat.png',
  islandCliff: './assets/pixel/px_island_cliff.png',
  tileGrass: './assets/pixel/px_tile_grass.png',
  tileSpirit: './assets/pixel/px_tile_spirit.png',
  tileFarm: './assets/pixel/px_tile_farm.png',
  tileLocked: './assets/pixel/px_tile_locked.png',
  tree0: './assets/pixel/px_tree_0.png',
  tree1: './assets/pixel/px_tree_1.png',
  tree2: './assets/pixel/px_tree_2.png',
  spiritArray: './assets/pixel/px_bld_spiritArray.png',
  springPool: './assets/pixel/px_bld_springPool.png',
  alchemyFurnace: './assets/pixel/px_bld_alchemyFurnace.png',
  beastGarden: './assets/pixel/px_bld_beastGarden.png',
  herbFarm: './assets/pixel/px_bld_herbFarm.png',
  forge: './assets/pixel/px_bld_forge.png',
  thunderTower: './assets/pixel/px_bld_thunderTower.png',
  hero: './assets/pixel/px_hero.png',
  disciple: './assets/pixel/px_disciple.png',
  comp_turtle_guardian: './assets/pixel/px_comp_turtle.png',
  comp_qingluan_sword: './assets/pixel/px_comp_sword.png',
  comp_jade_deer: './assets/pixel/px_comp_deer.png',
  comp_thunder_bird: './assets/pixel/px_comp_thunder.png',
  comp_crimson_fox: './assets/pixel/px_comp_fox.png',
  enemy_wolf: './assets/pixel/px_enemy_wolf.png',
  enemy_snake: './assets/pixel/px_enemy_snake.png',
  enemy_boss: './assets/pixel/px_enemy_boss.png',
};

let preloadPromise: Promise<void> | null = null;
const loadedTex: Record<string, Texture> = {};
const sheetFrames: Record<string, Texture[]> = {};

function slice4Frames(tex: Texture): Texture[] {
  const frames: Texture[] = [];
  const fw = 32;
  const fh = 32;
  for (let i = 0; i < 4; i++) {
    frames.push(
      new Texture({
        source: tex.source,
        frame: new Rectangle(i * fw, 0, fw, fh),
      })
    );
  }
  return frames;
}

export async function preloadGameSprites(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = (async () => {
      const entries = Object.entries(PIXEL_PATHS);
      const textures = await Promise.all(entries.map(([, path]) => Assets.load<Texture>(path)));
      entries.forEach(([key], i) => {
        const tex = textures[i];
        tex.source.scaleMode = 'nearest';
        loadedTex[key] = tex;
        if (
          key === 'hero' ||
          key === 'disciple' ||
          key.startsWith('comp_') ||
          key.startsWith('enemy_')
        ) {
          sheetFrames[key] = slice4Frames(tex);
        }
      });
    })();
  }
  await preloadPromise;
}

export function getPixelAsset(key: keyof typeof PIXEL_PATHS): Texture {
  return loadedTex[key] ?? Texture.WHITE;
}

export function getTileTexture(terrain: 'grass' | 'spirit' | 'farm', unlocked: boolean): Texture {
  if (!unlocked) return loadedTex.tileLocked ?? Texture.WHITE;
  if (terrain === 'spirit') return loadedTex.tileSpirit ?? Texture.WHITE;
  if (terrain === 'farm') return loadedTex.tileFarm ?? Texture.WHITE;
  return loadedTex.tileGrass ?? Texture.WHITE;
}

function resolveFrames(options: {
  key?: string;
  name?: string;
  isEnemy?: boolean;
  isBoss?: boolean;
  isHero?: boolean;
  isDisciple?: boolean;
}): Texture[] {
  if (options.isDisciple) return sheetFrames.disciple ?? [Texture.WHITE];
  if (options.isHero) return sheetFrames.hero ?? [Texture.WHITE];
  if (options.key && sheetFrames[options.key]) return sheetFrames[options.key];
  if (options.isEnemy) {
    if (options.isBoss) return sheetFrames.enemy_boss ?? [Texture.WHITE];
    if (options.name?.includes('蟒')) return sheetFrames.enemy_snake ?? [Texture.WHITE];
    return sheetFrames.enemy_wolf ?? [Texture.WHITE];
  }
  return sheetFrames.hero ?? [Texture.WHITE];
}

export function createCharacterRig(options: {
  key?: string;
  name?: string;
  primaryColor: string;
  accentColor: string;
  element?: ElementType;
  isEnemy?: boolean;
  isBoss?: boolean;
  isHero?: boolean;
  isDisciple?: boolean;
  role?: string;
  scale?: number;
}): CharacterRig {
  const root = new Container();
  const s = options.scale ?? (options.isBoss ? 1.25 : 1.0);
  root.scale.set(s);

  const auraRing = new Graphics();
  const ringCol = options.element ? ELEMENT_META[options.element].color : options.isBoss ? '#ef4444' : options.primaryColor;
  auraRing.ellipse(0, 2, 20, 6).stroke({
    width: 2,
    color: ringCol,
    alpha: 0.78,
  });
  root.addChild(auraRing);

  const body = new Container();
  root.addChild(body);

  const frames = resolveFrames(options);
  const sprite = new Sprite(frames[0]);
  sprite.anchor.set(0.5, 0.92);
  // 32x32 像素精灵放大 2 倍呈 64x64 锐利像素点阵
  sprite.scale.set(1.85);
  body.addChild(sprite);

  const stunMark = new Text({
    text: '✦ 眩晕 ✦',
    style: { fontSize: 11, fontWeight: 'bold', fill: '#facc15', stroke: { color: '#020617', width: 3 } },
  });
  stunMark.anchor.set(0.5);
  stunMark.position.set(0, -64);
  stunMark.visible = false;
  root.addChild(stunMark);

  const chargeMark = new Text({
    text: '⚠ 蓄力大招!',
    style: { fontSize: 11, fontWeight: 'bold', fill: '#f87171', stroke: { color: '#020617', width: 3 } },
  });
  chargeMark.anchor.set(0.5);
  chargeMark.position.set(0, -76);
  chargeMark.visible = false;
  root.addChild(chargeMark);

  return { root, body, sprite, frames, auraRing, stunMark, chargeMark };
}

export function drawSpiritTree(container: Container, treeLevel: number): void {
  container.removeChildren();
  const tierKey = treeLevel >= 7 ? 'tree2' : treeLevel >= 4 ? 'tree1' : 'tree0';
  const scaleBonus = Math.min(1.2, 0.98 + (treeLevel - 1) * 0.025);
  const sprite = new Sprite(loadedTex[tierKey] ?? Texture.WHITE);
  sprite.anchor.set(0.5, 0.92);
  sprite.scale.set(1.5 * scaleBonus);
  container.addChild(sprite);
}

export function drawBuildingVisual(container: Container, id: BuildingId, level: number): void {
  container.removeChildren();
  const scaleTier = level >= 9 ? 1.55 : level >= 6 ? 1.48 : level >= 3 ? 1.4 : 1.32;
  const sprite = new Sprite(loadedTex[id] ?? Texture.WHITE);
  sprite.anchor.set(0.5, 0.88);
  sprite.scale.set(scaleTier);
  container.addChild(sprite);
}
