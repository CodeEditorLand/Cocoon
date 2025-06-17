/*
 * File: Cocoon/Source/Service/Document/Live.ts
 * Responsibility: Implements the live Layer for the Document service in the Cocoon sidecar, providing real-time document management capabilities through IPC communication with the Mountain backend via the Vine transport layer.
 * Modified: 2025-06-17 21:19:27 UTC
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
