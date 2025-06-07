// File: Cocoon/Source/ESMInterceptor/Dynamic/mod.rs
// Responsibility: Generates the dynamic script content for the 'vscode' module, enabling the integration of VS Code extensions within the Land editor by dynamically creating the necessary ES Module script.
// Modified: 2025-06-07 02:59:17 UTC

// Declares and exports modules related to the dynamic generation of the
// 'vscode' module script for ES Module imports.

#![allow(non_snake_case, non_camel_case_types)]

// This module contains the function that creates the dynamic script content.
mod Dynamic;
// This module contains the template string for the dynamic script.
mod DynamicTemplate;

// Re-export the primary script creation function.
pub use self::Dynamic::CreateDynamicVscodeModuleScript;
