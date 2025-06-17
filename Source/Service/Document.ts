/*
 * File: Cocoon/Source/Service/Document.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:37 UTC
 * Dependency: ./Document/Live.js, ./Document/Service.js, ./Document/Type.js
 * Export: Live, Service, type DocumentEvent
 */

/**
 * @module Document
 * @description This module provides the Document service, which is the single
 * source of truth for the state of all open text documents in the extension host.
 */

import Live from "./Document/Live.js";
import Service from "./Document/Service.js";
import type DocumentEvent from "./Document/Type.js";

export { Service, Live, type DocumentEvent };
