const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('fixtures load and contain gviz wrapper', () => {
  const snap = fs.readFileSync(path.join(__dirname, 'fixtures/hk-snapshot.gviz.txt'), 'utf8');
  const hist = fs.readFileSync(path.join(__dirname, 'fixtures/hk-history.gviz.txt'), 'utf8');
  assert.match(snap, /google\.visualization\.Query\.setResponse/);
  assert.match(hist, /google\.visualization\.Query\.setResponse/);
});
