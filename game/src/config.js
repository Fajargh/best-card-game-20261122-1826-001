// Shared constants for Ember Sigils: canvas size, colours, keys, balance numbers.
// One job: the numbers every other module reads, so tuning lives in one place.
export const VIEW = { width: 1280, height: 800 };

export const MAX_LIFE = 20;
export const MAX_EMBER = 10;
export const START_HAND = 4;
export const MAX_HAND = 7;
export const DECK_SIZE = 24;
export const RESONANCE_BONUS = 2;

export const ELEMENTS = {
  flame: { name: 'Flame', color: '#ff7a3c', dark: '#c33d0e', glyph: '▲', light: '#ffd9b0' },
  tide: { name: 'Tide', color: '#3fa9ff', dark: '#1459c2', glyph: '●', light: '#cfe8ff' },
  leaf: { name: 'Leaf', color: '#4ecb5d', dark: '#1e7a2e', glyph: '◆', light: '#d2f5d3' },
  stone: { name: 'Stone', color: '#c9a24b', dark: '#7a5c17', glyph: '■', light: '#f2e3b3' },
};

export const PLAYER_COLOR = '#ffd166';
export const RIVAL_COLOR = '#b388ff';

export const BEST_KEY = 'ember-sigils-best';
export const STEP = 1 / 60;

export const KEYS = {
  endTurn: ' ',
  restart: 'r',
  confirm: 'Enter',
};
