

/**
 * @module Type (Authentication)
 * @description Defines types for the Authentication service, including the
 * conversion logic between the public `vscode.AuthenticationSession` and the
 * internal `IAuthenticationSession` DTO.
 */

import type { AuthenticationSession as IAuthenticationSession } from "vscode";
import type * as VSCode from "vscode";

/**
 * Converts an internal `IAuthenticationSession` DTO into a public `vscode.AuthenticationSession`.
 * @param Session The internal session DTO.
 * @returns The `vscode.AuthenticationSession` object.
 */
export const ConvertSessionToVSCode = (
	Session: IAuthenticationSession,
): VSCode.AuthenticationSession => {
	return {
		id: Session.id,
		accessToken: Session.accessToken,
		account: {
			label: Session.account.label,
			id: Session.account.id,
		},
		scopes: Session.scopes,
	};
};

/**
 * Converts a public `vscode.AuthenticationSession` into an internal `IAuthenticationSession` DTO.
 * @param Session The `vscode.AuthenticationSession` object.
 * @returns The internal session DTO.
 */
export const ConvertSessionToInternal = (
	Session: VSCode.AuthenticationSession,
): IAuthenticationSession => {
	return {
		id: Session.id,
		accessToken: Session.accessToken,
		account: {
			label: Session.account.label,
			id: Session.account.id,
		},
		scopes: Session.scopes,
	};
};
