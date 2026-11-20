import { Texture } from 'pixi.js';
import { BuildingId } from '../core/types';

const textureCache = new Map<string, Texture>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function getOrCreate(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
  const hit = textureCache.get(key);
  if (hit) return hit;
  const [canvas, ctx] = makeCanvas(w, h);
  draw(ctx);
  const tex = Texture.from(canvas);
  textureCache.set(key, tex);
  return tex;
}

function drawLeafPuff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  dark: string,
  mid: string,
  light: string
) {
  ctx.save();
  // 深层暗部轮廓
  const grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.12, x, y, r);
  grad.addColorStop(0, light);
  grad.addColorStop(0.55, mid);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;

  ctx.beginPath();
  const lobes = 9;
  for (let i = 0; i <= lobes * 2; i++) {
    const a = (i / (lobes * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? r : r * 0.86;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad * 0.84;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.quadraticCurveTo(x + Math.cos(a - 0.15) * rad * 1.04, y + Math.sin(a - 0.15) * rad * 0.88, px, py);
  }
  ctx.closePath();
  ctx.fill();

  // 顶部受光边缘高光
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, Math.PI * 1.1, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();
}

export function getSpiritTreeTexture(treeLevel: number): Texture {
  const tier = treeLevel >= 7 ? 2 : treeLevel >= 4 ? 1 : 0;
  return getOrCreate(`spirit_tree_${tier}_${Math.min(10, treeLevel)}`, 360, 380, (ctx) => {
    const cx = 180;
    const baseY = 335;

    // 树下灵脉光晕
    const groundGlow = ctx.createRadialGradient(cx, baseY, 10, cx, baseY, 115);
    groundGlow.addColorStop(0, tier === 2 ? 'rgba(251,191,36,0.45)' : 'rgba(56,189,248,0.38)');
    groundGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = groundGlow;
    ctx.beginPath();
    ctx.ellipse(cx, baseY, 115, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // 盘根错节的主树干
    const barkGrad = ctx.createLinearGradient(cx - 45, baseY, cx + 45, baseY - 170);
    barkGrad.addColorStop(0, '#451a03');
    barkGrad.addColorStop(0.45, '#78350f');
    barkGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = barkGrad;

    ctx.beginPath();
    ctx.moveTo(cx - 58, baseY + 6);
    ctx.quadraticCurveTo(cx - 26, baseY - 35, cx - 26, baseY - 120);
    ctx.quadraticCurveTo(cx - 28, baseY - 165, cx - 64, baseY - 205);
    ctx.lineTo(cx - 38, baseY - 210);
    ctx.quadraticCurveTo(cx - 12, baseY - 172, cx - 4, baseY - 155);
    ctx.quadraticCurveTo(cx + 8, baseY - 185, cx + 48, baseY - 215);
    ctx.lineTo(cx + 68, baseY - 202);
    ctx.quadraticCurveTo(cx + 26, baseY - 165, cx + 28, baseY - 115);
    ctx.quadraticCurveTo(cx + 28, baseY - 35, cx + 62, baseY + 8);
    ctx.quadraticCurveTo(cx + 20, baseY - 6, cx, baseY + 4);
    ctx.quadraticCurveTo(cx - 20, baseY - 6, cx - 58, baseY + 6);
    ctx.closePath();
    ctx.fill();

    // 树皮纹理与青苔
    ctx.strokeStyle = 'rgba(28,12,2,0.55)';
    ctx.lineWidth = 2.5;
    for (const ox of [-14, -3, 9, 20]) {
      ctx.beginPath();
      ctx.moveTo(cx + ox, baseY - 10);
      ctx.bezierCurveTo(cx + ox - 6, baseY - 55, cx + ox + 5, baseY - 95, cx + ox * 0.6, baseY - 140);
      ctx.stroke();
    }

    // 树干灵纹发光脉络
    ctx.save();
    ctx.shadowColor = tier === 2 ? '#fbbf24' : '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = tier === 2 ? '#fef08a' : '#7dd3fc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 22, baseY - 8);
    ctx.quadraticCurveTo(cx - 5, baseY - 60, cx + 2, baseY - 115);
    ctx.quadraticCurveTo(cx + 12, baseY - 155, cx + 32, baseY - 185);
    ctx.stroke();
    ctx.restore();

    // 树冠色板（随等级从苍翠 -> 碧玉 -> 黄金神树）
    const palette =
      tier === 2
        ? { dark: '#92400e', mid: '#f59e0b', light: '#fef08a' }
        : tier === 1
          ? { dark: '#064e3b', mid: '#14b8a6', light: '#99f6e4' }
          : { dark: '#064e3b', mid: '#16a34a', light: '#86efac' };

    // 后景暗层树冠
    drawLeafPuff(ctx, cx - 84, 152, 54, '#022c22', palette.dark, palette.mid);
    drawLeafPuff(ctx, cx + 84, 154, 52, '#022c22', palette.dark, palette.mid);
    // 中层饱满树冠
    drawLeafPuff(ctx, cx - 56, 128, 62, palette.dark, palette.mid, palette.light);
    drawLeafPuff(ctx, cx + 56, 130, 60, palette.dark, palette.mid, palette.light);
    drawLeafPuff(ctx, cx, 94, 72, palette.dark, palette.mid, palette.light);
    // 前景受光面树冠
    drawLeafPuff(ctx, cx - 28, 146, 48, palette.dark, palette.mid, palette.light);
    drawLeafPuff(ctx, cx + 30, 144, 46, palette.dark, palette.mid, palette.light);

    // 悬挂仙果与法宝光球
    const spots = [
      [cx - 72, 165],
      [cx + 68, 162],
      [cx - 22, 125],
      [cx + 28, 118],
      [cx - 48, 102],
      [cx + 46, 98],
    ];
    const count = Math.min(spots.length, 3 + Math.floor(treeLevel / 2));
    for (let i = 0; i < count; i++) {
      const [fx, fy] = spots[i];
      ctx.save();
      const glow = ctx.createRadialGradient(fx, fy, 2, fx, fy, 16);
      glow.addColorStop(0, i % 2 === 0 ? 'rgba(253,224,71,0.95)' : 'rgba(244,114,182,0.95)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(fx, fy, 16, 0, Math.PI * 2);
      ctx.fill();

      // 灵果本体
      const fg = ctx.createRadialGradient(fx - 2, fy - 2, 1, fx, fy, 7);
      fg.addColorStop(0, '#ffffff');
      fg.addColorStop(0.35, i % 2 === 0 ? '#fde047' : '#f472b6');
      fg.addColorStop(1, i % 2 === 0 ? '#ca8a04' : '#be185d');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(fx, fy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

export function getBuildingTexture(id: BuildingId, level: number): Texture {
  const stage = level >= 9 ? 3 : level >= 6 ? 2 : level >= 3 ? 1 : 0;
  return getOrCreate(`bld_${id}_${stage}`, 220, 220, (ctx) => {
    const cx = 110;
    const baseY = 165;

    // 地面投影
    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 12, 62, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    if (id === 'spiritArray') {
      const glowColor = stage >= 3 ? '#fbbf24' : stage >= 2 ? '#c084fc' : '#38bdf8';
      // 雕刻石台底座
      const stoneG = ctx.createLinearGradient(cx - 56, baseY - 12, cx + 56, baseY + 16);
      stoneG.addColorStop(0, '#475569');
      stoneG.addColorStop(0.5, '#94a3b8');
      stoneG.addColorStop(1, '#334155');
      ctx.fillStyle = stoneG;
      ctx.beginPath();
      ctx.ellipse(cx, baseY + 4, 56, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 2, 52, 17, 0, 0, Math.PI * 2);
      ctx.fill();

      // 发光八卦符文阵法环
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 2, 42, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 2, 26, 8, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 悬浮晶石
      const crystalCount = stage >= 2 ? 3 : 1;
      for (let i = 0; i < crystalCount; i++) {
        const ox = crystalCount === 1 ? 0 : (i - 1) * 26;
        const oy = crystalCount === 1 ? -54 : i === 1 ? -68 : -44;
        const sc = i === 1 || crystalCount === 1 ? 1.15 : 0.78;
        const cy = baseY + oy;
        const cg = ctx.createLinearGradient(cx + ox - 12, cy - 28, cx + ox + 12, cy + 20);
        cg.addColorStop(0, '#ffffff');
        cg.addColorStop(0.4, glowColor);
        cg.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(cx + ox, cy - 28 * sc);
        ctx.lineTo(cx + ox + 13 * sc, cy);
        ctx.lineTo(cx + ox, cy + 22 * sc);
        ctx.lineTo(cx + ox - 13 * sc, cy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (id === 'springPool') {
      // 汉白玉石池壁
      const marble = ctx.createLinearGradient(cx - 58, baseY - 10, cx + 58, baseY + 18);
      marble.addColorStop(0, '#cbd5e1');
      marble.addColorStop(0.5, '#f8fafc');
      marble.addColorStop(1, '#64748b');
      ctx.fillStyle = marble;
      ctx.beginPath();
      ctx.ellipse(cx, baseY + 3, 58, 21, 0, 0, Math.PI * 2);
      ctx.fill();

      // 碧玉灵泉水面
      const water = ctx.createRadialGradient(cx, baseY - 2, 4, cx, baseY - 2, 48);
      water.addColorStop(0, '#a7f3d0');
      water.addColorStop(0.55, '#14b8a6');
      water.addColorStop(1, '#0f766e');
      ctx.fillStyle = water;
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 2, 48, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // 假山与灵泉瀑布
      const rock = ctx.createLinearGradient(cx - 18, baseY - 58, cx + 22, baseY - 4);
      rock.addColorStop(0, '#94a3b8');
      rock.addColorStop(1, '#334155');
      ctx.fillStyle = rock;
      ctx.beginPath();
      ctx.moveTo(cx - 24, baseY - 4);
      ctx.lineTo(cx - 12, baseY - 48 - stage * 5);
      ctx.lineTo(cx + 8, baseY - 54 - stage * 6);
      ctx.lineTo(cx + 26, baseY - 4);
      ctx.closePath();
      ctx.fill();

      // 垂落仙瀑
      ctx.save();
      ctx.shadowColor = '#5eead4';
      ctx.shadowBlur = 10;
      const wf = ctx.createLinearGradient(cx, baseY - 44, cx, baseY + 2);
      wf.addColorStop(0, '#ecfeff');
      wf.addColorStop(1, '#2dd4bf');
      ctx.fillStyle = wf;
      ctx.beginPath();
      ctx.roundRect(cx - 6, baseY - 42 - stage * 4, 12, 42 + stage * 4, 4);
      ctx.fill();
      ctx.restore();

      // 粉色仙莲
      for (const [lx, ly] of [
        [cx - 24, baseY + 1],
        [cx + 26, baseY + 3],
      ]) {
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(lx, ly + 2, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(lx - 3, ly, 4.5, 0, Math.PI * 2);
        ctx.arc(lx + 3, ly, 4.5, 0, Math.PI * 2);
        ctx.arc(lx, ly - 3, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(lx, ly, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'alchemyFurnace') {
      // 炉火光芒
      ctx.save();
      const fireGlow = ctx.createRadialGradient(cx, baseY - 4, 2, cx, baseY - 4, 40);
      fireGlow.addColorStop(0, 'rgba(251,146,60,0.85)');
      fireGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fireGlow;
      ctx.beginPath();
      ctx.arc(cx, baseY - 4, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 三足鼎脚
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(cx - 28, baseY - 18, 9, 24, 4);
      ctx.roundRect(cx + 19, baseY - 18, 9, 24, 4);
      ctx.roundRect(cx - 4, baseY - 12, 8, 22, 4);
      ctx.fill();

      // 紫金炉腹（金属高光渐变）
      const bronze = ctx.createRadialGradient(cx - 12, baseY - 48, 6, cx, baseY - 38, 38);
      bronze.addColorStop(0, stage >= 2 ? '#fef08a' : '#fdba74');
      bronze.addColorStop(0.45, stage >= 2 ? '#d97706' : '#c2410c');
      bronze.addColorStop(1, '#431407');
      ctx.fillStyle = bronze;
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 36, 33, 27, 0, 0, Math.PI * 2);
      ctx.fill();

      // 双龙耳
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx - 33, baseY - 42, 9, Math.PI * 0.5, Math.PI * 1.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 33, baseY - 42, 9, -Math.PI * 0.6, Math.PI * 0.5);
      ctx.stroke();

      // 鼎盖与宝珠顶
      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 62, 24, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx, baseY - 72, 7, 0, Math.PI * 2);
      ctx.fill();

      // 炉火舌
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(cx - 12, baseY + 2);
      ctx.quadraticCurveTo(cx, baseY - 18, cx + 12, baseY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cx, baseY - 2, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'beastGarden') {
      // 台阶石基
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.roundRect(cx - 46, baseY - 8, 92, 16, 4);
      ctx.fill();

      // 朱红立柱与白墙
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(cx - 34, baseY - 52, 68, 44);
      ctx.fillStyle = '#991b1b';
      for (const px of [-36, -14, 10, 32]) {
        ctx.fillRect(cx + px, baseY - 54, 5, 46);
      }
      // 拱形木门
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(cx - 10, baseY - 34, 20, 26, [10, 10, 0, 0]);
      ctx.fill();

      // 双层飞檐琉璃瓦屋顶
      const roofGrad = ctx.createLinearGradient(cx, baseY - 96, cx, baseY - 48);
      roofGrad.addColorStop(0, stage >= 2 ? '#fbbf24' : '#38bdf8');
      roofGrad.addColorStop(1, stage >= 2 ? '#92400e' : '#1e3a8a');
      ctx.fillStyle = roofGrad;
      ctx.beginPath();
      ctx.moveTo(cx - 56, baseY - 46);
      ctx.quadraticCurveTo(cx - 28, baseY - 58, cx, baseY - 84 - stage * 4);
      ctx.quadraticCurveTo(cx + 28, baseY - 58, cx + 56, baseY - 46);
      ctx.quadraticCurveTo(cx, baseY - 40, cx - 56, baseY - 46);
      ctx.closePath();
      ctx.fill();

      // 檐角红灯笼
      for (const lx of [cx - 42, cx + 42]) {
        ctx.save();
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(lx, baseY - 36, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  });
}

export function getCharacterBodyTexture(options: {
  key: string;
  name?: string;
  primaryColor: string;
  accentColor: string;
  isEnemy?: boolean;
  isBoss?: boolean;
  isHero?: boolean;
  role?: string;
}): Texture {
  const texKey = `char_v2_${options.key}_${options.name ?? ''}_${options.primaryColor}_${options.isEnemy ? 'e' : 'p'}`;
  return getOrCreate(texKey, 180, 190, (ctx) => {
    const cx = 90;
    const cy = 114;

    // 脚底投影
    ctx.fillStyle = 'rgba(2, 6, 23, 0.5)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 44, 34, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1) 特殊造型：玄甲灵龟（真·灵龟护法）
    if (options.key.includes('turtle')) {
      // 后背六边形龟甲
      const shellG = ctx.createRadialGradient(cx - 8, cy - 8, 6, cx, cy, 42);
      shellG.addColorStop(0, '#5eead4');
      shellG.addColorStop(0.5, '#0d9488');
      shellG.addColorStop(1, '#134e4a');
      ctx.fillStyle = shellG;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx - 4, cy + 2, 34, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 龟甲发光玄纹
      ctx.strokeStyle = '#99f6e4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 10);
      ctx.lineTo(cx - 4, cy - 20);
      ctx.lineTo(cx + 10, cy - 10);
      ctx.lineTo(cx + 10, cy + 12);
      ctx.lineTo(cx - 4, cy + 22);
      ctx.lineTo(cx - 18, cy + 12);
      ctx.closePath();
      ctx.stroke();

      // 前胸金甲腹盾
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.ellipse(cx + 8, cy + 12, 20, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Q版灵龟大头
      const headG = ctx.createRadialGradient(cx + 10, cy - 34, 4, cx + 14, cy - 28, 24);
      headG.addColorStop(0, '#a7f3d0');
      headG.addColorStop(1, '#059669');
      ctx.fillStyle = headG;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx + 14, cy - 28, 21, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 红色武士头带
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.roundRect(cx - 6, cy - 41, 40, 7, 3);
      ctx.fill();

      // 大眼睛
      for (const ex of [cx + 8, cx + 22]) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(ex, cy - 26, 3.5, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 1, cy - 28, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // 2) 特殊造型：敌方毒蟒妖兽
    if (options.isEnemy && options.name?.includes('蟒')) {
      const snakeG = ctx.createLinearGradient(cx - 25, cy - 55, cx + 25, cy + 40);
      snakeG.addColorStop(0, '#6ee7b7');
      snakeG.addColorStop(0.5, '#059669');
      snakeG.addColorStop(1, '#064e3b');
      ctx.fillStyle = snakeG;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;

      // 盘踞蛇身
      ctx.beginPath();
      ctx.ellipse(cx + 2, cy + 28, 36, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy + 12, 26, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 眼镜蛇颈兜帽与昂起蛇头
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy + 8);
      ctx.quadraticCurveTo(cx - 34, cy - 22, cx - 10, cy - 48);
      ctx.quadraticCurveTo(cx + 12, cy - 58, cx + 22, cy - 36);
      ctx.quadraticCurveTo(cx + 30, cy - 12, cx + 10, cy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 腹鳞斑纹与竖瞳毒眼
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.ellipse(cx - 10, cy - 32, 5, 3, 0.2, 0, Math.PI * 2);
      ctx.ellipse(cx + 8, cy - 32, 5, 3, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx - 11, cy - 35, 2, 6);
      ctx.fillRect(cx + 7, cy - 35, 2, 6);
      return;
    }

    // 背后仙气飘带 / 妖王披风
    if (options.isHero) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 6);
      ctx.quadraticCurveTo(cx - 42, cy - 16, cx - 44, cy + 16);
      ctx.stroke();
      ctx.restore();
    } else if (options.isBoss || options.isEnemy) {
      ctx.fillStyle = options.isBoss ? '#7f1d1d' : '#334155';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy - 16);
      ctx.lineTo(cx + 38, cy - 8);
      ctx.lineTo(cx + 46, cy + 36);
      ctx.lineTo(cx - 20, cy + 34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 躯干与层叠道袍/铠甲（高光-阴影立体渐变 + 描边）
    const robeGrad = ctx.createLinearGradient(cx - 24, cy - 16, cx + 24, cy + 40);
    robeGrad.addColorStop(0, options.primaryColor);
    robeGrad.addColorStop(1, options.accentColor);
    ctx.fillStyle = robeGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - 14);
    ctx.lineTo(cx + 18, cy - 14);
    ctx.quadraticCurveTo(cx + 28, cy + 20, cx + 24, cy + 38);
    ctx.quadraticCurveTo(cx, cy + 44, cx - 24, cy + 38);
    ctx.quadraticCurveTo(cx - 28, cy + 20, cx - 18, cy - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 交领仙袍纹理与金色束腰
    if (!options.isEnemy) {
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 11, cy - 13);
      ctx.lineTo(cx + 2, cy + 6);
      ctx.lineTo(cx + 12, cy - 13);
      ctx.stroke();
    } else {
      // 妖甲肩刺
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 10);
      ctx.lineTo(cx - 34, cy - 22);
      ctx.lineTo(cx - 14, cy + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = options.isEnemy ? '#b45309' : '#fef08a';
    ctx.beginPath();
    ctx.roundRect(cx - 21, cy + 10, 42, 7, 3);
    ctx.fill();
    ctx.fillStyle = options.isEnemy ? '#ef4444' : '#2dd4bf';
    ctx.beginPath();
    ctx.arc(cx, cy + 16, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Q版圆润大头（带肤色径向立体渐变 + 描边）
    const headY = cy - 36;
    if (options.isEnemy) {
      // 狼耳/魔王角
      ctx.fillStyle = options.accentColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(cx - 18, headY - 12);
      ctx.lineTo(cx - 32, headY - 42);
      ctx.lineTo(cx - 6, headY - 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 18, headY - 12);
      ctx.lineTo(cx + 32, headY - 42);
      ctx.lineTo(cx + 6, headY - 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const furGrad = ctx.createRadialGradient(cx - 8, headY - 8, 4, cx, headY, 28);
      furGrad.addColorStop(0, options.primaryColor);
      furGrad.addColorStop(1, options.accentColor);
      ctx.fillStyle = furGrad;
      ctx.beginPath();
      ctx.arc(cx, headY, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 凶猛獠牙嘴与发光眼
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(cx - 11, headY + 9, 22, 7, 3);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(cx - 8, headY + 14);
      ctx.lineTo(cx - 5, headY + 7);
      ctx.lineTo(cx - 2, headY + 14);
      ctx.moveTo(cx + 2, headY + 14);
      ctx.lineTo(cx + 5, headY + 7);
      ctx.lineTo(cx + 8, headY + 14);
      ctx.fill();

      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(cx - 9, headY - 2, 5.5, 3.5, 0.28, 0, Math.PI * 2);
      ctx.ellipse(cx + 9, headY - 2, 5.5, 3.5, -0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      const skinGrad = ctx.createRadialGradient(cx - 6, headY - 6, 4, cx, headY, 26);
      skinGrad.addColorStop(0, '#fffbeb');
      skinGrad.addColorStop(0.65, '#fde68a');
      skinGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = skinGrad;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(cx, headY, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
      ctx.beginPath();
      ctx.ellipse(cx - 12, headY + 6, 4.5, 2.5, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 12, headY + 6, 4.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, headY - 4, 25, Math.PI * 0.96, Math.PI * 2.04);
      ctx.lineTo(cx + 18, headY - 2);
      ctx.quadraticCurveTo(cx + 8, headY - 12, cx, headY - 4);
      ctx.quadraticCurveTo(cx - 8, headY - 12, cx - 18, headY - 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, headY - 30, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = options.primaryColor;
      ctx.beginPath();
      ctx.roundRect(cx - 6, headY - 33, 12, 5, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, headY - 4, 19, Math.PI * 1.2, Math.PI * 1.75);
      ctx.stroke();

      for (const ex of [cx - 8, cx + 9]) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(ex, headY + 1, 3.8, 4.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 1, headY - 1, 1.5, 0, Math.PI * 2);
        ctx.arc(ex + 1, headY + 2, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      if (options.role === 'healer') {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 12, headY - 22);
        ctx.lineTo(cx - 20, headY - 38);
        ctx.moveTo(cx + 12, headY - 22);
        ctx.lineTo(cx + 20, headY - 38);
        ctx.stroke();
      }
    }
  });
}

export function getWeaponTexture(options: { isEnemy?: boolean; role?: string; color: string }): Texture {
  return getOrCreate(`wpn_${options.isEnemy ? 'e' : 'p'}_${options.role ?? 'sword'}_${options.color}`, 64, 96, (ctx) => {
    const cx = 32;
    const baseY = 82;
    ctx.save();
    ctx.shadowColor = options.color;
    ctx.shadowBlur = 10;

    if (options.isEnemy) {
      // 妖魔重戟/战斧
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 2.5, 16, 5, 66);
      const blade = ctx.createLinearGradient(cx - 18, 10, cx + 14, 38);
      blade.addColorStop(0, '#f87171');
      blade.addColorStop(1, '#475569');
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.moveTo(cx, 8);
      ctx.quadraticCurveTo(cx - 22, 20, cx - 14, 42);
      ctx.lineTo(cx, 32);
      ctx.closePath();
      ctx.fill();
    } else if (options.role === 'healer') {
      // 翡翠灵杖
      ctx.fillStyle = '#92400e';
      ctx.fillRect(cx - 2.5, 22, 5, 60);
      const orb = ctx.createRadialGradient(cx - 2, 18, 2, cx, 18, 11);
      orb.addColorStop(0, '#ffffff');
      orb.addColorStop(0.4, '#4ade80');
      orb.addColorStop(1, '#065f46');
      ctx.fillStyle = orb;
      ctx.beginPath();
      ctx.arc(cx, 18, 10, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 发光仙剑
      const blade = ctx.createLinearGradient(cx - 6, 8, cx + 6, 62);
      blade.addColorStop(0, '#ffffff');
      blade.addColorStop(0.5, '#7dd3fc');
      blade.addColorStop(1, '#0284c7');
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.moveTo(cx, 6);
      ctx.lineTo(cx + 6, 22);
      ctx.lineTo(cx + 4, 62);
      ctx.lineTo(cx - 4, 62);
      ctx.lineTo(cx - 6, 22);
      ctx.closePath();
      ctx.fill();

      // 金色护手与剑柄
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(cx - 12, 60, 24, 5, 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 2.5, 65, 5, 16);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx, baseY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}
