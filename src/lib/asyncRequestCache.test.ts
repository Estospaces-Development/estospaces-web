import assert from "node:assert/strict";
import test from "node:test";

import { createAsyncRequestCache } from "./asyncRequestCache";

test("deduplicates concurrent requests and reuses the result within the TTL", async () => {
  const cache = createAsyncRequestCache<string>(30_000);
  let loads = 0;
  const loader = async () => {
    loads += 1;
    return "property";
  };

  const [first, second] = await Promise.all([
    cache.get("property-1", loader),
    cache.get("property-1", loader),
  ]);
  const third = await cache.get("property-1", loader);

  assert.equal(first, "property");
  assert.equal(second, "property");
  assert.equal(third, "property");
  assert.equal(loads, 1);
});

test("does not retain transient results that the caller marks uncacheable", async () => {
  const cache = createAsyncRequestCache<{ cacheable: boolean; value: string }>(
    30_000,
    (result) => result.cacheable,
  );
  let loads = 0;
  const loader = async () => {
    loads += 1;
    return { cacheable: false, value: `attempt-${loads}` };
  };

  assert.equal((await cache.get("property-1", loader)).value, "attempt-1");
  await Promise.resolve();
  assert.equal((await cache.get("property-1", loader)).value, "attempt-2");
  assert.equal(loads, 2);
});

test("deleting a key forces the next request to reload", async () => {
  const cache = createAsyncRequestCache<number>(30_000);
  let loads = 0;
  const loader = async () => ++loads;

  assert.equal(await cache.get("property-1", loader), 1);
  cache.delete("property-1");
  assert.equal(await cache.get("property-1", loader), 2);
});

test("keeps a slow request deduplicated until it settles", async () => {
  const cache = createAsyncRequestCache<string>(0);
  let loads = 0;
  let resolveLoad: ((value: string) => void) | undefined;
  const loader = () => {
    loads += 1;
    return new Promise<string>((resolve) => {
      resolveLoad = resolve;
    });
  };

  const first = cache.get("property-1", loader);
  await Promise.resolve();
  const second = cache.get("property-1", loader);

  assert.equal(loads, 1);
  resolveLoad?.("property");
  assert.equal(await first, "property");
  assert.equal(await second, "property");
});
