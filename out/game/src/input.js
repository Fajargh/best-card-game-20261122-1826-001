// Mouse and keyboard input for Ember Sigils: clicks on cards and the End Turn button,
// keys 1–7 to play a card, Space to end the turn, R to restart, Enter to confirm.
// One job: turn raw events into actions the main loop consumes.
import { endTurnRect, playerCardRect } from './render.js';
import { KEYS } from './config.js';

export const ACTION_NONE = 0;
export const ACTION_CONFIRM = 1;
export const ACTION_END_TURN = 2;
export const ACTION_RESTART = 4;
export const ACTION_PLAY = 8;

export function createInput(canvas, game) {
  let queued = ACTION_NONE;
  let playIndex = -1;
  let hoverIndex = -1;

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function hitCard(point) {
    const hand = game.player.hand;
    // Topmost card first: later cards overlap earlier ones.
    for (let i = hand.length - 1; i >= 0; i -= 1) {
      const r = playerCardRect(game, i);
      if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y - 26 && point.y <= r.y + r.h) return i;
    }
    return -1;
  }

  function hitEndTurn(point) {
    const r = endTurnRect();
    return point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h;
  }

  canvas.addEventListener('mousemove', (event) => {
    hoverIndex = hitCard(canvasPoint(event));
  });

  canvas.addEventListener('click', (event) => {
    const point = canvasPoint(event);
    const card = hitCard(point);
    if (card >= 0) {
      playIndex = card;
      queued |= ACTION_PLAY;
      return;
    }
    if (hitEndTurn(point)) {
      queued |= ACTION_END_TURN;
      return;
    }
    queued |= ACTION_CONFIRM;
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key >= '1' && key <= '7') {
      playIndex = Number.parseInt(key, 10) - 1;
      queued |= ACTION_PLAY;
    } else if (event.key === KEYS.endTurn) {
      queued |= ACTION_END_TURN;
      event.preventDefault();
    } else if (key === KEYS.restart) {
      queued |= ACTION_RESTART;
    } else if (event.key === KEYS.confirm) {
      queued |= ACTION_CONFIRM;
    }
  });

  return {
    takeActions() {
      const actions = queued;
      const index = playIndex;
      queued = ACTION_NONE;
      playIndex = -1;
      return { actions, playIndex: index };
    },
    hoverIndex() {
      return hoverIndex;
    },
  };
}
