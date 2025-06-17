/*
 * File: Cocoon/Source/Core/HostKindPicker.ts
 * Responsibility: Provides the HostKindPicker service to determine VS Code extension compatibility with the Cocoon (Node.js) extension host, enabling MVP Path A's sidecar-based extension support.
 * Modified: 2025-06-17 10:32:52 UTC
 * Dependency: ./HostKindPicker/Live.js, ./HostKindPicker/Service.js
 * Export: Live, Service
 */

/**
 * @module HostKindPicker (Core)
 * @description This module provides the HostKindPicker service, which determines if
 * an extension is compatible with the Cocoon (Node.js) extension host. It provides
 * the `Live` implementation Layer for the service.
 */

import Live from "./HostKindPicker/Live.js";
import Service from "./HostKindPicker/Service.js";

export { Service, Live };
