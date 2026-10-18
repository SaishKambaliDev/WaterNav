import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCost, createApp, createDemoRequestStore, demoHealth, readFixture, statuses } from '../src/server.js';

test('demo status choices are specified', () => assert.equal(statuses.length, 5));
test('cost calculation validates units and sums each cost once', () => {
  assert.equal(calculateCost({ quantityKld: -1 }), null);
  const result = calculateCost({ quantityKld: 10, purchasePrice: 1, transport: 2, pumping: 3, treatment: 4, storage: 5, infrastructure: 6, maintenance: 7 });
  assert.equal(result.totalPerKld, 28); assert.equal(result.dailyTotal, 280);
});

test('express app can be created without starting a network listener', () => assert.equal(typeof createApp(), 'function'));

test('illustrative fixture data is available without configuration', async () => {
  const [stps, industries, requests] = await Promise.all(['stps.json', 'industries.json', 'requests.json'].map(readFixture));
  assert.ok(stps.length > 0); assert.ok(industries.length > 0); assert.ok(requests.length > 0);
});

test('demo request workflow is temporary and updates only its in-memory store', () => {
  const store = createDemoRequestStore([{ id: 'sample', status: 'Submitted' }]);
  store.add({ id: 'new', status: 'Submitted' });
  assert.equal(store.all()[0].id, 'new');
  assert.equal(store.update('new', 'Approved').status, 'Approved');
  assert.equal(store.update('missing', 'Approved'), undefined);
});

test('health accurately identifies the illustrative, non-persistent mode', () => {
  assert.deepEqual(demoHealth(), { status: 'ok', service: 'WaterNav API', mode: 'illustrative-demo', persistence: 'in-memory-requests-reset-on-restart' });
});
