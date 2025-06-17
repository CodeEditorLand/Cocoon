/*
 * File: Cocoon/Source/PatchProcess/ProcessPatch.ts
 * Responsibility: Provides the ProcessPatch service entry point for Cocoon's sidecar, exposing native process patching functions and configuration to enable VS Code extension compatibility within the Node.js environment.
 * Modified: 2025-06-17 10:32:47 UTC
 * Dependency: ./Live.js, ./Service.js
 * Export: Live, Service
 */

/**
 * @module ProcessPatch
 * @description This module defines the service that provides the necessary native
 * functions and configuration for the other process patching Effects. It serves
 * as the public entry point for the ProcessPatch service.
 */

import { Live } from "./Live.js";
import Service from "./Service.js";

export { Service, Live };
