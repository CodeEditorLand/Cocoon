/**
 * @module DialogResult
 * @description Converts dialog result DTOs back into `vscode.Uri` objects.
 */

import type { Uri } from "vscode";

import { URI } from "../../../Platform/VSCode/Type.js";

/**
 * @description Revives a single URI DTO into a `vscode.Uri` instance.
 * @param DTO The raw DTO from IPC.
 * @returns A `vscode.Uri` or `undefined`.
 */
export const ToURI = (DTO: any): Uri | undefined => {

	if (!DTO) {
		return undefined;
	}

	return URI.revive(DTO);
};

/**
 * @description Revives an array of URI DTOs into an array of `vscode.Uri` instances.
 * @param DTOs The raw DTO array from IPC.
 * @returns A `Uri[]` or `undefined`.
 */
export const ToURIArray = (DTOs: any[] | undefined): Uri[] | undefined => {

	if (!DTOs || !Array.isArray(DTOs)) {
		return undefined;
	}

	return DTOs.map(ToURI).filter((URIValue): URIValue is Uri => !!URIValue);
};
