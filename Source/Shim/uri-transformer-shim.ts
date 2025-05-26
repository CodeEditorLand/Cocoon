/*---------------------------------------------------------------------------------------------
 * Cocoon URI Transformer Shim (uri-transformer-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim implementation for the `IURITransformerService` or a compatible
 * `IURITransformer` interface. In VS Code environments that involve remote connections
 * or multiple distinct URI schemes (e.g., 'file://' for local files vs.
 * 'vscode-remote://' for remote files), this service is crucial. It translates URIs
 * between the extension host's perspective and the main thread's/renderer's perspective,
 * ensuring that URIs are correctly interpreted across different contexts.
 *
 * For a local-only Cocoon MVP (Minimum Viable Product), where all extensions run
 * in a local sidecar and primarily interact with local 'file://' URIs, complex URI
 * transformation is often not required. Therefore, this shim typically acts as a
 * NO-OP (No Operation), returning URIs and schemes unchanged.
 *
 * Responsibilities (as a NO-OP shim):
 * - Implementing the `IURITransformerService` (or `IURITransformer`) interface.
 * - Providing `transformIncoming`, `transformOutgoing`, `transformOutgoingToString`,
 *   and `transformOutgoingScheme` methods.
 * - In this NO-OP implementation, these methods return the input URI or scheme unmodified.
 *
 * Key Interactions:
 * - An instance of this shim is typically registered as the `IURITransformerService`
 *   or provided as the `IURITransformer` to the `RPCProtocol` instance in `index.ts`.
 * - The `RPCProtocol` then uses this transformer when marshalling and unmarshalling
 *   RPC messages that contain URI-like objects.
 * - Various ExtHost services might also use this service directly if they need to
 *   manually transform URIs before sending them via RPC or when interpreting URIs
 *   received from the main thread.
 *

 *--------------------------------------------------------------------------------------------*/

// Use vscode.Uri from the API shim for public interface consistency.
// Internally, VS Code's IURITransformer might operate on `UriComponents` or `vs/base/common/uri.URI`.
import type { Uri as VscodeUri } from "../Shim/out/vscode";

// VS Code's IURITransformerService or IURITransformer should ideally be imported if available.
// e.g., import { IURITransformerService } from 'vs/workbench/api/common/extHostUriTransformerService';

//      import { IURITransformer } from 'vs/base/common/uriIpc.d.ts';

// For this shim, we define a compatible local interface if the actual ones are not directly importable.

// --- Type Definitions ---

/**
 * Defines the URI transformation interface provided by this service.
 * Aligns with the common methods found in VS Code's `IURITransformer`.
 * This service is responsible for converting URIs between the representation
 * used in the extension host and the representation expected by the main thread/renderer.
 */
export interface CocoonUriTransformer {
	/**
	 * Transforms a URI coming from the main thread/renderer to the
	 * representation expected by the extension host.
	 * @param uri The incoming URI.
	 * @returns The transformed URI for the extension host.
	 */
	transformIncoming(uri: VscodeUri): VscodeUri;

	/**
	 * Transforms a URI from the extension host's perspective to the
	 * representation expected by the main thread/renderer.
	 * @param uri The outgoing URI.
	 * @returns The transformed URI for the main thread.
	 */
	transformOutgoing(uri: VscodeUri): VscodeUri;

	/**
	 * Transforms an outgoing URI and returns its string representation.
	 * Useful for direct inclusion in RPC payloads where a string is expected.
	 * @param uri The outgoing URI.
	 * @returns The string representation of the transformed URI.
	 */
	transformOutgoingToString(uri: VscodeUri): string;

	/**
	 * Transforms an outgoing URI scheme.
	 * @param scheme The scheme of the outgoing URI.
	 * @returns The transformed scheme.
	 */
	transformOutgoingScheme(scheme: string): string;
}

/**
 * The service interface for URI transformation, often used for DI.
 * It extends `CocoonUriTransformer` and includes a `_serviceBrand` for DI.
 */
export interface ICocoonUriTransformerService extends CocoonUriTransformer {
	readonly _serviceBrand: undefined;

	// Potentially other methods if the service offers more than just transformation.
}

/**
 * Cocoon's shim implementation of `ICocoonUriTransformerService`.
 * For a local-only MVP, this typically acts as a NO-OP transformer.
 */
export class ShimUriTransformerService implements ICocoonUriTransformerService {
	// For DI service registration
	public readonly _serviceBrand: undefined;

	// Stores the remote authority if Cocoon were part of a remote setup.
	// In a NO-OP shim, this is stored but not actively used for transformation.
	private readonly _remoteAuthority?: string;

	/**
	 * Creates an instance of ShimUriTransformerService.
	 * @param remoteAuthority The authority of the remote host, if any (e.g., "ssh-remote+hostname").
	 *                        Used in a real transformer to distinguish local and remote URIs.
	 */
	constructor(remoteAuthority?: string) {
		this._remoteAuthority = remoteAuthority;

		// In a real transformer, `remoteAuthority` would be crucial for determining
		// how to transform URIs (e.g., from 'file' to 'vscode-remote://<authority>/').
		const infoMessage = `[Cocoon URI Transformer Shim] Initialized. Remote Authority: ${this._remoteAuthority || "none (local context)"}. This shim currently performs NO-OP transformations.`;

		// Use console.log directly as logService might not be available or needed for this simple shim's constructor.
		console.log(infoMessage);
	}

	/**
	 * {@inheritDoc CocoonUriTransformer.transformIncoming}
	 *
	 *
	 *
	 * In this NO-OP implementation, returns the URI unchanged.
	 */
	public transformIncoming(uri: VscodeUri): VscodeUri {
		// Example of real logic:
		// if (this._remoteAuthority && uri.scheme === 'vscode-remote' && uri.authority === this._remoteAuthority) {
		// Convert to local 'file' URI
		//   return VscodeUri.file(uri.path);
		// }

		return uri;
	}

	/**
	 * {@inheritDoc CocoonUriTransformer.transformOutgoing}
	 *
	 *
	 *
	 * In this NO-OP implementation, returns the URI unchanged.
	 */
	public transformOutgoing(uri: VscodeUri): VscodeUri {
		// Example of real logic:
		// if (this._remoteAuthority && uri.scheme === 'file') {
		//   return VscodeUri.from({ scheme: 'vscode-remote', authority: this._remoteAuthority, path: uri.path });
		// }

		return uri;
	}

	/**
	 * {@inheritDoc CocoonUriTransformer.transformOutgoingToString}
	 *
	 *
	 * In this NO-OP implementation, converts the original URI to string.
	 */
	public transformOutgoingToString(uri: VscodeUri): string {
		// A real transformer would call `this.transformOutgoing(uri).toString()`.
		// Since this is NO-OP for transformOutgoing:
		return uri.toString();
	}

	/**
	 * {@inheritDoc CocoonUriTransformer.transformOutgoingScheme}
	 *
	 *
	 * In this NO-OP implementation, returns the scheme unchanged.
	 */
	public transformOutgoingScheme(scheme: string): string {
		// Example of real logic:
		// if (this._remoteAuthority && scheme === 'file') {
		//   return 'vscode-remote';
		// }

		return scheme;
	}

	// If compatibility with an IURITransformer that uses `vs/base/common/uri.URI` and `UriComponents`
	// is needed for direct use with RPCProtocol, additional methods might be required, or the
	// RPCProtocol's transformer interface would need to align with VscodeUri.
	// For now, this shim focuses on the VscodeUri type used in the public API.
}
