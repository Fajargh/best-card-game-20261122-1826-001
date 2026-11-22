// The canvas renderer for Ember Sigils: title, table, cards, win and loss screens.
// One job: paint the game state. It never changes the rules.
import { ELEMENTS, MAX_LIFE, PLAYER_COLOR, RIVAL_COLOR, VIEW } from './config.js';
import { PHASE_OVER, PHASE_RIVAL } from './state.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

const CARD_W = 140;
const CARD_H = 196;
const BACK_W = 62;
const BACK_H = 88;
const END_TURN = { x: 1120, y: 648, w: 128, h: 52 };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawElementGlyph(ctx, element, cx, cy, size, alpha = 1) {
  const el = ELEMENTS[element];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = el.color;
  ctx.strokeStyle = el.dark;
  ctx.lineWidth = 2;
  const s = size / 2;
  ctx.beginPath();
  if (element === 'flame') {
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s, cy + s);
    ctx.lineTo(cx - s, cy + s);
  } else if (element === 'tide') {
    ctx.arc(cx, cy, s, 0, Math.PI * 2);
  } else if (element === 'leaf') {
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s, cy);
  } else {
    ctx.rect(cx - s, cy - s, size, size);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** The rectangle of the player's i-th hand card, in canvas coordinates. */
export function playerCardRect(game, index) {
  const hand = game.player.hand;
  const count = hand.length;
  const gap = Math.min(150, (VIEW.width - 320) / Math.max(1, count));
  const total = gap * (count - 1) + CARD_W;
  const startX = (VIEW.width - total) / 2;
  const centre = (count - 1) / 2;
  const x = startX + gap * index;
  const y = 560 + Math.abs(index - centre) * 6;
  return { x, y, w: CARD_W, h: CARD_H, rot: (index - centre) * 0.04 };
}

export function endTurnRect() {
  return END_TURN;
}

function drawCardFace(ctx, card, x, y, w, h, opts = {}) {
  const el = ELEMENTS[card.element];
  const lift = opts.lift || 0;
  const scale = opts.scale || 1;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2 + lift);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);
  if (opts.rot) {
    ctx.translate(w / 2, h / 2);
    ctx.rotate(opts.rot);
    ctx.translate(-w / 2, -h / 2);
  }
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, 0, 0, w, h, 12);
  ctx.fillStyle = '#f8ecd2';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3;
  ctx.strokeStyle = el.color;
  ctx.stroke();
  // Element band.
  ctx.fillStyle = el.color;
  roundRect(ctx, 0, 0, w, 34, 12);
  ctx.fillRect(0, 22, w, 12);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(el.name.toUpperCase(), 10, 22);
  // Cost gem.
  ctx.beginPath();
  ctx.arc(w - 20, 17, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#2b1d4e';
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(card.cost), w - 20, 23);
  // Glyph and value.
  drawElementGlyph(ctx, card.element, w / 2, 84, 46);
  ctx.fillStyle = '#2b1d4e';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText(String(card.value), w / 2, 140);
  // Name and rules text.
  ctx.fillStyle = '#2b1d4e';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(card.name, w / 2, 168);
  ctx.fillStyle = '#5a4a33';
  ctx.font = '12px Georgia, serif';
  wrapText(ctx, card.text, w / 2, 182, w - 16, 13);
  ctx.restore();
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  ctx.textAlign = 'center';
  for (let i = 0; i < lines.length; i += 1) ctx.fillText(lines[i], cx, y + i * lineHeight);
}

function drawCardBack(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#3a2a6e';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#b388ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 5);
  ctx.strokeStyle = '#7a5cc9';
  ctx.stroke();
  drawElementGlyph(ctx, 'flame', x + w / 2, y + h / 2, 26, 0.9);
  ctx.restore();
}

function drawLifeBar(ctx, who, x, y, w, label, color) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, x - 8, y - 8, w + 16, 58, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y + 8);
  ctx.fillStyle = '#333';
  roundRect(ctx, x, y + 14, w, 14, 7);
  ctx.fill();
  ctx.fillStyle = color;
  const frac = Math.max(0, who.life / MAX_LIFE);
  if (frac > 0) {
    roundRect(ctx, x, y + 14, w * frac, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(`❤ ${who.life}/${MAX_LIFE}`, x, y + 48);
  if (who.shield > 0) {
    ctx.fillStyle = '#7ec8ff';
    ctx.fillText(`🛡 ${who.shield} shield`, x + 110, y + 48);
  }
  ctx.restore();
}

function drawEmber(ctx, who, x, y) {
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('Ember', x, y);
  for (let i = 0; i < who.maxEmber; i += 1) {
    const cx = x + 14 + i * 26;
    ctx.beginPath();
    ctx.arc(cx, y + 18, 9, 0, Math.PI * 2);
    ctx.fillStyle = i < who.ember ? '#ff9d2e' : '#4a3a5e';
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText(`${who.ember}/${who.maxEmber}`, x + 14 + who.maxEmber * 26 + 6, y + 23);
  ctx.restore();
}

function drawTable(ctx, now, showGlyph = true) {
  // Felt table with a glowing sigil ring in the middle.
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, '#1c2b4a');
  grad.addColorStop(0.55, '#274b34');
  grad.addColorStop(1, '#1a2f23');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.save();
  ctx.translate(VIEW.width / 2, 380);
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 150, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 110, 0, Math.PI * 2);
  ctx.stroke();
  if (showGlyph) {
    const pulse = 0.6 + 0.4 * Math.sin(now / 500);
    ctx.globalAlpha = 0.25 * pulse;
    drawElementGlyph(ctx, 'flame', 0, 0, 60);
  }
  ctx.restore();
}

