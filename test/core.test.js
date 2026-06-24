const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../core.js');

const SNAP = fs.readFileSync(path.join(__dirname, 'fixtures/hk-snapshot.gviz.txt'), 'utf8');

test('parseGvizText strips wrapper and returns table', () => {
  const t = Core.parseGvizText(SNAP);
  assert.equal(t.cols.length, 12);
  assert.equal(t.rows.length, 6);
});

test('parseGvizText throws on gviz error status', () => {
  const errBody = '/*O_o*/google.visualization.Query.setResponse({"status":"error","errors":[{"detailed_message":"boom"}]});';
  assert.throws(() => Core.parseGvizText(errBody), /boom/);
});

test('parseGvizText throws on non-gviz text', () => {
  assert.throws(() => Core.parseGvizText('not gviz at all'));
});

test('cellV and cellF read values', () => {
  const t = Core.parseGvizText(SNAP);
  const r0 = t.rows[0];
  assert.equal(Core.cellV(r0, 0), 'BKW');
  assert.equal(Core.cellF(r0, 4), '240');   // SLA has f
  assert.equal(Core.cellV(r0, 4), 240);
  assert.equal(Core.cellV({ c: [] }, 5), null);
});
