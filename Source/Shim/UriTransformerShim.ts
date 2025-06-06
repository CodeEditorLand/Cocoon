/*---------------------------------------------------------------------------------------------
 * Cocoon URI Transformer Shim 
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
 *   `transformOutgoingURI(uri)` for live `vscode.Uri` objects (convenience),
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
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import {
	// URI as VSCodeInternalURI, // Not directly used for construction in NO-OP
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// Internal DTO type for URIs

import type { IURITransformer } from "vs/base/common/uriIpc"; // VS Code's transformer interface for RPCProtocol
import type { Uri as VscodeApiUri } from "vscode"; // Public API type, used for convenience methods

/**
 * The service interface for URI transformation, used for Dependency Injection
 * and by `RPCProtocol`. It aligns with `IURITransformer` for DTO-based methods.
 * Also includes convenience methods for `vscode.Uri` (API type).
 */
export interface ICocoonUriTransformerService extends IURITransformer {
	readonly _serviceBrand: undefined;
	// Additional methods for convenience if operating on vscode.Uri API types directly
	transformOutgoingURI(uri: VscodeApiUri): VscodeApiUri;
	transformOutgoingToString(uri: VscodeApiUri): string;
}

/**
 * Cocoon's shim implementation of `ICocoonUriTransformerService`.
 * For a local-only MVP of Cocoon, where both Cocoon (extension host)
 * and Mountain (main application) share the same perspective on URIs,
 * this service acts as a NO-OP (No Operation) transformer.
 */
export class ShimUriTransformerService implements ICocoonUriTransformerService {
	public readonly _serviceBrand: undefined;
	private readonly _remoteAuthority?: string;

	/**
	 * Creates an instance of ShimUriTransformerService.
	 * @param remoteAuthority Optional: The authority string of the remote host, if Cocoon is
	 *                        part of a system with remote capabilities. Unused in this NO-OP version.
	 */
	constructor(remoteAuthority?: string) {
		this._remoteAuthority = remoteAuthority;
		const contextMessage = this._remoteAuthority
			? `Configured with remote authority: '${this._remoteAuthority}'. NOTE: URI transformations are currently NO-OP, suitable for local-only operation.`
			: `Initialized in local-only mode (no remote authority provided). URI transformations will be NO-OP.`;
		// Using console.log as this service is instantiated very early.
		console.log(`[Cocoon URI Transformer Shim] ${contextMessage}`);
	}

	/**
	 * Transforms incoming URI components (DTO from MainThread/Mountain).
	 * For a local-only Cocoon MVP, this is a NO-OP.
	 * @param uri The incoming URI components DTO (`VSCodeInternalUriComponents`).
	 * @returns The same (untransformed) URI components DTO.
	 */
	public transformIncoming(
		uri: VSCodeInternalUriComponents,
	): VSCodeInternalUriComponents {
		// TODO: If remote scenarios are supported:
		// if (this._remoteAuthority && uri.scheme === 'vscode-remote' && uri.authority === this._remoteAuthority) {
		//   // Example: Convert 'vscode-remote://<auth>/path' to 'file:///path' if Cocoon is the remote agent.
		//   // This logic depends heavily on the specific remote architecture.
		//   return { ...uri, scheme: 'file', authority: '' }; // Simplified example
		// }
		return uri; // NO-OP for local-only MVP
	}

	/**
	 * Transforms outgoing URI components (DTO from ExtHost/Cocoon to be sent to MainThread/Mountain).
	 * For a local-only Cocoon MVP, this is a NO-OP.
	 * @param uri The outgoing URI components DTO (`VSCodeInternalUriComponents`).
	 * @returns The same (untransformed) URI components DTO.
	 */
	public transformOutgoing(
		uri: VSCodeInternalUriComponents,
	): VSCodeInternalUriComponents {
		// TODO: If remote scenarios are supported:
		// if (this._remoteAuthority && uri.scheme === 'file') {
		//   // Example: Convert 'file:///local/path' to 'vscode-remote://<auth>/local/path'
		//   return { ...uri, scheme: 'vscode-remote', authority: this._remoteAuthority };
		// }
		return uri; // NO-OP for local-only MVP
	}

	/**
	 * (Convenience Method) Transforms an outgoing `vscode.Uri` (public API type).
	 * For a local-only Cocoon MVP, this is a NO-OP.
	 * @param uri The outgoing `vscode.Uri` object from the API.
	 * @returns The same (untransformed) `vscode.Uri` object.
	 */
	public transformOutgoingURI(uri: VscodeApiUri): VscodeApiUri {
		// A functional transformer would convert `uri` to `VSCodeInternalUriComponents`,
		// call `this.transformOutgoing(componentsDto)`, then revive the result back to `VscodeApiUri`.
		// Since `transformOutgoing` is a NO-OP here, this method is also a NO-OP.
		return uri;
	}

	/**
	 * (Convenience Method) Transforms an outgoing `vscode.Uri` and returns its string representation.
	 * For a local-only Cocoon MVP, this effectively calls `uri.toString()` on the original URI.
	 * @param uri The outgoing `vscode.Uri` object from the API.
	 * @returns The string representation of the (untransformed in this NO-OP case) URI.
	 */
	public transformOutgoingToString(uri: VscodeApiUri): string {
		// A real transformer would call `this.transformOutgoingURI(uri).toString()`.
		// Since `transformOutgoingURI` is a NO-OP here:
		return uri.toString();
	}

	/**
	 * Transforms the scheme component of an outgoing URI.
	 * For a local-only Cocoon MVP, this is a NO-OP.
	 * @param scheme The scheme string (e.g., "file", "untitled").
	 * @returns The same (untransformed) scheme string.
	 */
	public transformOutgoingScheme(scheme: string): string {
		// TODO: If remote scenarios are supported:
		// if (this._remoteAuthority && scheme === Schemas.file) { // Schemas.file is 'file'
		//   return Schemas.vscodeRemote; // Schemas.vscodeRemote is 'vscode-remote'
		// }
		return scheme; // NO-OP for local-only MVP
	}
}
