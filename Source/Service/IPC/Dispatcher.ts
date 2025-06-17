/*
 * File: Cocoon/Source/Service/IPC/Dispatcher.ts
 * Responsibility: Provides the Dispatcher service that routes incoming RPC messages from the Mountain backend to appropriate handlers within the Cocoon sidecar via the Vine IPC layer, enabling communication for VS Code extension hosting.
 * Modified: 2025-06-17 10:32:32 UTC
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
