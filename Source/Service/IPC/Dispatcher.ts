/*
 * File: Cocoon/Source/Service/IPC/Dispatcher.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:02 UTC
 * Dependency: ./Dispatcher/Live.js, ./Dispatcher/Service.js
 * Export: Live, Service
 */

/**
 * @module Dispatcher (IPC)
 * @description Provides the Dispatcher service, which routes all incoming RPC
 * messages from the Mountain host to the appropriate handlers within Cocoon.
 */

import Live from "./Dispatcher/Live.js";
import Service from "./Dispatcher/Service.js";

export { Service, Live };
