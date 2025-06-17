/*
 * File: Cocoon/Source/Service/Document/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:38 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Document)
 * @description The live implementation Layer for the Document service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Document service.
 * It depends on the IPC service to receive updates from the host.
 */
export default Layer.effect(Service, Definition);
