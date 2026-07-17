import type { FastTrackCase, FastTrackStage } from '@/services/fastTrackService';

export type UserJourneyRole = 'user' | 'manager' | 'admin';
export type UserJourneyModule =
  | 'core_files'
  | 'preview'
  | 'case_chat'
  | 'activity'
  | 'connected_records';

const USER_STAGE_LABELS: Record<FastTrackStage, string> = {
  selected: 'Choose your home',
  documents: 'Share your documents',
  viewing: 'Book your viewing',
  decision: 'Review the decision',
  agreement: 'Sign the agreement',
  handover: 'Get your keys',
};

const USER_MODULE_LABELS: Record<UserJourneyModule, string> = {
  core_files: 'Documents',
  preview: 'Preview',
  case_chat: 'Messages',
  activity: 'Updates',
  connected_records: 'Records',
};

export const getJourneyStageLabel = (
  stage: FastTrackStage,
  journeyMode: FastTrackCase['journeyMode'],
  role: UserJourneyRole,
) => {
  if (role !== 'user') {
    switch (stage) {
      case 'documents':
        return 'Documents';
      case 'viewing':
        return 'Viewing';
      case 'decision':
        return journeyMode === 'sale' ? 'Offer' : 'Decision';
      case 'agreement':
        return 'Agreement';
      case 'handover':
        return 'Handover';
      default:
        return 'Selected';
    }
  }

  if (stage === 'decision' && journeyMode === 'sale') {
    return 'Review the offer';
  }
  if (stage === 'agreement' && journeyMode === 'sale') {
    return 'Legal, exchange, and agreement';
  }
  if (stage === 'handover' && journeyMode === 'sale') {
    return 'Completion and keys';
  }

  return USER_STAGE_LABELS[stage];
};

export const getJourneyModuleLabel = (
  module: UserJourneyModule,
  role: UserJourneyRole,
) => {
  if (role !== 'user') {
    switch (module) {
      case 'core_files':
        return 'Core files';
      case 'case_chat':
        return 'Case chat';
      case 'activity':
        return 'Activity';
      case 'connected_records':
        return 'Connected records';
      default:
        return 'Preview';
    }
  }

  return USER_MODULE_LABELS[module];
};

export const getJourneyChromeCopy = (role: UserJourneyRole) => {
  if (role !== 'user') {
    return {
      headerTitle: 'Fast-track workspace',
      headerSubtitle:
        'One calm workspace from property selection to handover. The workflow stays visible and the secondary tools stay customizable.',
      showRailLabel: 'Show cases',
      hideRailLabel: 'Collapse cases',
      pageOptionsLabel: 'Customize',
      caseRailTitle: 'Cases',
      caseSingular: 'case',
      casePlural: 'cases',
      searchPlaceholder: 'Search property or client',
      emptyCaseList: 'No fast-track cases match this filter.',
      mastheadDeadlineLabel: '24h',
      mastheadStageLabel: 'Current stage',
      mastheadNextLabel: 'Focus',
      mastheadLayoutLabel: 'Tune layout',
      utilityDockTitle: 'Utility dock',
      utilityDockDescription: 'Keep the secondary tools close, but only one active at a time.',
      drawerEyebrow: 'Customize workspace',
      drawerTitle: 'Tune the secondary layout',
      drawerDescription:
        'Mandatory workflow areas stay visible. These controls only change the supporting layout.',
      metricsDescription: 'Show the active/completed/cancelled summary at the top.',
      caseRailDescription: 'Keep the main workspace in focus and open the case rail on demand.',
      makeDefaultLabel: 'Make default',
      moduleVisibleLabel: 'Visible',
      moduleHiddenLabel: 'Hidden',
      moduleDefaultDescription: 'Opens by default',
      moduleAvailableDescription: 'Available in the utility dock',
      noSelectionTitle: 'No fast-track case is selected.',
      noSelectionDescription: 'Choose a case from the rail to continue the workflow.',
    };
  }

  return {
    headerTitle: 'Fast-track workspace',
    headerSubtitle:
      'Your selected home, documents, viewing, decision, agreement, and handover stay together here.',
    showRailLabel: 'See all journeys',
    hideRailLabel: 'Hide journeys',
    pageOptionsLabel: 'Page options',
    caseRailTitle: 'Your journeys',
    caseSingular: 'journey',
    casePlural: 'journeys',
    searchPlaceholder: 'Search your journeys',
    emptyCaseList: 'No journeys match this filter.',
    mastheadDeadlineLabel: '24h',
    mastheadStageLabel: 'Where you are now',
    mastheadNextLabel: 'What happens next',
    mastheadLayoutLabel: 'Page options',
    utilityDockTitle: 'Helpful tools',
    utilityDockDescription: 'Open extra help only when you need it.',
    drawerEyebrow: 'Page options',
    drawerTitle: 'Adjust this page',
    drawerDescription:
      'Your main journey always stays visible. These settings only change the supporting details.',
    metricsDescription: 'Show the small progress summary near the top of the page.',
    caseRailDescription: 'Keep the page focused on your next step and open your journey list when needed.',
    makeDefaultLabel: 'Open first',
    moduleVisibleLabel: 'Shown',
    moduleHiddenLabel: 'Hidden',
    moduleDefaultDescription: 'Opens first in Helpful tools',
    moduleAvailableDescription: 'Available under Helpful tools',
      noSelectionTitle: 'Choose a journey to continue.',
      noSelectionDescription: 'Open a journey from the list when you want to switch context.',
  };
};

