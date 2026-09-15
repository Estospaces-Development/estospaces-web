import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Window } from 'happy-dom';

import { UserContractCardFrame } from './UserContractCardFrame';
import { canUserSignContract } from '@/lib/contractStatus';

for (const status of ['draft', 'pending_user_signature', 'pending_manager_signature', 'active', 'terminated']) {
    for (const isLinked of [false, true]) {
        test(`${status}, linked=${isLinked}: orange consistently means a user signature is needed`, () => {
            const userSignedAt = ['pending_manager_signature', 'active'].includes(status) ? '2026-09-15T00:00:00Z' : null;
            const needsSignature = canUserSignContract(status, userSignedAt);
            const window = new Window();
            try {
                window.document.body.innerHTML = renderToStaticMarkup(
                    <UserContractCardFrame needsSignature={needsSignature} isLinked={isLinked}>
                        <button type="button">View document</button>
                    </UserContractCardFrame>,
                );
                const card = window.document.body.firstElementChild!;
                assert.equal(card.classList.contains('border-orange-300'), needsSignature);
                assert.equal(card.textContent?.includes('Your signature needed'), needsSignature);
                assert.equal(card.textContent?.includes('Linked contract'), isLinked);
                assert.equal(card.getAttribute('aria-current'), isLinked ? 'true' : null);
                assert.equal(card.querySelector('button')?.textContent, 'View document');
            } finally {
                window.close();
            }
        });
    }
}
