/*
 * File: Cocoon/Source/Service/TreeView/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:39:26 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (TreeView)
 * @description This module provides the `Live` implementation Layer for the TreeView service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the TreeView service.
 * It depends on the IPC and Command services.
 */
export default Layer.effect(Service, Definition);
