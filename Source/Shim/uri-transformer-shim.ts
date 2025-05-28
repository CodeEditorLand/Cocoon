/*---------------------------------------------------------------------------------------------
 * Cocoon URI Transformer Shim (uri-transformer-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim implementation for a URI transformation service, compatible with
 * VS Code's `IURITransformer`. This service is essential in environments with
 * different URI perspectives (e.g., local vs. remote).
 *
 * For a local-only Cocoon MVP, this shim typically functions as a NO-OP transformer:
 * its transformation methods return the input URIs (as DTOs or schemes) without modification.
 * This is suitable when Cocoon and Mountain share a consistent understanding of URIs.
 *
 * Responsibilities (as a NO-OP shim for local-only Cocoon):
 * - Implementing an interface compatible with VS Code's `IURITransformer`.
 * - Providing `transformIncoming(uriDto)`, `transformOutgoing(uriDto)` for `UriComponents` DTOs,
 *   `transformOutgoingURI(uri)` for live `vscode.Uri` objects,
 *   `transformOutgoingToString(uri)`, and `transformOutgoingScheme(scheme)`.
 * - In this NO-OP implementation, these methods return inputs unchanged.
 *
 * Key Interactions:
 * - Instantiated early in `Cocoon/index.ts`.
 * - Provided as the `IURITransformer` to the `RPCProtocol` instance.
 * - `RPCProtocol` uses the DTO-based `transformIncoming`/`transformOutgoing` during
 *   marshalling/unmarshalling of RPC messages containing URI DTOs.
 *
 * TODO (Major Feature for Remote Scenarios):
 *  - If Cocoon supports remote workspaces, implement functional URI transformation logic:
 *    - `transformIncoming`: Convert remote-schemed URI DTOs (e.g., `vscode-remote://<auth>/path`)
 *      to local `file:` URI DTOs or schemes appropriate for Cocoon's execution context.
 *    - `transformOutgoing`: Convert local `file:` URI DTOs from Cocoon to remote-schemed URI DTOs
 *      for Mountain.
 *    - This requires knowledge of the `remoteAuthority` and the specific remote architecture.
 *--------------------------------------------------------------------------------------------*/

import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri"; // Internal type and DTO

import type { IURITransformer } from "vs/base/common/uriIpc"; // VS Code's transformer interface for RPCProtocol
import type { Uri as VscodeUri } from "vscode"; // Public API type

/**
 * The service interface for URI transformation, used for Dependency Injection
 * and by `RPCProtocol`. It aligns with `IURITransformer` for DTO-based methods.
 */
export interface ICocoonUriTransformerService extends IURITransformer {
	readonly _serviceBrand: undefined;
	// Additional methods for convenience if operating on vscode.Uri API types directly
	transformOutgoingURI(uri: VscodeUri): VscodeUri;
	transformOutgoingToString(uri: VscodeUri): string;
}

export class ShimUriTransformerService implements ICocoonUriTransformerService {
	public readonly _serviceBrand: undefined;
	private readonly _remoteAuthority?: string;

	constructor(remoteAuthority?: string) {
		this._remoteAuthority = remoteAuthority;
		const contextMessage = this._remoteAuthority
			? `Configured with remote authority: '${this._remoteAuthority}'. NOTE: URI transformations are currently NO-OP.`
			: `Initialized in local-only mode (no remote authority). URI transformations are NO-OP.`;
		console.log(`[Cocoon URI Transformer Shim] ${contextMessage}`);
	}

	/**
	 * Transforms incoming URI components (DTO from MainThread). NO-OP for local Cocoon.
	 * @param uri The incoming URI components DTO.
	 * @returns The same (untransformed) URI components DTO.
	 */
	public transformIncoming(
		uri: VSCodeInternalUriComponents,
	): VSCodeInternalUriComponents {
		// TODO: If remote, and uri.scheme is remote, transform to local perspective.
		// For example, if uri is vscode-remote://<this._remoteAuthority>/some/path,
		// and Cocoon is the remote agent, this might become { scheme: 'file', path: '/some/path', ... }.
		// Or if Cocoon is local client for remote, it might become { scheme: 'file', path: '/local/mount/of/remote/some/path', ... }.
		return uri; // NO-OP
	}

	/**
	 * Transforms outgoing URI components (DTO from ExtHost to be sent to MainThread). NO-OP for local Cocoon.
	 * @param uri The outgoing URI components DTO.
	 * @returns The same (untransformed) URI components DTO.
	 */
	public transformOutgoing(
		uri: VSCodeInternalUriComponents,
	): VSCodeInternalUriComponents {
		// TODO: If remote, and uri.scheme is 'file' (local to Cocoon), transform to remote perspective.
		// For example, { scheme: 'file', path: '/local/path' } might become
		// { scheme: 'vscode-remote', authority: this._remoteAuthority, path: '/local/path', ... }.
		return uri; // NO-OP
	}

	/**
	 * Transforms an outgoing `vscode.Uri` (API type). NO-OP for local Cocoon.
	 * This is a convenience if other services need to transform live API URI objects.
	 * @param uri The outgoing `vscode.Uri` object.
	 * @returns The same (untransformed) `vscode.Uri` object.
	 */
	public transformOutgoingURI(uri: VscodeUri): VscodeUri {
		// For a functional transformer:
		// const internalUri = VSCodeInternalURI.from(uri); // Convert API URI to internal URI
		// const componentsDto = internalUri.toJSON();
		// const transformedDto = this.transformOutgoing(componentsDto); // Use DTO transformer
		// return VscodeUri.from(VSCodeInternalURI.revive(transformedDto)); // Convert back to API URI
		return uri; // NO-OP
	}

	/**
	 * Transforms an outgoing `vscode.Uri` and returns its string representation. NO-OP for local Cocoon.
	 * @param uri The outgoing `vscode.Uri` object.
	 * @returns The string representation of the (untransformed) URI.
	 */
	public transformOutgoingToString(uri: VscodeUri): string {
		// A real transformer would call this.transformOutgoingURI(uri).toString().
		// Since transformOutgoingURI is NO-OP, this simplifies to:
		return uri.toString();
	}

	/**
	 * Transforms the scheme component of an outgoing URI. NO-OP for local Cocoon.
	 * @param scheme The scheme string.
	 * @returns The same (untransformed) scheme string.
	 */
	public transformOutgoingScheme(scheme: string): string {
		// TODO: If remote, and scheme is 'file', return 'vscode-remote'.
		return scheme; // NO-OP
	}
}
