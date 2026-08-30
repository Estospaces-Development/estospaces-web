import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('user journey separates formal applications from agent requests', () => {
    const source = readSource('src/components/dashboard/ApplicationTimelineWidget.tsx');
    assert.match(source, /id: 'applications', label: 'Applications'/);
    assert.match(source, /id: 'requests', label: 'Agent requests'/);
    assert.match(source, /setApplications\(\s*\[\.\.\.mappedSaleProgressions, \.\.\.mappedApps\]/);
    assert.match(source, /setBrokerRequests\(mappedBrokerRequests/);
});

test('dashboard agent request workspace follows the active journey', () => {
    const dashboard = readSource('src/pages/user/dashboard/DashboardClient.tsx');
    const widget = readSource('src/components/dashboard/BrokerRequestWidget.tsx');
    assert.match(dashboard, /activeBrokerRequest && shouldAutoResumeBrokerRequest\(activeBrokerRequest\)/);
    assert.match(widget, /requestedWorkspaceRequestId \|\| preferredRequestId/);
    assert.match(widget, /getBrokerRequestById\(exactRequestId/);
    assert.match(widget, /activeRequestLoadIdRef\.current !== loadId/);
    assert.match(widget, /setBudgetError\(budget\.trim\(\)[\s\S]*getBrokerRequestBudgetError\(budget, type\)/);
    assert.match(widget, /requestedWorkspaceRequestId === explicitResetRequestIdRef\.current/);
    assert.match(widget, /preferredRequestId === effectiveDismissedRequestId/);
    assert.match(widget, /getUserScopedRequestKey\(DISMISSED_REQUEST_KEY, user\?\.id\)/);
    assert.match(widget, /cancelBrokerRequestAction\(asyncActionStateRef\.current\);[\s\S]*setLoading\(false\);/);
    assert.match(widget, /handleStartAnotherRequest = useCallback\(\(\) => \{\s*if \(hasActiveBrokerRequestAction\(asyncActionStateRef\.current\)\) \{\s*return;/);
    assert.match(widget, /createdRequestIdRef\.current = resolvedRequest\.id/);
    assert.match(widget, /createdRequestIdRef\.current\s*\|\|\s*\(suppressAutoResume/);
    assert.match(widget, /localStorage\.setItem\(dismissedKey, requestIdToDismiss\)/);
    assert.match(widget, /const legacyDismissedRequestId = localStorage\.getItem\(DISMISSED_REQUEST_KEY\)/);
    assert.match(widget, /prefetchedRequests = await getUserBrokerRequests[\s\S]*\(prefetchedRequests\.data \|\| \[\]\)\.some\(\(request\) => request\.id === legacyDismissedRequestId\)/);
    assert.match(widget, /localStorage\.setItem\(dismissedKey, legacyDismissedRequestId\)/);
    assert.match(widget, /localStorage\.removeItem\(DISMISSED_REQUEST_KEY\)/);
    assert.match(widget, /suppressAutoResume \|\| preferredRequestId === effectiveDismissedRequestId/);
    assert.match(widget, /getUserScopedRequestKey\(NEW_REQUEST_MODE_KEY, user\?\.id\)/);
    assert.match(widget, /sessionStorage\.setItem\(newRequestModeKey, 'true'\)/);
    assert.match(widget, /beginBrokerRequestAction\(asyncActionStateRef\.current\)/);
    assert.match(widget, /isAsyncActionCurrent\(action\)/);
    assert.match(widget, /hasActiveBrokerRequestAction\(asyncActionStateRef\.current\)/);
    assert.match(widget, /setDismissedRequestId\(null\);\s*clearNewRequestMode\(\);\s*const resolvedRequest = data/);
    assert.match(widget, /setActiveRequest\(null\);[\s\S]*publishBrokerRequestWorkspaceSelection\(null\);[\s\S]*getUserScopedRequestKey\(DISMISSED_REQUEST_KEY, user\?\.id\)/);
});

test('hidden internal conversations cannot be loaded through a direct id', () => {
    const source = readSource('src/contexts/MessagesContext.tsx');
    assert.match(source, /authorizedConversationIdsRef\.current = new Set\(visibleBackendConversations\.map\(\(conversation\) => conversation\.id\)\)/);
    assert.match(source, /if \(!authorizedConversationIdsRef\.current\.has\(conversationId\)\) \{\s*return false;/);
    assert.doesNotMatch(source, /ensureConversationShell/);
    assert.match(source, /setHasLoadedConversations\(\(wasLoaded\) => resolveHasLoadedConversations\(wasLoaded, true\)\)/);
    assert.match(source, /mergeUserVisibleConversations\(requestUserId, backendConversations\)/);
    assert.match(source, /authTokenVersion !== getAuthTokenVersion\(\)/);
    assert.match(source, /!isUserVisibleConversation\(backendConversation\)/);
    assert.match(source, /outcome: 'superseded'/);
    assert.match(source, /silentConversationLoadGenerationRef\.current !== null/);
    assert.match(source, /silentConversationLoadGenerationRef\.current === loadGeneration/);
    assert.match(source, /setConversations\(\(previous\) => previous\.filter\(\(conversation\) => conversation\.id !== conversationId\)\)/);
    assert.match(source, /!silent[\s\S]*setHasLoadedConversations\(true\);[\s\S]*outcome: 'failed'/);
    assert.doesNotMatch(source, /selectedConversation && selectedConversation\.messages\.length === 0/);
    assert.equal((source.match(/clearAuthorizedConversations\(/g) || []).length, 1);
});

test('broker request location controls have distinct accessible labels', () => {
    const source = readSource('src/components/dashboard/BrokerRequestWidget.tsx');
    assert.match(source, /htmlFor="broker-request-location"[\s\S]*id="broker-request-location"/);
    assert.match(source, /htmlFor="broker-request-location-code"[\s\S]*id="broker-request-location-code"/);
});

test('unavailable mobile conversation deep links expose the retry state', () => {
    const source = readSource('src/pages/user/dashboard/messages/page.tsx');
    const managerSource = readSource('src/pages/manager/messages/page.tsx');
    assert.match(source, /setRouteConversationIssue\(createUnavailableConversationThreadIssue\(queryResolution\.conversationId\)\);\s*setMobileView\('thread'\);/);
    assert.match(source, /requestedConversationIdRef\.current !== conversationId/);
    assert.match(source, /if \(result\.conversationIds\.includes\(conversationId\)\)[\s\S]*setRouteConversationIssue\(createUnavailableConversationThreadIssue\(conversationId\)\)/);
    assert.match(managerSource, /if \(result\.conversationIds\.includes\(conversationId\)\)[\s\S]*setRouteConversationIssue\(createUnavailableConversationThreadIssue\(conversationId\)\)/);
});

test('manager conversation deep links ignore obsolete refresh completions', () => {
    const source = readSource('src/pages/manager/messages/page.tsx');
    assert.match(source, /requestedConversationIdRef\.current !== conversationId/);
    assert.match(source, /onSelectConversation=\{\(conversationId\) => \{[\s\S]*setRouteConversationIssue\(null\);[\s\S]*buildConversationListUrl/);
});

test('narrow pagination uses a compact page indicator instead of clipped tokens', () => {
    const source = readSource('src/components/ui/PaginationBar.tsx');
    assert.match(source, /max-\[360px\]:hidden/);
    assert.match(source, /Page \{safeCurrentPage\} \/ \{totalPages\}/);
});

test('discovery cards use the neutral unavailable state instead of a branded skeleton image', () => {
    const source = readSource('src/components/dashboard/PropertyCard.tsx');
    assert.match(source, /const displayImages = images;/);
    assert.match(source, /src=\{displayImages\[currentImageIndex\]\}/);
});
