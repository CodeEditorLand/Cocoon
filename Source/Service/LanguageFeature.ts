/**
 * @module LanguageFeature
 * @description This module provides the `vscode.languages` API implementation,
 * managing the registration and invocation of all language feature providers.
 */

import Live from "./LanguageFeature/Live.js";
import Service from "./LanguageFeature/Service.js";

export { Service, Live };
