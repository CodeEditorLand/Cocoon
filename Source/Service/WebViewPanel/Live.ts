/*
 * File: Cocoon/Source/Service/WebViewPanel/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:10 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (WebViewPanel)
 * @description The live implementation Layer for the WebViewPanel service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the WebViewPanel service.
 * It depends on the IPC service for communication and Log for diagnostics.
 */
export default Layer.effect(Service, Definition);
