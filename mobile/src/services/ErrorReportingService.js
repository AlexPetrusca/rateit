// Native/default build: no error reporting backend. The web build supplies the
// real implementation in ErrorReportingService.web.js, which Metro prefers when
// bundling for web. Keeping the browser SDK out of this file is deliberate: it
// touches DOM globals that do not exist on iOS/Android.

export const initErrorReporting = () => {};

export const captureException = () => {};

export const addBreadcrumb = () => {};
