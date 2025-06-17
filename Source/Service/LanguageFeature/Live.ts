/*
 * File: Cocoon/Source/Service/LanguageFeature/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:53:15 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (LanguageFeature)
 * @description The live implementation Layer for the LanguageFeature service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the LanguageFeature service.
 * It has many core dependencies for handling RPC calls, including IPC for
 * transport, Document for accessing document state, Cancellation for handling
 * cancellation signals, and Command for converting command objects.
 */
export default Layer.effect(Service, Definition);
