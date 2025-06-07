// File: Cocoon/Source/ESMInterceptor/mod.rs
// Responsibility: Implements the ESM interception mechanism to redirect `import
// "vscode"` statements in extensions, providing a shimmed API instance that
// interfaces with the Cocoon sidecar and the VS Code extension ecosystem.
// Modified: 2025-06-07 02:59:17 UTC

// Declares and exports modules related to the ES Module (ESM) interception
// mechanism. This system allows Cocoon to intercept `import "vscode"`
// statements in extensions and provide the correct, shimmed API instance.

#![allow(non_snake_case, non_camel_case_types)]

// This module contains the main interceptor class.
mod EsmInterceptor;
// This module contains the dynamic script that gets served for `import
// "vscode"`.
mod Dynamic;

// Re-export the primary interceptor class.
pub use self::EsmInterceptor::CocoonNodeModuleESMInterceptor;
