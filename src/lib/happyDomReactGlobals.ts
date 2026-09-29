import { Window } from 'happy-dom';

// Test support only. React decides at module load whether the DOM supports
// input events, so tests that type into inputs import this module before any
// module that loads react-dom, to install the DOM globals first.
export const happyDomWindow = new Window({ url: 'https://estospaces.test/' });

Object.entries({
    window: happyDomWindow,
    document: happyDomWindow.document,
    navigator: happyDomWindow.navigator,
    HTMLElement: happyDomWindow.HTMLElement,
    Element: happyDomWindow.Element,
    Node: happyDomWindow.Node,
    IS_REACT_ACT_ENVIRONMENT: true,
}).forEach(([key, value]) => {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
});
