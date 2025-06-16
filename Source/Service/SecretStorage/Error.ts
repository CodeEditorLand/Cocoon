/*
 * File: Cocoon/Source/Service/SecretStorage/Error.ts
 * Responsibility: Defines custom error classes for the SecretStorage service, specifically handling empty key and invalid value scenarios to enforce proper input validation when managing secrets.
 * Modified: 2025-06-15 19:16:53 UTC
 * Export: default
 */

/**
 * @module Error (SecretStorage)
 * @description Exports all custom, tagged errors for the SecretStorage service.
 */

export { default as EmptyKeyError } from "./Error/EmptyKeyError.js";
export { default as InvalidValueError } from "./Error/InvalidValueError.js";
