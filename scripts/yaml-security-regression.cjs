const test = require('node:test');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');

test('YAML tooling preserves ordinary mappings and merges', () => {
  assert.deepEqual(yaml.load('defaults: &defaults {enabled: true}\nconfig: {<<: *defaults, name: test}'), {
    defaults: { enabled: true },
    config: { enabled: true, name: 'test' },
  });
});

test('YAML tooling bounds total merge keys', () => {
  assert.throws(
    () => yaml.load('source: &source [{a: 1}, {b: 2}, {c: 3}]\nresult: {<<: *source}', { maxTotalMergeKeys: 2 }),
    /maxTotalMergeKeys/,
  );
});
