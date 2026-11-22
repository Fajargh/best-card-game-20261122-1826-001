// The screenshot scenes behind ?shot=start|play|win|loss. Each one plays the real rules
// forward from a fresh game for a fixed number of turns, steered by a simple autopilot,
// so every frame is what a real duel looks like and the same seed always gives the same
// frame. Win and loss stage a finishing position, then land the real killing card.
import { KIND_ATTACK, KIND_HEAL, KIND_SHIELD } from './cards.js';
import { createRandom } from './random.js';
import { PHASE_OVER, createGame, endTurn, playCard, rivalTakeTurn } from './state.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

function freshGame(seed) {
  return createGame(createRandom(seed));
}

/** Greedy autopilot: play the best affordable card, repeat while one is worth playing. */
function autopilotPlay(game) {
  let guard = 0;
  while (guard < 10) {
    guard += 1;
    let bestIndex = -1;
    let bestScore = 0;
    for (let i = 0; i < game.player.hand.length; i += 1) {
      const card = game.player.hand[i];
      if (card.cost > game.player.ember) continue;
      let score = card.value;
      if (card.kind === KIND_ATTACK) score *= 2;
      if (card.kind === KIND_SHIELD && game.player.life <= 12) score *= 2;
      if (card.kind === KIND_HEAL && game.player.life >= 20) score = 0.5;
      score /= card.cost;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    if (bestIndex < 0 || bestScore < 1.5) break;
    if (playCard(game, game.player, bestIndex) === 2) return;
  }
}

/** Simulate `turns` full rounds (player + rival). Returns false if the duel ended early. */
function simulateTurns(game, turns) {
  for (let t = 0; t < turns; t += 1) {
    autopilotPlay(game);
    if (game.phase === PHASE_OVER) return false;
    endTurn(game);
    if (rivalTakeTurn(game) === 2) return false;
    if (game.phase === PHASE_OVER) return false;
  }
  return true;
}

function stagePlay(seed) {
  // Try a few seeds until one survives four rounds with both hands still full.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const game = freshGame(seed + attempt);
    if (simulateTurns(game, 4) && game.player.hand.length >= 3 && game.rival.hand.length >= 3) {
      return { screen: SCREEN_PLAY, game };
    }
  }
  const game = freshGame(seed);
  simulateTurns(game, 3);
  return { screen: SCREEN_PLAY, game };
}

function stageWin(seed) {
  const game = freshGame(seed);
  // Duel a few rounds first, so the win lands on a table that has been played on.
  simulateTurns(game, 4);
  if (game.phase === PHASE_OVER) {
    const retry = freshGame(seed + 3);
    simulateTurns(retry, 3);
    if (retry.phase !== PHASE_OVER) {
      game.player = retry.player;
      game.rival = retry.rival;
      game.turn = retry.turn;
      game.log = retry.log;
      game.phase = retry.phase;
      game.floats = [];
    }
  }
  game.rival.life = 5;
  game.rival.shield = 0;
  game.phase = 'player';
  game.player.ember = 5;
  // Fetch the finisher from the deck if it is not in hand already.
  let surgeIndex = game.player.hand.findIndex((c) => c.id === 'surge');
  if (surgeIndex < 0) {
    const deckIndex = game.player.deck.findIndex((c) => c.id === 'surge');
    if (deckIndex >= 0) {
      game.player.hand.push(game.player.deck.splice(deckIndex, 1)[0]);
      surgeIndex = game.player.hand.length - 1;
    }
  }
  if (surgeIndex >= 0) {
    playCard(game, game.player, surgeIndex);
  } else {
    const bolt = game.player.hand.find((c) => c.id === 'bolt');
    if (bolt) playCard(game, game.player, game.player.hand.indexOf(bolt));
    const lash = game.player.hand.find((c) => c.id === 'lash');
    if (lash && game.phase !== PHASE_OVER) playCard(game, game.player, game.player.hand.indexOf(lash));
  }
  if (game.phase !== PHASE_OVER) {
    // Fallback: soften the rival to 1 life and land any attack through the rules.
    game.rival.life = 1;
    const any = game.player.hand.findIndex((c) => c.kind === KIND_ATTACK && c.cost <= game.player.ember);
    if (any >= 0) playCard(game, game.player, any);
  }
  game.floats = [];
  return { screen: game.phase === PHASE_OVER ? SCREEN_WIN : SCREEN_PLAY, game };
}

function stageLoss(seed) {
  const game = freshGame(seed);
  // Duel a few rounds first, so the loss lands on a table that has been played on.
  simulateTurns(game, 4);
  if (game.phase === PHASE_OVER) {
    const retry = freshGame(seed + 3);
    simulateTurns(retry, 3);
    if (retry.phase !== PHASE_OVER) {
      game.player = retry.player;
      game.rival = retry.rival;
      game.turn = retry.turn;
      game.log = retry.log;
      game.phase = retry.phase;
      game.floats = [];
    }
  }
  game.player.life = 3;
  game.player.shield = 0;
  game.phase = 'rival';
  game.rival.ember = 5;
  game.rival.maxEmber = 5;
  // Fetch a Quake Slam from the rival deck if it is not in hand already.
  let quakeIndex = game.rival.hand.findIndex((c) => c.id === 'quake');
  if (quakeIndex < 0) {
    const deckIndex = game.rival.deck.findIndex((c) => c.id === 'quake');
    if (deckIndex >= 0) {
      game.rival.hand.push(game.rival.deck.splice(deckIndex, 1)[0]);
      quakeIndex = game.rival.hand.length - 1;
    }
  }
  if (quakeIndex >= 0) playCard(game, game.rival, quakeIndex);
  if (game.phase !== PHASE_OVER) {
    game.player.life = 1;
    const any = game.rival.hand.findIndex((c) => c.kind === KIND_ATTACK && c.cost <= game.rival.ember);
    if (any >= 0) playCard(game, game.rival, any);
  }
  game.floats = [];
  return { screen: game.phase === PHASE_OVER ? SCREEN_LOSS : SCREEN_PLAY, game };
}

/**
 * Build the named scene (start, play, win or loss; anything else is start) and return
 * the game state and the screen to draw over it.
 */
export function stageShot(name, seed) {
  if (name === 'play') return stagePlay(seed);
  if (name === 'win') return stageWin(seed);
  if (name === 'loss') return stageLoss(seed);
  return { screen: SCREEN_TITLE, game: freshGame(seed) };
}
