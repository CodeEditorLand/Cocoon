// File: Cocoon/Source/ESMInterceptor/mod.rs
// Responsibility: Responsibility could not be determined.
// Modified: 2025-06-07 05:37:44 UTC

#![allow(non_snake_case, non_camel_case_types)]

// This module contains the main interceptor class.
mod EsmInterceptor;
// This module contains the dynamic script that gets served for `import
// "vscode"`.
mod Dynamic;

// Re-export the primary interceptor class.
pub use self::EsmInterceptor::CocoonNodeModuleESMInterceptor;
