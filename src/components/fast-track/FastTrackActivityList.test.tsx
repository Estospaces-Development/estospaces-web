import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Window } from "happy-dom";

import { FastTrackActivityList } from "./FastTrackWorkspace";

const entries = (count: number) => Array.from({ length: count }, (_, index) => ({
  id: `activity-${index + 1}`,
  type: "stage_change",
  message: `Update number ${index + 1}`,
  actorRole: index % 2 === 0 ? "manager" : "user",
  createdAt: "2026-10-01T10:00:00Z",
}));

const visibleUpdates = (text: string) => (text.match(/Update number \d+/g) ?? []);

// MB-0432 (web half): the activity history stopped at the 8 newest entries with no way to see the rest.
test("a long activity history starts at 8 updates and offers Show all activity (N)", () => {
  const markup = renderToStaticMarkup(<FastTrackActivityList activity={entries(12)} role="user" />);

  assert.deepEqual(visibleUpdates(markup), Array.from({ length: 8 }, (_, index) => `Update number ${index + 1}`));
  assert.match(markup, /Show all activity \(12\)/);
  assert.match(markup, /aria-expanded="false"/);
});

test("a short history shows every update with no toggle, and an empty one keeps its empty state", () => {
  const eight = renderToStaticMarkup(<FastTrackActivityList activity={entries(8)} role="manager" />);
  assert.equal(visibleUpdates(eight).length, 8);
  assert.doesNotMatch(eight, /Show all activity|Show fewer/);

  const none = renderToStaticMarkup(<FastTrackActivityList activity={[]} role="user" />);
  assert.match(none, /Recent updates about your journey will appear here\./);
  assert.doesNotMatch(none, /Show all activity/);
  assert.match(
    renderToStaticMarkup(<FastTrackActivityList activity={[]} role="manager" />),
    /Recent case updates will appear here\./,
  );
});

test("Show all activity reveals every update and Show fewer collapses it again", async () => {
  const browserWindow = new Window({ url: "https://estospaces.test/user/fast-track" });
  const keys = ["window", "document", "navigator", "HTMLElement", "Element", "Node", "Event", "IS_REACT_ACT_ENVIRONMENT"] as const;
  const descriptors = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const globals: Record<(typeof keys)[number], unknown> = {
    window: browserWindow,
    document: browserWindow.document,
    navigator: browserWindow.navigator,
    HTMLElement: browserWindow.HTMLElement,
    Element: browserWindow.Element,
    Node: browserWindow.Node,
    Event: browserWindow.Event,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  Object.entries(globals).forEach(([key, value]) => {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  });
  const host = browserWindow.document.createElement("div");
  browserWindow.document.body.append(host);
  const root = createRoot(host as unknown as HTMLDivElement);

  try {
    await act(async () => { root.render(<FastTrackActivityList activity={entries(12)} role="user" />); });
    const toggle = () => host.querySelector("button") as unknown as HTMLButtonElement;

    assert.equal(visibleUpdates(host.textContent ?? "").length, 8);
    assert.match(toggle().textContent ?? "", /Show all activity \(12\)/);

    await act(async () => { toggle().click(); });
    assert.equal(visibleUpdates(host.textContent ?? "").length, 12);
    assert.match(host.textContent ?? "", /Update number 12/);
    assert.match(toggle().textContent ?? "", /Show fewer/);
    assert.equal(toggle().getAttribute("aria-expanded"), "true");

    await act(async () => { toggle().click(); });
    assert.equal(visibleUpdates(host.textContent ?? "").length, 8);
    assert.match(toggle().textContent ?? "", /Show all activity \(12\)/);
  } finally {
    act(() => root.unmount());
    keys.forEach((key) => {
      const descriptor = descriptors.get(key);
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
    browserWindow.close();
  }
});
