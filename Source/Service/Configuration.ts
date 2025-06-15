/**
 * @module Configuration
 * @description This module provides the `vscode.workspace.getConfiguration` API
 * implementation, managing access to configuration settings.
 */

import * as Error from "./Configuration/Error.js";
import GetConfiguration from "./Configuration/GetConfiguration.js";
import Live from "./Configuration/Live.js";
import Service from "./Configuration/Service.js";
import type WorkSpaceConfiguration from "./Configuration/Type/WorkSpaceConfiguration.js";

export { Service, Live, GetConfiguration, type WorkSpaceConfiguration, Error };
