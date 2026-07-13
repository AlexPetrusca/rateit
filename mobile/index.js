import { registerRootComponent } from 'expo';
import App from './src/App.jsx';
// Extensionless on purpose: Metro only picks the platform variant
// (ErrorReportingService.web.js) when the import has no explicit extension.
import { initErrorReporting } from './src/services/ErrorReportingService';

initErrorReporting();

registerRootComponent(App);
