/*
 * File: Cocoon/Source/Service/FileSystemInformation.ts
 * Responsibility: Provides filesystem capability information (notably path case-sensitivity) to the Cocoon sidecar, enabling VS Code extensions to handle platform-specific file system behaviors correctly.
 * Modified: 2025-06-17 10:32:34 UTC
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
