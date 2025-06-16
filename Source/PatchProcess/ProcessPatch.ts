/*
 * File: Cocoon/Source/PatchProcess/ProcessPatch.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:19 UTC
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
