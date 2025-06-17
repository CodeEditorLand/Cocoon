/*
 * File: Cocoon/Source/Service/InitData.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:29 UTC
 * Export: default
 */

/**
 * @module InitData
 * @description This module provides the InitData service, a value service that
 * holds the initial data sent from the Mountain host process. This data is
 * essential for bootstrapping many other services.
 */

export { default as InitDataLayer } from "./InitData/Live.js";
export { default as Service } from "./InitData/Service.js";
