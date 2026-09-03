import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const genericMapSource = readSource('../components/dashboard/MapView.tsx');
const satelliteMapSource = readSource('../components/dashboard/SatelliteMap.tsx');
const messagePropertyCardSource = readSource('../components/dashboard/messaging/PropertyCard.tsx');
const userPropertiesSource = readSource('../components/dashboard/UserPropertiesList.tsx');
const leadMapSource = readSource('../components/manager/LeadActionMap.tsx');
const managerPropertyFormSource = readSource('../pages/manager/dashboard/properties/add/page.tsx');

test('all general dashboard map tiles use the correct axis order and never repeat the world', () => {
  assert.match(genericMapSource, /openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.doesNotMatch(genericMapSource, /openstreetmap\.org\/\{z\}\/\{y\}\/\{x\}\.png/);
  assert.equal((genericMapSource.match(/noWrap/g) || []).length, 2);
  assert.match(genericMapSource, /worldCopyJump/);
  assert.match(satelliteMapSource, /noWrap/);
  assert.match(satelliteMapSource, /worldCopyJump/);
});

test('map surfaces fail closed instead of substituting a different property location', () => {
  assert.doesNotMatch(messagePropertyCardSource, /51\.5074|-0\.1278/);
  assert.doesNotMatch(userPropertiesSource, /51\.5074|-0\.1278/);
  assert.match(messagePropertyCardSource, /getVerifiedPropertyMapCoordinates/);
  assert.match(userPropertiesSource, /getVerifiedPropertyMapCoordinates/);
  assert.match(genericMapSource, /No verified map locations/);
  assert.match(leadMapSource, /center=\{initialMapCenter\}/);
  assert.doesNotMatch(leadMapSource, /center=\{\[54\.5, -3\]\}/);
});

test('property creation rejects a pin outside the selected country', () => {
  assert.match(managerPropertyFormSource, /areCoordinatesInsideLaunchMarket/);
  assert.match(managerPropertyFormSource, /does not match the selected country/);
});
