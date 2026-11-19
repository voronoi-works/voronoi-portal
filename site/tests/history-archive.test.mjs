import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activities, dates, lastDate, islandAt } from '../lib/island.ts';

test('timeline extends through the latest recorded publication without hiding older events', () => {
  assert.equal(lastDate, activities.map(event => event.date).sort().at(-1));
  assert.equal(dates.at(-1), lastDate);
  assert.equal(islandAt(lastDate).events.length, activities.length);
  assert.equal(activities.slice(0, 328).filter(event => event.date >= '2026-09-09' && event.date <= '2026-10-31').length, 302);
  assert.ok(activities.some(event => event.id === 'threads-20260830-bags' && event.url === null));
});

test('automatically observed build articles identify their dates as observations', () => {
  for (const event of activities.filter(event => event.id.startsWith('build-') && event.id !== 'build-20261108')) {
    if ('dateBasis' in event) assert.equal(event.dateBasis, 'firstSeen');
  }
});
