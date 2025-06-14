/**
 * @module ESMInterceptor (Core)
 * @description The main module for the ESMInterceptor service, which installs a
 * Node.js loader hook to intercept `import 'vscode'` statements.
 */

import Live from "./ESMInterceptor/Live.js";
import Service from "./ESMInterceptor/Service.js";

export { Service, Live };
