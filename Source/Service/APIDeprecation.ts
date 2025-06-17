/*
 * File: Cocoon/Source/Service/APIDeprecation.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 11:14:25 UTC
 * Dependency: ./APIDeprecation/Live.js, ./APIDeprecation/Service.js
 * Export: APIDeprecationLive, Service
 */

/**
 * @module APIDeprecation
 * @description This module provides the APIDeprecation service, which is used to
 * report and handle the usage of deprecated APIs by extensions.
 */

import APIDeprecationLive from "./APIDeprecation/Live.js";
import Service from "./APIDeprecation/Service.js";

export { Service, APIDeprecationLive };
