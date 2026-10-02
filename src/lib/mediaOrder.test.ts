import assert from "node:assert/strict";
import test from "node:test";
import { mergeUploadedUrlsInOrder, moveItem } from "./mediaOrder";

test("moveItem moves an item to the front (make primary)", () => {
  assert.deepEqual(moveItem(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
});

test("moveItem moves an item one step earlier or later", () => {
  assert.deepEqual(moveItem(["a", "b", "c"], 1, 0), ["b", "a", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c"], 1, 2), ["a", "c", "b"]);
});

test("moveItem leaves the list unchanged for out-of-range or no-op moves and never mutates", () => {
  const list = ["a", "b"];
  assert.deepEqual(moveItem(list, 0, -1), ["a", "b"]);
  assert.deepEqual(moveItem(list, 1, 2), ["a", "b"]);
  assert.deepEqual(moveItem(list, 1, 1), ["a", "b"]);
  assert.notEqual(moveItem(list, 1, 0), list);
  assert.deepEqual(list, ["a", "b"]);
});

test("mergeUploadedUrlsInOrder keeps new uploads at their chosen positions", () => {
  const newFirst = { name: "new-1.jpg" };
  const newLast = { name: "new-2.jpg" };
  assert.deepEqual(
    mergeUploadedUrlsInOrder([newFirst, "https://cdn/saved.jpg", newLast], [
      "https://cdn/new-1.jpg",
      "https://cdn/new-2.jpg",
    ]),
    ["https://cdn/new-1.jpg", "https://cdn/saved.jpg", "https://cdn/new-2.jpg"],
  );
});