function drawLog(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, 24, 300, 280, 150, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('— DUEL LOG —', 36, 322);
  ctx.fillStyle = '#e8e0cc';
  ctx.font = '13px Georgia, serif';
  const lines = game.log.slice(-5);
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i].slice(0, 38), 36, 346 + i * 20);
  }
  ctx.restore();
}

function drawPlayedRow(ctx, game, now) {
  const played = [...game.rival.played.slice(-2), ...game.player.played.slice(-2)];
  if (played.length === 0) return;
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('LAST PLAYED', VIEW.width / 2, 300);
  const w = 104;
  const h = 146;
  const gap = 116;
  const startX = VIEW.width / 2 - ((played.length - 1) * gap) / 2 - w / 2;
  for (let i = 0; i < played.length; i += 1) {
    const card = played[i];
    const pop = 1 + 0.06 * Math.sin(now / 180 + i);
    drawCardFace(ctx, card, startX + i * gap, 312, w, h, { scale: pop });
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  let confetti = [];
  let lastScreen = SCREEN_TITLE;
  let dealKey = '';
  let dealStart = 0;

  function spawnConfetti(scatter = false) {
    confetti = [];
    const colors = ['#ffd166', '#ff7a3c', '#3fa9ff', '#4ecb5d', '#b388ff'];
    for (let i = 0; i < 160; i += 1) {
      confetti.push({
        x: Math.random() * VIEW.width,
        y: scatter ? Math.random() * VIEW.height : -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 120,
        vy: 90 + Math.random() * 160,
        size: 6 + Math.random() * 8,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 6,
      });
    }
  }

  function drawConfetti(dt) {
    for (const p of confetti) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    confetti = confetti.filter((p) => p.y < VIEW.height + 30);
  }

  function drawTitle(game, best) {
    drawTable(ctx, performance.now(), false);
    // Fanned sample cards behind the title.
    const sample = game.player.hand.slice(0, 5);
    for (let i = 0; i < sample.length; i += 1) {
      drawCardFace(ctx, sample[i], 353 + i * 116, 470, 110, 154, { rot: (i - 2) * 0.04, scale: 0.94 });
    }
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff9d2e';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 92px Georgia, serif';
    ctx.fillText('EMBER SIGILS', VIEW.width / 2, 190);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'italic 26px Georgia, serif';
    ctx.fillText('A duel of ember, tide, leaf and stone', VIEW.width / 2, 235);
    ctx.fillStyle = '#e8e0cc';
    ctx.font = '17px Georgia, serif';
    ctx.fillText('You and the rival summoner each hold 20 life. Spend ember, play sigil cards,', VIEW.width / 2, 300);
    ctx.fillText('and chain the same element twice in a turn to resonate for +2 power.', VIEW.width / 2, 326);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 22px Georgia, serif';
    const blink = 0.65 + 0.35 * Math.sin(performance.now() / 350);
    ctx.globalAlpha = blink;
    ctx.fillText('Click or press Enter to begin', VIEW.width / 2, 420);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#c9c2ae';
    ctx.font = '15px Georgia, serif';
    ctx.fillText('Keys 1–7 play a card · Space ends your turn · R restarts · Click a card to play it', VIEW.width / 2, 700);
    if (best > 0) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.fillText(`Duels won: ${best}`, VIEW.width / 2, 730);
    }
    ctx.restore();
  }

  function drawPlay(game, now, dt, hoverIndex, instant) {
    drawTable(ctx, now);
    const key = `${game.turn}-${game.phase}`;
    if (key !== dealKey) {
      dealKey = key;
      dealStart = now;
    }
    const dealProgress = instant ? 1 : Math.min(1, (now - dealStart) / 450);

    // Rival: face-down hand, life, ember, intent.
    const rivalCount = game.rival.hand.length;
    for (let i = 0; i < rivalCount; i += 1) {
      drawCardBack(ctx, VIEW.width / 2 - (rivalCount * (BACK_W + 8)) / 2 + i * (BACK_W + 8), 24, BACK_W, BACK_H);
    }
    drawLifeBar(ctx, game.rival, 24, 30, 260, 'RIVAL — VESK', RIVAL_COLOR);
    drawEmber(ctx, game.rival, 1020, 40);
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`TURN ${game.turn}`, VIEW.width / 2, 150);
    ctx.fillStyle = game.phase === PHASE_RIVAL ? '#ff9d9d' : '#9dffb0';
    ctx.font = '16px Georgia, serif';
    ctx.fillText(game.phase === PHASE_RIVAL ? (game.aiIntent || 'Rival turn…') : 'Your turn — play a card', VIEW.width / 2, 176);
    ctx.restore();

    drawLog(ctx, game);
    drawPlayedRow(ctx, game, now);

    // Player: life, ember (left, under the log, clear of the hand), hand, end-turn button.
    drawLifeBar(ctx, game.player, 24, 660, 260, 'YOU', PLAYER_COLOR);
    drawEmber(ctx, game.player, 24, 482);
    ctx.save();
    const btn = END_TURN;
    const enabled = game.phase !== PHASE_OVER;
    ctx.fillStyle = game.phase === PHASE_RIVAL ? '#555' : '#c96a1e';
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fill();
    ctx.fillStyle = enabled && game.phase !== PHASE_RIVAL ? '#fff' : '#bbb';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('END TURN', btn.x + btn.w / 2, btn.y + 32);
    ctx.fillStyle = '#c9c2ae';
    ctx.font = '13px Georgia, serif';
    ctx.fillText(`Deck ${game.player.deck.length} · Discard ${game.player.discard.length}`, btn.x + btn.w / 2, btn.y + 74);
    ctx.restore();

    const hand = game.player.hand;
    for (let i = 0; i < hand.length; i += 1) {
      const rect = playerCardRect(game, i);
      const affordable = hand[i].cost <= game.player.ember && game.phase !== PHASE_RIVAL;
      const lift = i === hoverIndex ? -26 : 0;
      const dealLift = (1 - dealProgress) * 140;
      ctx.save();
      ctx.globalAlpha = affordable ? 1 : 0.55;
      drawCardFace(ctx, hand[i], rect.x, rect.y + dealLift, rect.w, rect.h, { lift, rot: rect.rot });
      ctx.restore();
      if (i === hoverIndex) {
        ctx.save();
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 13px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('Click to play', rect.x + rect.w / 2, rect.y - 34 + dealLift);
        ctx.restore();
      }
    }

    // Floating combat text, staggered so several floats never stack on the life bars
    // or the hand: they rise from the left edge, clear of the cards.
    game.floats.forEach((float, index) => {
      const isPlayer = float.who === game.player;
      const baseX = 60 + (index % 2) * 110;
      const baseY = (isPlayer ? 640 : 104) - Math.floor(index / 2) * 24;
      ctx.save();
      ctx.globalAlpha = Math.min(1, float.ttl);
      ctx.fillStyle = float.kind === 'damage' ? '#ff6b6b' : float.kind === 'heal' ? '#7dff9d' : '#7ec8ff';
      ctx.font = 'bold 22px Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText(float.text, baseX, baseY + (1 - float.ttl) * -30);
      ctx.restore();
    });
    void dt;
  }

  function drawEnd(game, won, instant) {
    drawTable(ctx, performance.now(), false);
    if (won && confetti.length === 0) spawnConfetti(instant);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    if (won) drawConfetti(1 / 60);
    ctx.textAlign = 'center';
    ctx.shadowColor = won ? '#ffd166' : '#ff3b3b';
    ctx.shadowBlur = 34;
    ctx.fillStyle = won ? '#ffd166' : '#ff8a8a';
    ctx.font = 'bold 96px Georgia, serif';
    ctx.fillText(won ? 'VICTORY!' : 'DEFEAT', VIEW.width / 2, 330);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'italic 26px Georgia, serif';
    ctx.fillText(
      won ? 'The rival sigil shatters in a burst of embers.' : 'Your sigil fades. The rival stands over the table.',
      VIEW.width / 2,
      390,
    );
    ctx.fillStyle = '#e8e0cc';
    ctx.font = '19px Georgia, serif';
    ctx.fillText(`Duel lasted ${game.turn} turn${game.turn === 1 ? '' : 's'} · Your life ${game.player.life}/${MAX_LIFE} · Rival life ${game.rival.life}/${MAX_LIFE}`, VIEW.width / 2, 450);
    const blink = 0.65 + 0.35 * Math.sin(performance.now() / 350);
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('Press R or click to duel again', VIEW.width / 2, 520);
    ctx.restore();
  }

  function draw(game, screen, best, hoverIndex = -1, opts = {}) {
    const now = performance.now();
    const instant = !!opts.instant;
    if (screen !== lastScreen) {
      lastScreen = screen;
      if (screen === SCREEN_WIN) spawnConfetti(instant);
      else confetti = [];
    }
    if (screen === SCREEN_TITLE) drawTitle(game, best);
    else if (screen === SCREEN_WIN) drawEnd(game, true, instant);
    else if (screen === SCREEN_LOSS) drawEnd(game, false, instant);
    else drawPlay(game, now, 1 / 60, hoverIndex, instant);
  }

  return { draw };
}
