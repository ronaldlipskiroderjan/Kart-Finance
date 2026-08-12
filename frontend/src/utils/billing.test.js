import test from 'node:test';
import assert from 'node:assert/strict';

import {
  entryPeriodTimestamp,
  getActiveBillingMonth,
  getEntryPeriod,
  isEntryInPeriod,
  isSameMonth,
} from './billing.js';

const august = new Date('2026-08-11T12:00:00-03:00');

test('uses current period when the pilot has no closings', () => {
  assert.deepEqual(getActiveBillingMonth({}, august), { year: 2026, month: 8 });
});

test('moves to the next period after closing the current month', () => {
  const pilot = { closingHistories: [{ monthReference: '2026/08' }] };
  assert.deepEqual(getActiveBillingMonth(pilot, august), { year: 2026, month: 9 });
});

test('does not move into a future period when current month is still open', () => {
  const pilot = { closingHistories: [{ monthReference: '2026/07' }] };
  assert.deepEqual(getActiveBillingMonth(pilot, august), { year: 2026, month: 8 });
  assert.equal(isSameMonth(2026, 8, august), true);
});

test('uses the explicit accounting period instead of the creation timestamp', () => {
  const entry = { referencePeriod: '2026-07', createdAt: '2026-08-11T12:00:00Z' };
  assert.deepEqual(getEntryPeriod(entry), { year: 2026, month: 7 });
  assert.equal(isEntryInPeriod(entry, 2026, 7), true);
  assert.equal(isEntryInPeriod(entry, 2026, 8), false);
});

test('uses creation time for statement ordering and period as fallback', () => {
  assert.equal(
    entryPeriodTimestamp({ createdAt: '2026-08-11T12:00:00Z' }),
    Date.parse('2026-08-11T12:00:00Z'),
  );
  assert.equal(
    entryPeriodTimestamp({ referencePeriod: '2026-07' }),
    Date.UTC(2026, 6, 1),
  );
});
