/*
 * File: Cocoon/Source/Service/FileSystemInformation.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:53:04 UTC
 * Dependency: ./FileSystemInformation/Live.js, ./FileSystemInformation/Service.js
 * Export: Live, Service
 */

/**
 * @module FileSystemInformation
 * @description This module provides the FileSystemInformation service, which manages
 * filesystem provider capabilities, especially path case-sensitivity.
 */

import Live from "./FileSystemInformation/Live.js";
import Service from "./FileSystemInformation/Service.js";

export { Service, Live };
