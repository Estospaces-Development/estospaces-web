import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { Window } from 'happy-dom';
import ts from 'typescript';

import type { ConversationRefreshResult } from '@/contexts/MessagesContext';
import * as messagesInbox from '@/lib/messagesInbox';

const initialIds = ['rent', 'purchase', 'support'];
const refreshed = (conversationIds = initialIds): ConversationRefreshResult => ({
  success: true, conversationIds, outcome: 'success',
});
const failed: ConversationRefreshResult = { success: false, conversationIds: [], outcome: 'failed' };
const deferredRefresh = () => {
  let complete!: (result: ConversationRefreshResult) => void;
  const promise = new Promise<ConversationRefreshResult>((resolvePromise) => { complete = resolvePromise; });
  return { promise, complete };
};

interface HarnessMessages {
  conversations: Array<{ id: string }>;
  allConversations: Array<{ id: string }>;
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  refreshConversations: () => Promise<ConversationRefreshResult>;
  hasLoadedConversations: boolean;
  isLoading: boolean;
  conversationThreadIssue: messagesInbox.ConversationThreadIssue | null;
  clearConversationThreadIssue: () => void;
  sendMessage: () => never;
}

const installInbox = async (search = '', role: 'user' | 'manager' = 'user', strictMode = false, realComposer = false) => {
  const pathname = role === 'user' ? '/user/dashboard/messages' : '/manager/messages';
  const browserWindow = new Window({ url: `https://estospaces.test${pathname}` });
  browserWindow.innerWidth = 390;
  const globals = {
    window: browserWindow, document: browserWindow.document, navigator: browserWindow.navigator,
    HTMLElement: browserWindow.HTMLElement, Element: browserWindow.Element, Node: browserWindow.Node,
    Event: browserWindow.Event, IS_REACT_ACT_ENVIRONMENT: true,
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }

  const Context = React.createContext<HarnessMessages | null>(null);
  const useHarnessMessages = () => {
    const context = React.useContext(Context);
    assert.ok(context);
    return context;
  };
  const requests: Array<ReturnType<typeof deferredRefresh>> = [];
  let currentUrl = pathname + search;
  let selectedId: string | null = null;
  let navigate: ReturnType<typeof useNavigate> = () => { throw new Error('Router not mounted'); };
  const auth = { user: null };
  const toast = { error() {} };
  const boundaries: Record<string, unknown> = {
    '@/contexts/MessagesContext': { useMessages: useHarnessMessages },
    '@/contexts/AuthContext': { useAuth: () => auth },
    '@/contexts/ToastContext': { useToast: () => toast },
    '@/lib/messagesInbox': messagesInbox,
    '@/services/applicationsService': {}, '@/services/leadsService': {},
    '@/services/messagesService': {}, '@/lib/conversationVisibility': {},
    '@/components/dashboard/messaging/ConversationList': {
      __esModule: true,
      default: ({ onSelectConversation }: { onSelectConversation: (id: string) => void }) => (
        <nav data-conversation-list>
          {initialIds.map((id) => <button key={id} data-select={id} onClick={() => onSelectConversation(id)}>{id}</button>)}
        </nav>
      ),
    },
    '@/components/dashboard/messaging/ConversationThread': {
      __esModule: true,
      default: ({ conversationId }: { conversationId: string }) => <article data-thread={conversationId}>{conversationId}</article>,
    },
    '@/components/dashboard/messaging/MessageInput': {
      __esModule: true,
      default: ({ conversationId }: { conversationId: string }) => <input aria-label="Message" data-composer={conversationId} />,
    },
  };
  const require = createRequire(import.meta.url);
  const filename = resolve(process.cwd(), role === 'user'
    ? 'src/pages/user/dashboard/messages/page.tsx' : 'src/pages/manager/messages/page.tsx');
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true, target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const pageModule = { exports: {} as { default: React.ComponentType } };
  const load = (id: string): unknown => {
    if (id in boundaries) return boundaries[id];
    if (id.startsWith('@/components/')) return { __esModule: true, default: () => null };
    return require(id.startsWith('@/') ? resolve(process.cwd(), 'src', id.slice(2)) : id);
  };
  if (realComposer) {
    const composerModule = { exports: {} as { default: React.ComponentType } };
    const composerSource = ts.transpileModule(readFileSync(resolve(process.cwd(), 'src/components/dashboard/messaging/MessageInput.tsx'), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    boundaries['@/components/ui/EmojiPicker'] = {
      __esModule: true,
      default: ({ isOpen, onEmojiSelect }: { isOpen: boolean; onEmojiSelect: (emoji: string) => void }) => (
        isOpen ? <button type="button" onClick={() => onEmojiSelect('Private draft')}>Insert draft</button> : null
      ),
    };
    boundaries['@/services/mediaService'] = { uploadMediaFile: () => { throw new Error('Navigation tests must not upload files'); } };
    new Function('require', 'module', 'exports', composerSource)(load, composerModule, composerModule.exports);
    boundaries['@/components/dashboard/messaging/MessageInput'] = composerModule.exports;
  }
  // Keep the production page and router intact; isolate API/context and unrelated widgets.
  new Function('require', 'module', 'exports', compiled)(load, pageModule, pageModule.exports);

  const Provider = () => {
    const [selection, setSelection] = React.useState<string | null>(null);
    const [rows, setRows] = React.useState(() => initialIds.map((id) => ({ id })));
    const [issue, setIssue] = React.useState<messagesInbox.ConversationThreadIssue | null>(null);
    const location = useLocation();
    navigate = useNavigate();
    currentUrl = location.pathname + location.search;
    selectedId = selection;
    const setSelectedConversationId = React.useCallback((id: string | null) => {
      setIssue(null);
      setSelection(id);
    }, []);
    const clearConversationThreadIssue = React.useCallback(() => setIssue(null), []);
    const refreshConversations = React.useCallback(async () => {
      const request = deferredRefresh();
      requests.push(request);
      const result = await request.promise;
      if (result.success) setRows(result.conversationIds.map((id) => ({ id })));
      return result;
    }, []);
    return (
      <Context.Provider value={{
        conversations: rows, allConversations: rows, selectedConversationId: selection,
        setSelectedConversationId, refreshConversations, hasLoadedConversations: true, isLoading: false,
        conversationThreadIssue: issue, clearConversationThreadIssue,
        sendMessage: () => { throw new Error('Navigation tests must not send messages'); },
      }}>
        {location.pathname === pathname ? <pageModule.exports.default /> : <main data-other-route>Discover</main>}
      </Context.Provider>
    );
  };
  const host = browserWindow.document.createElement('div');
  browserWindow.document.body.append(host);
  let root = createRoot(host as unknown as HTMLDivElement);
  const render = (entries: string[]) => {
    const router = <MemoryRouter initialEntries={entries}><Provider /></MemoryRouter>;
    root.render(strictMode ? <React.StrictMode>{router}</React.StrictMode> : router);
  };
  const click = async (label: string) => {
    const button = [...host.querySelectorAll('button')].find((element) => (
      element.getAttribute('data-select') === label || element.textContent?.trim() === label
    ));
    assert.ok(button, `Missing button: ${label}`);
    await act(async () => { button.click(); });
  };
  const complete = async (index: number, result: ConversationRefreshResult) => {
    assert.ok(requests[index], `Missing refresh request ${index}`);
    await act(async () => { requests[index].complete(result); });
  };
  const restore = async () => {
    await act(async () => {
      root.unmount();
      requests.forEach((request) => request.complete({ ...failed, outcome: 'superseded' }));
    });
    browserWindow.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  };
  try {
    await act(async () => { render(search ? [pathname, pathname + search] : [pathname]); });
    return {
      host, click, complete, requests, restore,
      attach: async (name: string) => {
        const input = host.querySelector('input[type="file"]');
        assert.ok(input);
        const file = new browserWindow.File(['QA fixture'], name, { type: 'text/plain' });
        Object.defineProperty(input, 'files', { configurable: true, value: [file] });
        await act(async () => { input.dispatchEvent(new browserWindow.Event('change', { bubbles: true })); });
      },
      clickAccessible: async (name: string) => {
        const button = host.querySelector(`button[aria-label="${name}"]`);
        assert.ok(button);
        await act(async () => { (button as unknown as HTMLButtonElement).click(); });
      },
      url: () => currentUrl,
      selection: () => selectedId,
      assertThread: (id: string) => {
        assert.equal(host.querySelector('[data-thread]')?.getAttribute('data-thread'), id, 'Rendered thread must match selected row');
        assert.equal(host.querySelector('[data-composer]')?.getAttribute('data-composer'), id, 'Composer must target selected row');
      },
      go: async (to: string | number) => {
        await act(async () => { if (typeof to === 'number') navigate(to); else navigate(to); });
      },
      reload: async () => {
        const url = currentUrl;
        await act(async () => { root.unmount(); });
        root = createRoot(host as unknown as HTMLDivElement);
        await act(async () => { render([url]); });
      },
    };
  } catch (error) {
    await restore();
    throw error;
  }
};

test('User deep link opens its thread on mobile', async () => {
  const ui = await installInbox('?conversation=rent');
  try {
    ui.assertThread('rent');
    assert.equal(ui.host.querySelector('[data-thread]')?.parentElement?.classList.contains('hidden'), false);
    assert.equal(ui.host.querySelector('[data-conversation-list]')?.parentElement?.classList.contains('hidden'), true);
  } finally { await ui.restore(); }
});

test('Rent then Back then Purchase and Support select matching threads and composer destinations', async () => {
  const ui = await installInbox('?conversation=rent&filter=unread');
  try {
    await ui.click('rent');
    await ui.click('Back');
    await ui.click('purchase');
    ui.assertThread('purchase');
    assert.equal(new URL(ui.url(), 'https://estospaces.test').searchParams.get('conversation'), 'purchase');
    await ui.click('Back');
    await ui.click('support');
    ui.assertThread('support');
    const params = new URL(ui.url(), 'https://estospaces.test').searchParams;
    assert.equal(params.get('conversation'), 'support');
    assert.equal(params.get('filter'), 'unread');
  } finally { await ui.restore(); }
});

test('Changed conversation selections survive browser history and reload', async () => {
  const ui = await installInbox();
  try {
    await ui.click('purchase');
    await ui.click('support');
    ui.assertThread('support');
    await ui.go(-1);
    ui.assertThread('purchase');
    await ui.go(1);
    ui.assertThread('support');
    await ui.reload();
    ui.assertThread('support');
  } finally { await ui.restore(); }
});

test('Real composer clears private drafts and attachments when browser history changes conversations', async () => {
  const ui = await installInbox('', 'user', false, true);
  try {
    await ui.click('purchase');
    await ui.click('support');
    await ui.clickAccessible('Open emoji picker');
    await ui.click('Insert draft');
    await ui.attach('support-private.txt');
    assert.equal(ui.host.querySelector('input[aria-label="Message"]')?.getAttribute('value'), 'Private draft');
    assert.ok(ui.host.textContent?.includes('support-private.txt'));
    await ui.go(-1);
    assert.equal(ui.selection(), 'purchase');
    assert.equal(ui.host.querySelector('input[aria-label="Message"]')?.getAttribute('value'), '');
    assert.equal(ui.host.textContent?.includes('support-private.txt'), false);
    assert.equal(ui.host.textContent?.includes('Insert draft'), false);
    assert.equal(ui.host.querySelector('button[aria-label="Send message"]')?.hasAttribute('disabled'), true);
    await ui.go(1);
    assert.equal(ui.selection(), 'support');
    assert.equal(ui.host.querySelector('input[aria-label="Message"]')?.getAttribute('value'), '');
    assert.equal(ui.host.textContent?.includes('support-private.txt'), false);
  } finally { await ui.restore(); }
});

test('Browser Back to the bare inbox clears the routed thread and composer', async () => {
  const ui = await installInbox();
  try {
    await ui.go('/user/dashboard/messages?conversation=rent');
    ui.assertThread('rent');
    await ui.go(-1);
    assert.equal(ui.selection(), null);
    assert.equal(ui.host.querySelector('[data-composer]'), null);
    assert.equal(ui.host.querySelector('[data-conversation-list]')?.parentElement?.classList.contains('hidden'), false);
  } finally { await ui.restore(); }
});

test('Mobile Back removes the old conversation without dropping unrelated query parameters', async () => {
  const ui = await installInbox('?conversation=rent&filter=unread');
  try {
    await ui.click('rent');
    await ui.click('Back');
    assert.equal(ui.selection(), null);
    assert.equal(ui.url(), '/user/dashboard/messages?filter=unread');
    assert.equal(ui.host.querySelector('[data-composer]'), null);
  } finally { await ui.restore(); }
});

test('No-query inbox can switch rows through mobile Back', async () => {
  const ui = await installInbox();
  try {
    await ui.click('purchase');
    ui.assertThread('purchase');
    await ui.click('Back');
    await ui.click('support');
    ui.assertThread('support');
  } finally { await ui.restore(); }
});

for (const [name, result, title] of [
  ['missing', refreshed(), 'This enquiry thread is unavailable'],
  ['failed', failed, 'We could not refresh this enquiry'],
] as const) {
  test(`${name} deep-link refresh preserves error UI after removing the invalid query`, async () => {
    const ui = await installInbox('?conversation=missing&filter=unread');
    try {
      await ui.complete(0, result);
      assert.match(ui.host.querySelector('[role="alert"]')?.textContent || '', new RegExp(title));
      assert.equal(ui.url(), '/user/dashboard/messages?filter=unread');
      assert.equal(ui.host.querySelector('[data-composer]'), null);
      await ui.click('Back to conversations');
      assert.equal(ui.host.querySelector('[role="alert"]'), null);
    } finally { await ui.restore(); }
  });
}

for (const action of ['selection', 'Back'] as const) {
  test(`Late route refresh cannot override a newer ${action}`, async () => {
    const ui = await installInbox('?conversation=missing');
    try {
      if (action === 'selection') await ui.click('purchase');
      else await ui.go(-1);
      await ui.complete(0, refreshed([...initialIds, 'missing']));
      if (action === 'selection') ui.assertThread('purchase');
      else assert.equal(ui.selection(), null);
      assert.equal(ui.host.querySelector('[role="alert"]'), null);
    } finally { await ui.restore(); }
  });

  test(`Late unavailable-thread Retry cannot override a newer ${action}`, async () => {
    const ui = await installInbox('?conversation=missing');
    try {
      await ui.complete(0, refreshed());
      await ui.click('Retry');
      if (action === 'selection') await ui.click('purchase');
      else await ui.click('Back to conversations');
      await ui.complete(1, refreshed([...initialIds, 'missing']));
      if (action === 'selection') ui.assertThread('purchase');
      else assert.equal(ui.selection(), null);
      assert.equal(ui.host.querySelector('[role="alert"]'), null);
    } finally { await ui.restore(); }
  });
}

test('Manager control clears the stale deep link before selecting another conversation', async () => {
  const ui = await installInbox('?conversation=rent&filter=unread', 'manager');
  try {
    await ui.click('Back to conversations');
    await ui.click('purchase');
    ui.assertThread('purchase');
    assert.equal(new URL(ui.url(), 'https://estospaces.test').searchParams.get('filter'), 'unread');
  } finally { await ui.restore(); }
});

test('Pending route refresh cannot return to the inbox after its page unmounts', async () => {
  const ui = await installInbox('?conversation=missing');
  try {
    assert.equal(ui.requests.length, 1);
    await ui.go('/user/dashboard/discover');
    assert.ok(ui.host.querySelector('[data-other-route]'));
    await ui.complete(0, refreshed());
    assert.equal(ui.url(), '/user/dashboard/discover');
    assert.equal(ui.selection(), null);
    assert.equal(ui.host.querySelector('[data-composer]'), null);
  } finally { await ui.restore(); }
});

test('Pending Retry cannot reopen a conversation after its page unmounts', async () => {
  const ui = await installInbox('?conversation=missing');
  try {
    await ui.complete(0, refreshed());
    await ui.click('Retry');
    await ui.go('/user/dashboard/discover');
    assert.ok(ui.host.querySelector('[data-other-route]'));
    await ui.complete(1, refreshed([...initialIds, 'missing']));
    assert.equal(ui.url(), '/user/dashboard/discover');
    assert.equal(ui.selection(), null);
    assert.equal(ui.host.querySelector('[data-composer]'), null);
  } finally { await ui.restore(); }
});

for (const [name, result, title] of [
  ['missing', refreshed(), 'This enquiry thread is unavailable'],
  ['failed', failed, 'We could not refresh this enquiry'],
] as const) {
  test(`StrictMode ${name} refresh displays its error after effect cleanup and setup replay`, async () => {
    const ui = await installInbox('?conversation=missing&filter=unread', 'user', true);
    try {
      assert.equal(ui.requests.length, 2, 'StrictMode must replay the route refresh effect');
      await ui.complete(0, { ...failed, outcome: 'superseded' });
      await ui.complete(1, result);
      assert.match(ui.host.querySelector('[role="alert"]')?.textContent || '', new RegExp(title));
      assert.equal(ui.url(), '/user/dashboard/messages?filter=unread');
      assert.equal(ui.selection(), null);
      assert.equal(ui.host.querySelector('[data-composer]'), null);
    } finally { await ui.restore(); }
  });
}

test('StrictMode accessible deep link opens its conversation on mobile', async () => {
  const ui = await installInbox('?conversation=rent', 'user', true);
  try {
    ui.assertThread('rent');
    assert.equal(ui.host.querySelector('[data-thread]')?.parentElement?.classList.contains('hidden'), false);
    assert.equal(ui.requests.length, 0);
  } finally { await ui.restore(); }
});
