import * as Sentry from '@sentry/react';

// Sentry only sees JavaScript exceptions. It cannot report a tab that iOS Safari
// kills under memory pressure, because no JS runs after the renderer dies. So an
// absence of events for a reported crash is itself evidence: it points away from
// a thrown error and toward the browser tearing the page down.

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const initErrorReporting = () => {
  // Unset DSN is the normal case for dev and for anyone running a local build;
  // stay silent rather than reporting into a project that isn't theirs.
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    // Errors only. Tracing and session replay would burn the free-tier quota
    // without helping with the crashes we are chasing.
    tracesSampleRate: 0,
    sendDefaultPii: false
  });
};

export const captureException = (error, context) => {
  if (!dsn) {
    return;
  }

  Sentry.captureException(error, context ? { extra: context } : undefined);
};

export const addBreadcrumb = (message, data) => {
  if (!dsn) {
    return;
  }

  Sentry.addBreadcrumb({ message, data, level: 'info' });
};
