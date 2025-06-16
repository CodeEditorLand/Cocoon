/*
 * File: Cocoon/Source/Service/FileSystemInformation.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:04 UTC
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