export const getDashboardSimplificationCopy = () => ({
  greetingSubtitle: 'Your next step is ready.',
  nextStepEyebrow: 'Your next step',
  noJourneyTitle: 'Start with one simple step',
  noJourneySummary:
    'Choose a home yourself or ask us to help you find one nearby.',
  noJourneyPrimaryLabel: 'Find a home',
  noJourneySecondaryLabel: 'Ask us to help',
  brokerRequestTitle: 'We are finding the nearest property agent now',
  brokerRequestPrimaryLabel: 'Open agent request',
  brokerRequestSecondaryLabel: 'See details',
  activeJourneyTitle: 'Get your home in 24 hours',
  activeJourneyPrimaryLabel: 'Continue your journey',
  activeJourneySecondaryLabel: 'See all journeys',
  completedJourneyTitle: 'Your latest journey is complete',
  completedJourneyPrimaryLabel: 'View your home',
  completedJourneySecondaryLabel: 'See all journeys',
  searchTitle: 'Find a home',
  searchSubtitle: 'Search sale and rental homes in one place.',
  quickRentLabel: 'Rent a home',
  quickBuyLabel: 'Buy a home',
  quickSavedLabel: 'Saved homes',
  mapTitle: 'Homes near you',
  mapSubtitle: 'Open a marker to see the home and take the next step.',
});

const getAgentRequestActionLabel = (requestType?: string, countryCode?: string) => {
  const isUkMarket = countryCode === 'GB';

  switch (requestType) {
    case 'rent':
      return isUkMarket ? 'Request nearest letting agency' : 'Request nearest property agent';
    case 'sell':
      return 'Request property agent';
    default:
      return 'Request nearest property agent';
  }
};

export const getBrokerRequestCopy = (requestType?: string, countryCode?: string) => ({
  panelTitle: 'Ask us to help',
  panelSubtitle: 'We can find the nearest property agent and bring matching home choices back here.',
  useDispatchTitle: 'Request nearest property agent',
  useDispatchSubtitle: countryCode === 'GB'
    ? 'We look for the nearest available broker or letting agency first.'
    : 'We look for the nearest available property agent first.',
  activeRequestEyebrow: 'Agent request',
  restartRequestLabel: 'Start another request',
  refreshRequestLabel: 'Refresh update',
  detailsToggleLabel: 'See details',
  nearbyBrokersTitle: 'Nearest property agents',
  nearbyBrokersSubtitle: 'These are the nearest available property agents for your area.',
  nearbyBrokersLoading: 'Looking for nearby property agents...',
  nearbyBrokersEmpty: countryCode === 'GB'
    ? 'Add a postcode to see nearby property agents.'
    : 'Add a PIN code to see nearby property agents.',
  nearbyBrokerAvailableLabel: 'Available',
  nearbyBrokerQueuedLabel: 'Waiting',
  liveCountdownLabel: 'Response time',
  matchedBrokerLabel: 'Agent found',
  homeChoicesLabel: 'Home choices',
  requestReferenceLabel: 'Request reference',
  acceptedAtLabel: 'Accepted at',
  requestFormAction: getAgentRequestActionLabel(requestType, countryCode),
  requestFormActionAgain: 'Send another request',
  requestFormHelper: 'We share every update here so you always know who is responding and what happens next.',
  selectionSuccess: 'Home selected. Your 24-hour journey is ready.',
  rematchSuccess: 'We are finding another property agent for you now.',
});

export const getCaseFileSupportCopy = (role: UserJourneyRole) => {
  if (role !== 'user') {
    return {
      primaryLabel: 'Continue in fast-track',
      primaryDescription:
        'Use the live workspace for viewing, decision, agreement, and handover.',
      secondaryLabel: 'Open document lane',
      secondaryDescription: 'Jump straight to the shared document lane inside fast-track.',
      supportTitle: 'Case file is support-only. Continue the journey in fast-track.',
      supportDescription:
        'This page keeps the shared record clean, but the live actions stay in the fast-track workspace. Open the live case when you need to move the journey forward.',
      quickLinksTitle: 'Quick links',
      quickLinksDescription: 'Open the live fast-track workspace or jump straight to its document lane.',
      noBlockersDescription:
        'The support file is clear. Continue the live journey in fast-track and keep this page for documents, audit context, and supporting requests.',
      helperFooter: 'Continue the live workflow in fast-track from the overview.',
    };
  }

  return {
    primaryLabel: 'Continue your 24-hour journey',
    primaryDescription: 'Use your live journey for viewing, decisions, signing, and key handover.',
    secondaryLabel: 'Open documents',
    secondaryDescription: 'Jump straight to the shared document section in your journey.',
    supportTitle: 'This page stores your records. Live actions happen in your 24-hour journey.',
    supportDescription:
      'Keep this page for shared records and documents. Open your live journey when you need to move the next step forward.',
    quickLinksTitle: 'Quick links',
    quickLinksDescription: 'Open your live journey or jump straight to its documents.',
    noBlockersDescription:
      'Your record is clear. Keep this page for documents and history, and use your 24-hour journey for live steps.',
    helperFooter: 'Continue your 24-hour journey from the overview.',
  };
};
