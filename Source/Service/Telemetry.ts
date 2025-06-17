/*
 * File: Cocoon/Source/Service/Telemetry.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:20 UTC
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
