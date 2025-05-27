/*---------------------------------------------------------------------------------------------
 * Cocoon URI Transformer Shim (uri-transformer-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim implementation for a URI transformation service, designed to be
 * compatible with VS Code's `IURITransformer` or `IURITransformerService` concepts.
 * In VS Code environments that span different filesystem perspectives or URI schemes—such
 * as when dealing with remote connections (e.g., SSH, WSL, Codespaces), virtual file
 * systems, or distinct local vs. remote resource representations—this service is essential.
 * It ensures that URIs are correctly translated and interpreted as they pass between
 * the extension host (which might operate with one set of URI schemes or paths) and
 * the main application thread or renderer (which might operate with another).
 *
 * For a local-only Cocoon MVP (Minimum Viable Product), where it's assumed that both
 * Cocoon (the Node.js extension host sidecar) and Mountain (the Tauri main application)
 * operate with a shared and consistent understanding of URIs (e.g., all relevant URIs
 * are standard 'file://' URIs referring to the same local filesystem, or other schemes
 * like 'untitled://' are interpreted identically by both), complex URI transformation
 * is generally not required. Consequently, this shim typically functions as a
 * NO-OP (No Operation) transformer: its transformation methods simply return the
 * input URIs and schemes without modification.
 *
 * Responsibilities (as a NO-OP shim for local-only Cocoon):
 * - Implementing an interface that is compatible with VS Code's `IURITransformer`.
 * - Providing the standard transformation methods: `transformIncoming(uri)`,
 *
 *   `transformOutgoing(uri)`, `transformOutgoingToString(uri)`, and
 *   `transformOutgoingScheme(scheme)`.
 * - In this NO-OP implementation, ensuring these methods return the input URI or
 *   scheme directly, reflecting a scenario where no translation is needed between
 *   the Cocoon extension host and the Mountain main application.
 *
 * Key Interactions:
 * - An instance of `ShimUriTransformerService` is typically instantiated very early
 *   during Cocoon's startup in `index.ts`.
 * - This instance is then provided as the `IURITransformer` to the `RPCProtocol`
 *   instance that manages communication between Cocoon and Mountain.
 * - The `RPCProtocol` utilizes this transformer during the marshalling (sending) and
 *   unmarshalling (receiving) of RPC messages that contain URI-like objects or
 *   `UriComponents` DTOs, applying the transformations to ensure URIs are in the
 *   appropriate format for the destination (Cocoon or Mountain).
 * - While other ExtHost services could theoretically use this service directly for manual
 *   URI transformation, its primary consumer is the `RPCProtocol`.
 *
 *--------------------------------------------------------------------------------------------*/

// Use vscode.Uri from the public API shim for this service's method signatures,

// as this is the URI type that other ExtHost services and the RPC layer (at the point
// it interacts with this transformer via the API factory) will likely deal with.
// Note: VS Code's internal IURITransformer often operates on `vs/base/common/uri.URI`
// instances or `UriComponents` DTOs directly. The bridge between `vscode.Uri` (API type)
// and these internal representations is handled by the RPC marshalling layer or type converters.
import type { Uri as VscodeUri } from "../Shim/out/vscode";

// If direct imports of VS Code's internal interfaces were feasible and desirable for strict type conformance:
// Example path
// import type { IURITransformerService } from 'vs/workbench/api/common/extHostUriTransformerService';

// Example path for the base transformer interface
// import type { IURITransformer } from 'vs/base/common/uriIpc.d.ts';

// --- Type Definitions for This Shim ---

/**
 * Defines the core URI transformation methods provided by this service.
 * This interface aims for compatibility with the methods typically found in
 * VS Code's `IURITransformer` interface.
 */
export interface CocoonUriTransformer {
	/**
	 * Transforms a URI that has been received from the main thread (Mountain)
	 * into the representation expected by the extension host (Cocoon).
	 * In a NO-OP (local-only) implementation, this returns the URI unchanged.
	 * @param uri The incoming URI (typically as a `vscode.Uri` instance).
	 * @returns The transformed URI, suitable for use within the Cocoon extension host.
	 */
	transformIncoming(uri: VscodeUri): VscodeUri;

	/**
	 * Transforms a URI from the extension host's (Cocoon's) perspective into the
	 * representation expected by the main thread (Mountain).
	 * In a NO-OP (local-only) implementation, this returns the URI unchanged.
	 * @param uri The outgoing URI (typically as a `vscode.Uri` instance).
	 * @returns The transformed URI, suitable for sending to the MainThread.
	 */
	transformOutgoing(uri: VscodeUri): VscodeUri;

