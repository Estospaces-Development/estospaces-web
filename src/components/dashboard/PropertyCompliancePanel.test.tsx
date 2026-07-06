import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import PropertyCompliancePanel from './PropertyCompliancePanel';

test('property compliance evidence actions include the category in their accessible name', () => {
  const markup = renderToStaticMarkup(
    <PropertyCompliancePanel
      propertyId="property-123"
      initialReadiness={{
        jurisdiction_profile: 'england',
        listing_type: 'rent',
        status: 'attention_required',
        required_evidence: [
          {
            code: 'epc',
            label: 'EPC',
            scope: 'marketing',
            status: 'missing',
          },
          {
            code: 'gas_safety_record',
            label: 'Gas safety record',
            scope: 'move_in',
            status: 'missing',
          },
        ],
      }}
    />,
  );

  assert.match(markup, /aria-label="Record EPC evidence"/);
  assert.match(markup, /aria-label="Record Gas safety record evidence"/);
});
