/*
 * File: Cocoon/Source/Service/Localization.ts
 * Responsibility: The aggregator module for the Localization service.
 * Modified: 2025-06-18
 * Dependency: ./Localization/Live.js, ./Localization/Service.js
 * Export: Live, Service
 */

/**
 * @module Localization
 * @description This module provides the Localization service, which manages the
 * loading and caching of localized string bundles (NLS) for extensions.
 */

import Live from "./Localization/Live.js";
import Service from "./Localization/Service.js";

export { Service, Live };
