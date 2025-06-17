/*
 * File: Cocoon/Source/Service/Log.ts
 * Responsibility: The aggregator module for the Log service.
 * Modified: 2025-06-18
 * Dependency: ./Log/Live.js, ./Log/Service.js
 * Export: Live, Service
 */

/**
 * @module Log
 * @description This module provides a simple, internal logging service.
 * It's a facade over the main `Effect` logger, allowing other services
 * to declare a dependency on logging in a consistent way.
 */

import Live from "./Log/Live.js";
import Service from "./Log/Service.js";

export { Service, Live };
