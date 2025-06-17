/*
 * File: Cocoon/Source/Service/TreeView.ts
 * Responsibility: The aggregator module for the TreeView service.
 * Modified: 2025-06-18
 * Dependency: ./TreeView/Live.js, ./TreeView/Service.js
 * Export: Live, Service
 */

/**
 * @module TreeView
 * @description This module provides the `vscode.window.createTreeView` API, allowing
 * extensions to contribute custom tree views to the sidebar.
 */

import Live from "./TreeView/Live.js";
import Service from "./TreeView/Service.js";

export { Service, Live };
