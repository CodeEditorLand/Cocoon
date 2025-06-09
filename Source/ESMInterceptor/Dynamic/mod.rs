// File: Cocoon/Source/ESMInterceptor/Dynamic/mod.rs
// Responsibility: Generates the dynamic ES Module script content for the 'vscode' module, enabling VS Code extension integration within the Land editor by creating necessary module bindings for the Cocoon sidecar's ESM interception layer.
// Modified: 2025-06-07 05:37:44 UTC

#![allow(non_snake_case, non_camel_case_types)]

// This module contains the function that creates the dynamic script content.
mod Dynamic;
// This module contains the template string for the dynamic script.
mod DynamicTemplate;

// Re-export the primary script creation function.
pub use self::Dynamic::CreateDynamicVscodeModuleScript;
