/*
 * File: Cocoon/Source/Service/StoragePath/Live.ts
 * Responsibility: Provides the storage path configuration from the Mountain backend's InitData service to other components via Effect's dependency injection layer, enabling persistent storage access for features like user settings or extension management.
 * Modified: 2025-06-17 10:38:43 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the StoragePath service.
 * It depends on the FileSystem, Log, and InitData services.
 */
export default Layer.effect(Service, Definition);
