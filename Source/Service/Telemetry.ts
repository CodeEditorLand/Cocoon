/*
 * File: Cocoon/Source/Service/Telemetry.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:48 UTC
 * Dependency: ./Telemetry/Live.js, ./Telemetry/Service.js
 * Export: Live, Service
 */

/**
 * @module Telemetry
 * @description This module provides the `vscode.env.telemetry` API implementation,
 * handling event collection and forwarding to the host.
 */

import Live from "./Telemetry/Live.js";
import Service from "./Telemetry/Service.js";

export { Service, Live };
