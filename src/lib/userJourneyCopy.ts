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
    headerTitle: 'Get your home in 24 hours',
    headerSubtitle:
      'We guide you step by step from choosing a home to getting the keys.',
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
    noSelectionTitle: 'No journey is selected.',
    noSelectionDescription: 'Open a journey from the list to continue.',
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
  brokerRequestTitle: 'We are finding the best nearby broker now',
  brokerRequestPrimaryLabel: 'Open broker request',
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

export const getBrokerRequestCopy = () => ({
  panelTitle: 'Ask us to help',
  panelSubtitle: 'We can find a nearby broker and bring home choices back to you here.',
  useDispatchTitle: 'Ask for nearby broker help',
  useDispatchSubtitle: 'We look for available brokers closest to your preferred area first.',
  activeRequestEyebrow: 'Broker request',
  openRequestLabel: 'Open broker request',
  focusRequestLabel: 'Focus broker request',
  restartRequestLabel: 'Start another request',
  refreshRequestLabel: 'Refresh update',
  detailsToggleLabel: 'See details',
  nearbyBrokersTitle: 'Nearby brokers',
  nearbyBrokersSubtitle: 'These are the brokers currently closest to your preferred area.',
  nearbyBrokersLoading: 'Looking for nearby brokers...',
  nearbyBrokersEmpty: 'Add a postcode to see nearby brokers.',
  nearbyBrokerAvailableLabel: 'Available',
  nearbyBrokerQueuedLabel: 'Waiting',
  liveCountdownLabel: 'Response time',
  matchedBrokerLabel: 'Broker found',
  homeChoicesLabel: 'Home choices',
  requestReferenceLabel: 'Request reference',
  acceptedAtLabel: 'Accepted at',
  requestFormAction: 'Send request',
  requestFormActionAgain: 'Send a new request',
  requestFormHelper: 'We will share updates here so you can move forward without guessing what happens next.',
  selectionSuccess: 'Home selected. Your 24-hour journey is ready.',
  rematchSuccess: 'We are finding another broker for you now.',
});

export const getCaseFileSupportCopy = (role: UserJourneyRole) => {
  if (role !== 'user') {
    return {
      primaryLabel: 'Continue in fast-track',
      primaryDescription:
        'Use the live workspace for viewing, decision, agreement, payment, and handover.',
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
