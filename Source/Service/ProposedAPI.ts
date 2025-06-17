/*
 * File: Cocoon/Source/Service/ProposedAPI.ts
 * Responsibility: The aggregator module for the ProposedAPI service.
 * Modified: 2025-06-18
 * Dependency: ./ProposedAPI/Live.js, ./ProposedAPI/Service.js
 * Export: Live, Service
 */

/**
 * @module ProposedAPI
 * @description This module provides the ProposedAPI service, which checks the
 * enablement status of experimental VS Code APIs for extensions.
 */

import Live from "./ProposedAPI/Live.js";
import Service from "./ProposedAPI/Service.js";

export { Service, Live };