	/**
	 * Transforms an outgoing URI from the extension host's perspective and returns
	 * its canonical string representation. This is often used when URIs need to be
	 * embedded as strings in RPC payloads or other serialized data.
	 * In a NO-OP (local-only) implementation, this is equivalent to calling `uri.toString()`
	 * on the (untransformed) outgoing URI.
	 * @param uri The outgoing URI (typically as a `vscode.Uri` instance).
	 * @returns The string representation of the (potentially transformed) URI.
	 */
	transformOutgoingToString(uri: VscodeUri): string;

	/**
	 * Transforms the scheme component of an outgoing URI.
	 * In a NO-OP (local-only) implementation, this returns the scheme unchanged.
	 * @param scheme The scheme string of the outgoing URI (e.g., "file", "untitled").
	 * @returns The transformed scheme string.
	 */
	transformOutgoingScheme(scheme: string): string;
}

/**
 * The service interface for URI transformation, often used for Dependency Injection.
 * It extends `CocoonUriTransformer` and includes a `_serviceBrand` for DI registration,
 *
 * aligning with VS Code's service patterns.
 */
export interface ICocoonUriTransformerService extends CocoonUriTransformer {
	readonly _serviceBrand: undefined;

	// This service could potentially include other methods if it offered more advanced
	// URI manipulation functionalities beyond direct transformation (e.g., methods to
	// resolve relative URIs based on transformed workspace roots), though this is uncommon
	// for a basic IURITransformer.
}

/**
 * Cocoon's shim implementation of `ICocoonUriTransformerService`.
 * For a local-only MVP (Minimum Viable Product) of Cocoon, where it is assumed that
 * both Cocoon (the extension host) and Mountain (the main application host) operate
 * with a unified and consistent perspective on URIs (e.g., all relevant URIs are
 * standard 'file://' URIs referring to the same local filesystem, or other schemes like
 * 'untitled://' are interpreted identically by both processes), this service acts as a
 * NO-OP (No Operation) transformer. It correctly implements the required interface
 * methods but returns the input URIs and schemes without any modification.
 *
 * **Important:** If Cocoon were to operate in a context involving remote workspaces
 * (e.g., Cocoon running locally but managing extensions for a workspace on a remote
 * server that Mountain is connected to), this transformer would require a full, non-NOP
 * implementation. Such an implementation would need to correctly convert URIs between
 * local `file:` schemes and the appropriate remote URI schemes (e.g., `vscode-remote:`),
 *
 * using the `remoteAuthority` provided to its constructor.
 */
export class ShimUriTransformerService implements ICocoonUriTransformerService {
	// For DI service registration compatibility.
	public readonly _serviceBrand: undefined;

	// Stores the authority string of the remote host (e.g., "ssh-remote+hostname").
	// In this NO-OP shim, `_remoteAuthority` is stored if provided but is not actively
	// used in the transformation logic. It would be critical for a real transformer.
	private readonly _remoteAuthority?: string;

	/**
	 * Creates an instance of ShimUriTransformerService.
	 * @param remoteAuthority Optional: The authority string of the remote host, if Cocoon is
	 *                        part of a system with remote capabilities (e.g., "ssh-remote+my-server.com").
	 *                        This parameter is crucial for a real URI transformer that needs to
	 *                        distinguish and convert between local and remote URIs, but it is
	 *                        unused in this NO-OP version.
	 */
	constructor(remoteAuthority?: string) {
		this._remoteAuthority = remoteAuthority;

		const contextMessage = this._remoteAuthority
			? `Configured with remote authority: '${this._remoteAuthority}'. NOTE: URI transformations are currently NO-OP in this shim, suitable for local-only operation.`
			: `Initialized in local-only mode (no remote authority provided). URI transformations will be NO-OP.`;

		// Using console.log as this service is instantiated very early in `index.ts`,

		// potentially before a full ILogService is available or configured for DI.
		console.log(`[Cocoon URI Transformer Shim] ${contextMessage}`);
	}

