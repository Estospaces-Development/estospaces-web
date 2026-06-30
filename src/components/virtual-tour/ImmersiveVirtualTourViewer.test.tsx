import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ImmersiveVirtualTourViewer from "./ImmersiveVirtualTourViewer";

test("immersive virtual tour viewer renders branded explore and floor plan controls", () => {
  const markup = renderToStaticMarkup(
    <ImmersiveVirtualTourViewer
      tour={{
        id: "tour-1",
        property_id: "property-1",
        manager_id: "manager-1",
        status: "published",
        public_url: "https://app.estospaces.com/virtual-tours/tour-1",
        rooms: [
          {
            id: "room-1",
            tour_id: "tour-1",
            room_name: "Living Room",
            panorama_url: "https://media.example.com/living.jpg",
            stitch_status: "stitched",
            stitched_panorama_url: "https://media.example.com/living-stitched.jpg",
            sort_order: 0,
            top_view_x: 35,
            top_view_y: 48,
          },
          {
            id: "room-2",
            tour_id: "tour-1",
            room_name: "Kitchen",
            panorama_url: "https://media.example.com/kitchen.jpg",
            stitch_status: "stitched",
            stitched_panorama_url: "https://media.example.com/kitchen-stitched.jpg",
            sort_order: 1,
            top_view_x: 65,
            top_view_y: 48,
          },
        ],
        hotspots: [
          {
            id: "hotspot-1",
            tour_id: "tour-1",
            from_room_id: "room-1",
            to_room_id: "room-2",
            label: "Kitchen",
            x_position: 42,
            y_position: 55,
          },
        ],
      }}
    />,
  );

  assert.match(markup, /Estospaces 360/);
  assert.match(markup, /Explore/);
  assert.match(markup, /Top view/);
  assert.match(markup, /title="Living Room true 360 viewer"/);
  assert.ok(markup.includes("cdn.pannellum.org"));
  assert.match(markup, /living-stitched\.jpg/);
  assert.match(markup, /Mini map/);
  assert.match(markup, /Living Room/);
  assert.match(markup, /Kitchen/);
  assert.match(markup, /aria-label="Go to Kitchen"/);
  assert.doesNotMatch(markup, /object-cover/);
});

test("immersive virtual tour viewer renders an empty-room state", () => {
  const markup = renderToStaticMarkup(
    <ImmersiveVirtualTourViewer
      tour={{
        id: "tour-empty",
        property_id: "property-1",
        status: "published",
        rooms: [],
        hotspots: [],
      }}
    />,
  );

  assert.match(markup, /Tour is not ready yet/);
  assert.match(markup, /has not added any 360 rooms/);
});
