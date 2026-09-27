import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('./BrokerRequestWidget.tsx', import.meta.url), 'utf8');
const sourceFile = ts.createSourceFile('BrokerRequestWidget.tsx', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);

type JsxNode = ts.JsxElement | ts.JsxSelfClosingElement;

const tagNameOf = (node: JsxNode) => (
    ts.isJsxElement(node) ? node.openingElement.tagName.getText(sourceFile) : node.tagName.getText(sourceFile)
);

const attributesOf = (node: JsxNode) => (
    ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes
);

const stringAttribute = (node: JsxNode, name: string) => {
    for (const attribute of attributesOf(node).properties) {
        if (ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === name && attribute.initializer && ts.isStringLiteral(attribute.initializer)) {
            return attribute.initializer.text;
        }
    }
    return null;
};

const findByTestId = (testId: string): JsxNode => {
    let match: JsxNode | null = null;
    const visit = (node: ts.Node) => {
        if ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && stringAttribute(node, 'data-testid') === testId) {
            match = node;
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    assert.ok(match, `expected an element with data-testid="${testId}"`);
    return match;
};

const jsxAncestors = (node: ts.Node) => {
    const ancestors: JsxNode[] = [];
    for (let current = node.parent; current; current = current.parent) {
        if (ts.isJsxElement(current)) ancestors.push(current);
    }
    return ancestors;
};

const classTokens = (node: JsxNode) => (stringAttribute(node, 'className') || '').split(/\s+/).filter(Boolean);

test('desktop Start another request is not trapped inside a collapsible disclosure (QA-MB-20260923-01-037)', () => {
    const button = findByTestId('broker-start-another-request-desktop');
    assert.equal(tagNameOf(button), 'button');
    assert.match(source.slice(button.getStart(sourceFile), button.getEnd()), /onClick=\{handleStartAnotherRequest\}/);
    const ancestors = jsxAncestors(button);
    assert.equal(ancestors.some((ancestor) => tagNameOf(ancestor) === 'details'), false,
        'a closed <details> hides its content, so the desktop control must sit outside it');
    const wrapper = ancestors[0];
    assert.ok(classTokens(wrapper).includes('sm:block'), 'the desktop control is shown from the sm breakpoint');
});

test('the next-step disclosure summary stays reachable on desktop while it is closed', () => {
    const summary = findByTestId('broker-next-step-summary');
    const tokens = classTokens(summary);
    assert.equal(tokens.includes('sm:hidden'), false, 'an always-hidden desktop summary leaves a closed panel blank');
    assert.ok(tokens.includes('sm:group-open:hidden'), 'the summary only hides on desktop once the content is open');
    const details = jsxAncestors(summary)[0];
    assert.equal(tagNameOf(details), 'details');
    assert.ok(classTokens(details).includes('group'));
});

test('the mobile start-a-different-request control is unchanged', () => {
    assert.match(source, /<span>Start a different request<\/span>/);
});

test('request messaging is scoped to the request and the matched agent link reuses it', () => {
    assert.match(source, /upsertDirectConversation\(activeRequest\.matched_broker_id, \{[\s\S]{0,400}brokerRequestId: activeRequest\.id/);
    assert.match(source, /activeRequest\.matched_broker_id === broker\.id\) \{\s*await handleOpenConversation\(\);/);
});
