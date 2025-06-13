/**
 * @module Type (Dialog)
 * @description Defines aliases for the option types used by the Dialog service,
 * making them easier to import and use within the service implementation.
 */

import type { OpenDialogOptions, SaveDialogOptions } from "vscode";

// These are direct aliases to the vscode namespace types.
export type OpenDialogOption = OpenDialogOptions;
export type SaveDialogOption = SaveDialogOptions;
