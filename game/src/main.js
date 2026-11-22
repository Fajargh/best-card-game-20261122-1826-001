// Boot and the one loop for Ember Sigils: input is read every frame, the rules advance in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves between four
// screens: title, play, win and loss. The rival takes its turn after a short pause, so you
// can read its intent before it strikes.
//
// ?seed=N fixes the deal. ?shot=start|play|win|loss (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_OVER, EVENT_PLAYED, PHASE_OVER, PHASE_RIVAL, createGame, endTurn, playCard, rivalTakeTurn, tickFloats,
} from './state.js';
import {
  ACTION_CONFIRM, ACTION_END_TURN, ACTION_PLAY, ACTION_RESTART, createInput,
} from './input.js';
import {
  SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** How long the rival "thinks" before it plays, so its intent can be read. */
const RIVAL_PAUSE_MS = 900;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, seed);
  scene.game.floats = [];
  let painted = 0;
  function paint() {
    renderer.draw(scene.game, scene.screen, readBest(), -1, { instant: true });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, { get player() { return game.player; } });
  let game = createGame(createRandom(seed));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let last = performance.now();
  let rivalSince = 0;
  let rivalWaiting = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startDuel() {
    game = createGame(createRandom(Math.floor(Math.random() * 4294967296)));
    screen = SCREEN_PLAY;
    rivalWaiting = false;
    announce(`Duel started. Turn 1. You have ${game.player.ember} ember.`);
  }

  function finishDuel() {
    screen = game.winner === 'player' ? SCREEN_WIN : SCREEN_LOSS;
    if (game.winner === 'player') {
      best += 1;
      saveBest(best);
    }
    announce(game.winner === 'player'
      ? `Victory! The rival sigil shatters. Duels won: ${best}.`
      : 'Defeat. Your sigil fades.');
  }

  function handleActions() {
    const { actions, playIndex } = input.takeActions();
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      startDuel();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS)) {
      startDuel();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_PLAY && playIndex >= 0) {
      const result = playCard(game, game.player, playIndex);
      if (result === EVENT_OVER) finishDuel();
      else if (result === EVENT_PLAYED) announce(`Played ${game.player.played[game.player.played.length - 1].name}.`);
    }
    if (actions & ACTION_END_TURN && game.phase !== PHASE_RIVAL) {
      endTurn(game);
      rivalWaiting = true;
      rivalSince = performance.now();
      announce('Rival turn.');
    }
  }

  function step(now) {
    if (screen !== SCREEN_PLAY) return;
    if (game.phase === PHASE_RIVAL && !rivalWaiting) {
      rivalWaiting = true;
      rivalSince = now;
    }
    if (game.phase === PHASE_RIVAL && rivalWaiting && now - rivalSince >= RIVAL_PAUSE_MS) {
      rivalWaiting = false;
      if (rivalTakeTurn(game) === EVENT_OVER) finishDuel();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    handleActions();
    step(now);
    tickFloats(game, dt);
    renderer.draw(game, screen, best, input.hoverIndex());
  }

  announce('Ember Sigils. Press Enter or click to begin the duel.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
