import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState, loadState, saveState} from '../src/engine.js';
import {translateLegacyMessage} from '../src/legacy-messages.js';

test('legacy chronicle entries translate names, numbers, and event messages', () => {
  const samples = [
    ["\u041a\u044a\u0449\u0430 \u0435 \u043f\u043e\u0441\u0442\u0440\u043e\u0435\u043d\u0430.", "House built."],
    ["\u0413\u043b\u0430\u0432\u0435\u043d \u0437\u0430\u043c\u044a\u043a \u0432\u0435\u0447\u0435 \u0435 \u043d\u0438\u0432\u043e 3.", "Main castle is now level 3."],
    ["\u041d\u0430\u0431\u0435\u0433! 5 \u0440\u0430\u0437\u0431\u043e\u0439\u043d\u0438\u0446\u0438 \u0438\u0434\u0432\u0430\u0442 \u043e\u0442 \u0441\u0435\u0432\u0435\u0440.", "Raid! 5 raiders are approaching from north."],
    ["\u041d\u0430\u0431\u0435\u0433\u044a\u0442 \u0435 \u043e\u0442\u0431\u043b\u044a\u0441\u043d\u0430\u0442. +40 \u0437\u043b\u0430\u0442\u043e, +30 \u0434\u044a\u0440\u0432\u043e, +15 \u043a\u0430\u043c\u044a\u043a \u0438 +20 \u0445\u0440\u0430\u043d\u0430.", "Raid repelled. +40 gold, +30 wood, +15 stone and +20 food."],
    ["\u0416\u0438\u0442\u043e\u0442\u043e \u0435 \u043f\u0440\u0438\u0431\u0440\u0430\u043d\u043e. +5 \u0445\u0440\u0430\u043d\u0430 \u0438 \u043d\u043e\u0432 \u043f\u043e\u0441\u0435\u0432 \u043d\u0430 \u0441\u044a\u0449\u043e\u0442\u043e \u043c\u044f\u0441\u0442\u043e.", "Wheat harvested. +5 food and replanted in the same plot."],
    ["\u041f\u043e\u0431\u0435\u0434\u0430 \u043f\u0440\u0438 \u0427\u0435\u0440\u043d\u0430\u0442\u0430 \u043a\u0440\u0435\u043f\u043e\u0441\u0442! \u041f\u043b\u044f\u0447\u043a\u0430\u0442\u0430 \u043f\u0440\u0438\u0441\u0442\u0438\u0433\u043d\u0430. \u0417\u0430\u0433\u0443\u0431\u0435\u043d\u0438 \u0432\u043e\u0439\u043d\u0438\u0446\u0438: 2.", "Victory at Black Fortress! Loot delivered. Soldiers lost: 2."],
    ["\u041f\u0430\u0437\u0430\u0440\u044a\u0442 \u0449\u0435 \u043f\u0440\u043e\u0434\u0430\u0432\u0430 \u0434\u044a\u0440\u0432\u043e \u0441\u0440\u0435\u0449\u0443 \u0437\u043b\u0430\u0442\u043e.", "The market will sell wood for gold."],
    ["\u041f\u043e\u043f\u0440\u0430\u0432\u0435\u043d\u0438 \u0441\u0430 3 \u0441\u0433\u0440\u0430\u0434\u0438 \u0437\u0430 4 \u0434\u044a\u0440\u0432\u043e.", "Repaired 3 buildings for 4 wood."],
  ];
  for (const [original, expected] of samples) {
    assert.equal(translateLegacyMessage(original), expected);
  }
  assert.equal(translateLegacyMessage('House built.'), 'House built.');
  assert.equal(translateLegacyMessage("\u041d\u0435\u043f\u043e\u0437\u043d\u0430\u0442 \u0441\u0442\u0430\u0440 \u0437\u0430\u043f\u0438\u0441."), 'Earlier event recorded before the English update.');
});

test('loading an older save translates its chronicle without resetting progress', () => {
  const state = initialState();
  state.time = 120;
  state.resources.gold = 321;
  state.logs = [{id: 'legacy-event', time: 90, message: "\u041a\u044a\u0449\u0430 \u0435 \u043f\u043e\u0441\u0442\u0440\u043e\u0435\u043d\u0430."}];
  const data = new Map();
  const storage = {getItem: key => data.get(key), setItem: (key, value) => data.set(key, value)};
  assert.equal(saveState(state, storage), true);
  const loaded = loadState(storage);
  assert.equal(loaded.time, state.time);
  assert.deepEqual(loaded.resources, state.resources);
  assert.deepEqual(loaded.buildings, state.buildings);
  assert.deepEqual(loaded.logs, [{id: 'legacy-event', time: 90, message: 'House built.'}]);
  assert.equal(saveState(loaded, storage), true);
  assert.deepEqual(loadState(storage).logs, loaded.logs);
});