	/**
	 * {@inheritDoc CocoonUriTransformer.transformIncoming}
	 *
	 * In this NO-OP (No Operation) implementation, designed for local-only scenarios where
	 * Cocoon and Mountain share the same URI perspective, the incoming URI is returned unchanged.
	 *
	 * @param uri The URI received from the main thread (Mountain), typically as a `vscode.Uri` instance.
	 * @returns The same URI instance, untransformed.
	 */
	public transformIncoming(uri: VscodeUri): VscodeUri {
		// Example of logic for a real transformer handling an incoming remote URI to a local host:
		// if (this._remoteAuthority && uri.scheme === 'vscode-remote' && uri.authority === this._remoteAuthority) {

		// If Cocoon is the local host, this might convert vscode-remote://<auth>/path/to/file
		//
		// to something like file:///local/mount/point/for/remote/path/to/file
		//
		// Or, if Cocoon *is* the remote agent itself, it might map to a direct native path on the remote:
		//
		// return VscodeUri.file(uri.path); // Assuming uri.path from vscode-remote is the remote native path
		//
		// }

		// NO-OP for local-only Cocoon MVP
		return uri;
	}

	/**
	 * {@inheritDoc CocoonUriTransformer.transformOutgoing}
	 *
	 * In this NO-OP (No Operation) implementation, the outgoing URI is returned unchanged.
	 *
	 * @param uri The URI from the extension host (Cocoon) to be sent to the main thread (Mountain),
	 *
	 *            typically as a `vscode.Uri` instance.
	 * @returns The same URI instance, untransformed.
	 */
	public transformOutgoing(uri: VscodeUri): VscodeUri {
		// Example of logic for a real transformer handling an outgoing local file URI from a local host to a remote context:
		// if (this._remoteAuthority && uri.scheme === 'file') {

		// Convert file:///local/path to vscode-remote://<this._remoteAuthority>/local/path
		//
		//   return VscodeUri.from({ scheme: 'vscode-remote', authority: this._remoteAuthority, path: uri.path, query: uri.query, fragment: uri.fragment });

		// }

		// NO-OP for local-only Cocoon MVP
		return uri;
	}

	/**
	 * {@inheritDoc CocoonUriTransformer.transformOutgoingToString}
	 *
	 * Transforms an outgoing URI from the extension host's perspective and returns
	 * its canonical string representation.
	 * In this NO-OP (local-only) implementation, it effectively calls `uri.toString()`
	 * on the original (untransformed) outgoing URI.
	 *
	 * @param uri The outgoing URI, typically as a `vscode.Uri` instance.
	 * @returns The string representation of the (untransformed in this NO-OP case) URI.
	 */
	public transformOutgoingToString(uri: VscodeUri): string {
		// A real transformer would first call `this.transformOutgoing(uri)`
		// and then `.toString()` on the (potentially transformed) result.
		// Since `transformOutgoing` is a NO-OP here, this is equivalent to `uri.toString()`.
		return this.transformOutgoing(uri).toString();
	}

	/**
	 * {@inheritDoc CocoonUriTransformer.transformOutgoingScheme}
	 *
	 * In this NO-OP (local-only) implementation, the outgoing scheme is returned unchanged.
	 *
	 * @param scheme The scheme string of the outgoing URI (e.g., "file", "untitled").
	 * @returns The same scheme string, as no transformation is applied.
	 */
	public transformOutgoingScheme(scheme: string): string {
		// Example of real transformation logic:
		// Schemas.file is 'file'
		// if (this._remoteAuthority && scheme === Schemas.file) {

		// Schemas.vscodeRemote is 'vscode-remote'
		//   return Schemas.vscodeRemote;

		// }

		// NO-OP for local-only Cocoon MVP
		return scheme;
	}

	// Note on VS Code's internal IURITransformer:
	// VS Code's `IURITransformer` interface (often found in `vs/base/common/uriIpc.d.ts`)
	// typically operates directly with `vs/base/common/uri.URI` instances (VS Code's internal URI class)
	// and uses their `toJSON(): UriComponents` method for preparing URIs for RPC serialization.
	// This `ShimUriTransformerService` uses `vscode.Uri` (the public API type, often from `../Shim/out/vscode.js`)
	// in its method signatures for consistency with how other ExtHost services might interact with it
	// at the API boundary. The `RPCProtocol` layer, or the marshallers/revivers used for RPC messages,

	// would be responsible for handling the conversion between `vscode.Uri` (public API type) and
	// the on-the-wire `UriComponents` DTO, applying this transformer's methods in the process.
	// This shim's NO-OP nature simplifies these interactions significantly for a local-only setup.
}
