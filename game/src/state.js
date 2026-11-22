// The rules engine for Ember Sigils: turns, ember, playing cards, resonance combos,
// damage and shield, the rival AI and the win/loss check. One job: the game state and
// how it changes. Nothing in here draws anything.
//
// A duel: you and the rival summoner each have 20 life. Each turn you gain ember
// (1 on turn 1, +1 each of your turns, up to 10), draw a card, and may play as many
// cards as your ember pays for. Playing a card of the same element as the card played
// just before it this turn resonates: +2 damage, shield or heal. When a deck runs out
// it is reshuffled from its discard pile. The first summoner at 0 life loses.
import { MAX_EMBER, MAX_HAND, MAX_LIFE, RESONANCE_BONUS, START_HAND } from './config.js';
import {
  KIND_ATTACK, KIND_DRAW, KIND_EMBER, KIND_HEAL, KIND_SHIELD, buildDeck,
} from './cards.js';

export const PHASE_PLAYER = 'player';
export const PHASE_RIVAL = 'rival';
export const PHASE_OVER = 'over';

export const EVENT_NONE = 0;
export const EVENT_PLAYED = 1;
export const EVENT_OVER = 2;

function makeSummoner(random) {
  return {
    life: MAX_LIFE,
    shield: 0,
    ember: 0,
    maxEmber: 0,
    deck: buildDeck(random),
    hand: [],
    discard: [],
    played: [],
  };
}

export function createGame(random) {
  const game = {
    random,
    turn: 1,
    phase: PHASE_PLAYER,
    player: makeSummoner(random),
    rival: makeSummoner(random),
    winner: null,
    log: [],
    lastElement: null,
    aiIntent: '',
    floats: [],
  };
  drawCards(game, game.player, START_HAND);
  drawCards(game, game.rival, START_HAND);
  beginTurn(game, game.player);
  game.log.push('The duel begins. Your move, summoner.');
  return game;
}

function log(game, message) {
  game.log.push(message);
  if (game.log.length > 6) game.log.shift();
}

export function other(game, who) {
  return who === game.player ? game.rival : game.player;
}

function reshuffleIfNeeded(game, who) {
  if (who.deck.length === 0 && who.discard.length > 0) {
    who.deck = who.discard;
    who.discard = [];
    // Fisher-Yates with the seeded generator.
    for (let i = who.deck.length - 1; i > 0; i -= 1) {
      const j = game.random.int(i + 1);
      const tmp = who.deck[i];
      who.deck[i] = who.deck[j];
      who.deck[j] = tmp;
    }
    log(game, 'Deck reshuffled from the discard pile.');
  }
}

export function drawCards(game, who, count) {
  for (let i = 0; i < count; i += 1) {
    if (who.hand.length >= MAX_HAND) return;
    reshuffleIfNeeded(game, who);
    if (who.deck.length === 0) return;
    who.hand.push(who.deck.pop());
  }
}

function beginTurn(game, who) {
  who.maxEmber = Math.min(MAX_EMBER, who.maxEmber + 1);
  who.ember = who.maxEmber;
  game.lastElement = null;
  drawCards(game, who, 1);
}

/** Damage first eats shield, then life. Returns the life actually lost. */
function dealDamage(game, target, amount, sourceName) {
  let rest = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, rest);
    target.shield -= absorbed;
    rest -= absorbed;
  }
  target.life = Math.max(0, target.life - rest);
  game.floats.push({ text: `-${amount}`, kind: 'damage', who: target, ttl: 1.2 });
  return rest;
}

function gainShield(game, who, amount) {
  who.shield += amount;
  game.floats.push({ text: `+${amount} shield`, kind: 'shield', who, ttl: 1.2 });
}

function heal(game, who, amount) {
  const healed = Math.min(amount, MAX_LIFE - who.life);
  who.life += healed;
  if (healed > 0) game.floats.push({ text: `+${healed} life`, kind: 'heal', who, ttl: 1.2 });
  return healed;
}

/**
 * Play the card at `handIndex` for `who`. Returns EVENT_PLAYED, or EVENT_NONE when the
 * card cannot be played (not that side's turn, not enough ember). Applies resonance:
 * same element as the previous card this turn adds +2 to the card's main number.
 */
