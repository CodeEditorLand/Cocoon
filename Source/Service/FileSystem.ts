/**
 * @module FileSystem
 * @description This module provides the `vscode.workspace.fs` API implementation,
 * proxying all filesystem operations to the Mountain host.
 */

import { FileSystemError, MapToVSCodeError } from "./FileSystem/Error.js";
import Live from "./FileSystem/Live.js";
import Service from "./FileSystem/Service.js";

export { Service, Live, FileSystemError, MapToVSCodeError };
