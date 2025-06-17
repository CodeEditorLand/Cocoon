/*
 * File: Cocoon/Source/Service/SecretStorage/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:14 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (SecretStorage)
 * @description The live implementation Layer for the SecretStorage service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the SecretStorage service.
 * It depends on the IPC and Log services.
 */

export default Layer.effect(Service, Definition);