export function playCard(game, who, handIndex) {
  if (game.phase === PHASE_OVER) return EVENT_NONE;
  if (who === game.player && game.phase !== PHASE_PLAYER) return EVENT_NONE;
  if (who === game.rival && game.phase !== PHASE_RIVAL) return EVENT_NONE;
  const card = who.hand[handIndex];
  if (!card || card.cost > who.ember) return EVENT_NONE;

  const foe = other(game, who);
  const resonates = game.lastElement === card.element;
  const bonus = resonates ? RESONANCE_BONUS : 0;
  who.ember -= card.cost;
  who.hand.splice(handIndex, 1);
  who.played.push(card);
  who.discard.push(card);
  game.lastElement = card.element;
  const whoName = who === game.player ? 'You' : 'Rival';
  const res = resonates ? ' ⚡+2' : '';

  if (card.kind === KIND_ATTACK) {
    let damage = card.value + bonus;
    if (card.id === 'quake' && foe.shield > 0) damage += 3;
    dealDamage(game, foe, damage, card.name);
    if (card.id === 'undertow') gainShield(game, who, 2);
    if (card.id === 'thorn') heal(game, who, 2);
    log(game, `${whoName}: ${card.name} — ${damage} damage.${res}`);
  } else if (card.kind === KIND_SHIELD) {
    gainShield(game, who, card.value + bonus);
    if (card.id === 'current') drawCards(game, who, 1);
    log(game, `${whoName}: ${card.name} — +${card.value + bonus} shield.${res}`);
  } else if (card.kind === KIND_HEAL) {
    heal(game, who, card.value + bonus);
    log(game, `${whoName}: ${card.name} — healed ${card.value + bonus}.${res}`);
  } else if (card.kind === KIND_EMBER) {
    who.ember = Math.min(MAX_EMBER, who.ember + card.value);
    if (card.id === 'kindling' && resonates) drawCards(game, who, 1);
    if (card.id === 'keystone') gainShield(game, who, 2);
    log(game, `${whoName}: ${card.name} — +${card.value} ember.${res}`);
  } else if (card.kind === KIND_DRAW) {
    drawCards(game, who, card.value);
    heal(game, who, 1);
    log(game, `${whoName}: ${card.name} — drew ${card.value}.`);
  }

  if (foe.life <= 0) {
    game.winner = who === game.player ? 'player' : 'rival';
    game.phase = PHASE_OVER;
    log(game, who === game.player ? 'The rival sigil shatters. You win!' : 'Your sigil shatters. The rival wins.');
    return EVENT_OVER;
  }
  return EVENT_PLAYED;
}

/** End the current side's turn and start the other side's. */
export function endTurn(game) {
  if (game.phase === PHASE_OVER) return;
  if (game.phase === PHASE_PLAYER) {
    game.phase = PHASE_RIVAL;
    beginTurn(game, game.rival);
    planRivalIntent(game);
    log(game, 'Rival turn.');
  } else {
    game.phase = PHASE_PLAYER;
    game.turn += 1;
    beginTurn(game, game.player);
    log(game, `Turn ${game.turn}. Your move.`);
  }
}

/** Score a card for the AI: damage and healing matter most, shield when hurt. */
function scoreCardForAi(game, card) {
  const me = game.rival;
  const foe = game.player;
  const resonates = game.lastElement === card.element;
  const bonus = resonates ? RESONANCE_BONUS : 0;
  let score = 0;
  if (card.kind === KIND_ATTACK) {
    let damage = card.value + bonus;
    if (card.id === 'quake' && foe.shield > 0) damage += 3;
    score = damage * 2 + (foe.life - damage <= 0 ? 100 : 0);
    if (card.id === 'undertow') score += 3;
    if (card.id === 'thorn') score += me.life < MAX_LIFE ? 4 : 1;
  } else if (card.kind === KIND_SHIELD) {
    score = (card.value + bonus) * (me.life <= 8 ? 2 : 1.2) + (card.id === 'current' ? 3 : 0);
  } else if (card.kind === KIND_HEAL) {
    score = me.life >= MAX_LIFE ? 0.5 : (card.value + bonus) * 2;
  } else if (card.kind === KIND_EMBER) {
    score = me.ember < 3 ? 6 : 2;
  } else if (card.kind === KIND_DRAW) {
    score = me.hand.length <= 3 ? 7 : 2;
  }
  return score / Math.max(1, card.cost);
}

/** The rival's visible intent: the element it favours this turn, so you can read it. */
function planRivalIntent(game) {
  const counts = {};
  for (const card of game.rival.hand) counts[card.element] = (counts[card.element] || 0) + 1;
  let best = null;
  let bestCount = 0;
  for (const element of Object.keys(counts)) {
    if (counts[element] > bestCount) {
      bestCount = counts[element];
      best = element;
    }
  }
  game.aiIntent = best ? `Rival channels ${best}…` : 'Rival studies its hand…';
}

/**
 * Run the rival's whole turn: play its best affordable card, repeat while it can still
 * play something worth playing, then end the turn. Returns EVENT_OVER when the duel ends.
 */
export function rivalTakeTurn(game) {
  if (game.phase !== PHASE_RIVAL) return EVENT_NONE;
  let guard = 0;
  while (guard < 12) {
    guard += 1;
    let bestIndex = -1;
    let bestScore = 0;
    for (let i = 0; i < game.rival.hand.length; i += 1) {
      const card = game.rival.hand[i];
      if (card.cost > game.rival.ember) continue;
      const score = scoreCardForAi(game, card);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    if (bestIndex < 0 || bestScore < 1.5) break;
    const result = playCard(game, game.rival, bestIndex);
    if (result === EVENT_OVER) return EVENT_OVER;
    if (result === EVENT_NONE) break;
  }
  game.aiIntent = '';
  endTurn(game);
  return EVENT_NONE;
}

/** Advance floating combat text. Call every frame with dt in seconds. */
export function tickFloats(game, dt) {
  for (const float of game.floats) float.ttl -= dt;
  game.floats = game.floats.filter((float) => float.ttl > 0);
}
