/**
 * @module DialogResult
 * @description Converts dialog result DTOs back into `vscode.Uri` objects.
 */
import type { Uri } from "vscode";
/**
 * @description Revives a single URI DTO into a `vscode.Uri` instance.
 * @param DTO The raw DTO from IPC.
 * @returns A `vscode.Uri` or `undefined`.
 */
export declare const ToURI: (DTO: any) => Uri | undefined;
/**
 * @description Revives an array of URI DTOs into an array of `vscode.Uri` instances.
 * @param DTOs The raw DTO array from IPC.
 * @returns A `Uri[]` or `undefined`.
 */
export declare const ToURIArray: (DTOs: any[] | undefined) => Uri[] | undefined;
