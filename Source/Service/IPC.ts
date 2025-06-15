/**
 * @module IPC
 * @description This module provides the primary Inter-Process Communication (IPC)
 * service for Cocoon. It provides a managed gRPC connection to and from the
 * Mountain host, exposing high-level effects for communication.
 */

import type IPCConfigurationService from "./IPC/Configuration.js";
import * as Error from "./IPC/Error.js";
import Live from "./IPC/Live.js";
import Service from "./IPC/Service.js";

export { Service, Live, type IPCConfigurationService, Error };
