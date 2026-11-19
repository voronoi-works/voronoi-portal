import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activities, channels, mediaRoutes, dates, historyRangeLabel, islandAt, safeSourceUrl } from '../lib/island.ts';
import { residents, residentsAt, placementHistory } from '../lib/residents.ts';

test('history excludes future posts without inventing opening dates', () => {
  for (const date of dates) {
    const state = islandAt(date);
    assert.ok(state.events.every(event => event.date <= date));
    for (const area of state.areas) {
      assert.equal(area.openedAt, null);
      assert.equal(area.opened, activities.some(event => event.channel === area.id && event.date <= date));
    }
  }
  const early = islandAt('2026-08-30').areas.find(area => area.id === 'blog');
  assert.equal(early.statusLabel, 'この日までの記録なし');
  const youtube = islandAt('2026-09-12').areas.find(area => area.id === 'youtube');
  assert.equal(youtube.statusLabel, 'この日までの記録なし');
  assert.notEqual(youtube.planned, true);
  assert.ok(youtube.links.length > 0);
  assert.equal(youtube.posts.length, 0);
});
test('selected real records are counted, not fictional opening events or reservations', () => {
  const beforeSync = activities.slice(0, 328);
  const latest = islandAt(dates.at(-1));
  const previous = islandAt('2026-09-08', beforeSync);
  assert.equal(previous.events.length, 8);
  assert.deepEqual(Object.fromEntries(previous.areas.map(area => [area.id, area.posts.length])), { blog: 3, make: 0, note: 3, youtube: 0, sns: 1, instagram: 1 });
  const originalSnapshot = islandAt('2026-11-11', beforeSync);
  assert.ok(latest.date >= '2026-11-11');
  assert.ok(historyRangeLabel.startsWith('2026.8.30–'));
  assert.equal(originalSnapshot.events.filter(event => event.date >= '2026-11-01').length, 18);
  for (const month of ['2026-09', '2026-10']) {
    const backfill = latest.events.filter(event => event.date.startsWith(month) && event.date >= '2026-09-09');
    assert.deepEqual(new Set(backfill.map(event => event.channel)), new Set(['blog', 'note', 'youtube', 'sns', 'instagram']));
  }
  assert.ok(islandAt('2026-09-15').today.length > 0);
  assert.ok(islandAt('2026-10-15').today.length > 0);
  assert.deepEqual(originalSnapshot.today.map(event => event.id), ['x-2120370476749119725', 'threads-DflJN_tEaDp']);
  assert.ok(activities.every(event => event.kind === 'published'));
  assert.equal(islandAt('2026-08-29').events.length, 0);
});
test('recent notification expires without erasing publications', () => {
  const original = activities.filter(event => event.date <= '2026-09-08');
  const during = islandAt('2026-09-08', original).areas.find(area => area.id === 'note');
  const after = islandAt('2026-09-12', original).areas.find(area => area.id === 'note');
  assert.equal(during.recent, true);
  assert.equal(after.recent, false);
  assert.equal(after.posts.length, 3);
  assert.equal(after.opened, true);
});
test('rewinding and returning reproduces the same state, independent of input order', () => {
  const before = JSON.stringify(activities);
  const latest = islandAt(dates.at(-1));
  islandAt(dates[2]);
  assert.deepEqual(islandAt(dates.at(-1), [...activities].reverse()), latest);
  assert.equal(JSON.stringify(activities), before);
});
test('source URLs only permit valid HTTPS, sample records do not invent destinations', () => {
  for (const value of [null, '', 'javascript:alert(1)', 'data:text/html,x', 'http://example.com', '//example.com', '/missing']) assert.equal(safeSourceUrl(value), null);
  assert.equal(safeSourceUrl('https://example.com/post'), 'https://example.com/post');
  assert.equal(activities.filter(event => !safeSourceUrl(event.url)).length, 2);
  assert.ok(activities.filter(event => event.date >= '2026-09-09').every(event => safeSourceUrl(event.url)));
});
test('publication data is internally coherent and every event is reachable from the timeline', () => {
  assert.equal(new Set(activities.map(event => event.id)).size, activities.length);
  const urls = activities.flatMap(event => event.url ? [event.url] : []);
  assert.equal(new Set(urls).size, urls.length);
  for (const event of activities) {
    assert.ok(dates.includes(event.date));
    assert.ok(channels.some(channel => channel.id === event.channel));
    assert.equal(event.kind, 'published');
  }
});

test('residents share places and reproduce their historical placements', () => {
  const current = residentsAt('2026-09-09');
  assert.equal(new Set(current.map(person => person.id)).size, residents.length);
  assert.ok(new Set(current.map(person => person.spot)).size < current.length);
  assert.notDeepEqual(residentsAt('2026-08-25'), current);
  assert.deepEqual(residentsAt('2026-09-09'), current);
  assert.deepEqual(residentsAt('2026-08-24'), []);
  for (const snapshot of placementHistory) for (const person of snapshot.placements) {
    assert.ok(person.x > 0 && person.x < 100 && person.y > 0 && person.y < 100);
    assert.ok(residents.some(resident => resident.id === person.id));
    assert.equal('channel' in person, false);
  }
});

test('adding game and app areas neither requires nor relocates residents', () => {
  const before = residentsAt('2026-09-09');
  const extensions = [
    { id: 'atl', name: 'ATL', place: 'ゲームの場所', kind: 'game', icon: 'game', x: 45, y: 30, color: '#777' },
    { id: 'picopl', name: 'picopl', place: 'アプリの場所', kind: 'app', icon: 'app', x: 55, y: 30, color: '#777' },
  ];
  const state = islandAt('2026-09-09', activities, [...channels, ...extensions]);
  assert.equal(state.areas.length, channels.length + 2);
  assert.ok(state.areas.slice(-2).every(area => !area.opened && area.posts.length === 0));
  assert.equal(before.length, 4);
  assert.deepEqual(residentsAt('2026-09-09'), before);
});

test('current entries link to the published workshop and keep media routes connected', () => {
  const mainEntries = channels.filter(area => area.mapMarker !== false);
  assert.deepEqual(mainEntries.map(area => area.name), ['ghost', 'build', 'note', 'YouTube']);
  const make = channels.find(area => area.id === 'make');
  assert.notEqual(make.planned, true);
  assert.deepEqual(make.links, [{ name: 'build', url: 'https://build.voronoi.works/' }]);
  const build = activities.find(event => event.channel === 'make');
  assert.equal(build?.date, '2026-11-08');
  assert.equal(build?.url, make.links[0].url);
  assert.deepEqual(mediaRoutes.map(route => [route.from, route.to]), [['sns', 'note'], ['instagram', 'youtube']]);
  for (const route of mediaRoutes) {
    const source = channels.find(area => area.id === route.from);
    assert.ok(source && source.mapMarker === false);
    assert.ok(source.links.length > 0);
    assert.ok(source.links.every(link => safeSourceUrl(link.url)));
    assert.ok(mainEntries.some(area => area.id === route.to));
  }
});

test('splitting the social routes does not rewrite the old Instagram and Threads posts', () => {
  const day = islandAt('2026-08-30');
  assert.deepEqual(day.events.map(event => event.id).sort(), ['instagram-20260830-bags', 'threads-20260830-bags']);
  assert.equal(day.areas.find(area => area.id === 'instagram').posts[0].id, 'instagram-20260830-bags');
  assert.equal(day.areas.find(area => area.id === 'sns').posts[0].id, 'threads-20260830-bags');
  assert.ok(day.events.every(event => event.url === null));
});
