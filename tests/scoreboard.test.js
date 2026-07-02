import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Scoreboard from '../js/game/Scoreboard.js';

function createStorage(initialStore = {}) {
  return {
    store: { ...initialStore },
    getItem(key) {
      return Object.hasOwn(this.store, key) ? this.store[key] : null;
    },
    setItem(key, value) {
      this.store[key] = value;
    },
  };
}

describe('Scoreboard', () => {
  it('starts at 0/0 when storage is empty', () => {
    const storage = createStorage();
    const scoreboard = new Scoreboard(storage);

    assert.equal(scoreboard.wins, 0);
    assert.equal(scoreboard.losses, 0);
  });

  it('persists wins and losses across instances', () => {
    const storage = createStorage();
    const first = new Scoreboard(storage);

    first.recordWin();
    first.recordWin();
    first.recordLoss();

    assert.equal(storage.store['battleship-scoreboard'], JSON.stringify({
      wins: 2,
      losses: 1,
    }));

    const second = new Scoreboard(storage);
    assert.equal(second.wins, 2);
    assert.equal(second.losses, 1);
  });

  it('reset zeroes and persists', () => {
    const storage = createStorage();
    const scoreboard = new Scoreboard(storage);

    scoreboard.recordWin();
    scoreboard.recordLoss();
    scoreboard.reset();

    assert.equal(scoreboard.wins, 0);
    assert.equal(scoreboard.losses, 0);
    assert.equal(storage.store['battleship-scoreboard'], JSON.stringify({
      wins: 0,
      losses: 0,
    }));
  });

  it('falls back to 0/0 for corrupt or broken storage without throwing', () => {
    const corruptStorage = createStorage({
      'battleship-scoreboard': '{not valid json',
    });

    assert.doesNotThrow(() => {
      const scoreboard = new Scoreboard(corruptStorage);
      assert.equal(scoreboard.wins, 0);
      assert.equal(scoreboard.losses, 0);
    });

    const brokenStorage = {
      getItem() {
        throw new Error('unavailable');
      },
      setItem() {
        throw new Error('unavailable');
      },
    };

    assert.doesNotThrow(() => {
      const scoreboard = new Scoreboard(brokenStorage);
      assert.equal(scoreboard.wins, 0);
      assert.equal(scoreboard.losses, 0);
      scoreboard.recordWin();
      scoreboard.recordLoss();
      scoreboard.reset();
    });
  });
});
