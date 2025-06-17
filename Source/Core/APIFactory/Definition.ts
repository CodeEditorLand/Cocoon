/*
 * File: Cocoon/Source/Core/APIFactory/Definition.ts
 * Responsibility: The live implementation of the APIFactory service.
 * Modified: 2025-06-17 10:53:05 UTC
 */

/**
 * @module Definition (APIFactory)
 * @description The live implementation of the APIFactory service. This is
 * responsible for creating sandboxed `vscode` API objects for extensions.
 * This file is now a simple re-export of the main creation effect.
 */

// The entire complex logic of building the factory has been moved into Create.ts.
// This definition simply re-exports that effect.
export { default } from "./Create.js";
