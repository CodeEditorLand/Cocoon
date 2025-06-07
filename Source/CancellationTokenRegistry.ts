/*
 * File: Cocoon/Source/CancellationTokenRegistry.ts
 * Responsibility: Manages cancellation tokens for RPC operations initiated by the MainThread, enabling clean termination and resource cleanup for cancellable operations in the Cocoon sidecar.
 * Modified: 2025-06-07 02:59:17 UTC
 * Dependency: vs/platform/instantiation/common/instantiation, vs/platform/log/common/log
 * Export: CancellationTokenRegistry, ICancellationTokenRegistry
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon CancellationToken Registry
 * --------------------------------------------------------------------------------------------
 * This module provides a `CancellationTokenRegistry` class responsible for managing
 * `CancellationTokenSource` instances. These instances are primarily used for operations
 * initiated by the MainThread (Mountain, e.g., the UI/host application) via RPC calls
 * to the Extension Host (Cocoon), where such operations might need to be cancellable.
 *
 * How it Works:
 * - When the MainThread initiates a potentially cancellable operation on an ExtHost service
 *   (e.g., requesting language features like hovers or completions), it typically includes
 *   a numeric `tokenId` in the RPC call. This `tokenId` serves as a unique identifier
 *   for that specific operation instance.
 * - If the MainThread later decides to cancel this ongoing operation (e.g., because the
 *   user moved the cursor, closed a UI element, or another event makes the operation
 *   obsolete), it sends a cancellation signal (e.g., a specific IPC message or another
 *   RPC call) to the ExtHost, referencing the same `tokenId`.
 *
 * Responsibilities of `CancellationTokenRegistry`:
 * 1. Token Source Creation and Provision:
 *    - When an ExtHost service (like `ShimLanguageFeatures`) receives an RPC call with a
 *      `tokenId` for a cancellable operation, it requests a `CancellationToken` from this
 *      registry using `obtainTokenAndDisposable(tokenId)`.
 *    - If a `CancellationTokenSource` for that `tokenId` doesn't already exist, the registry
 *      creates a new one and stores it. If one already exists (e.g., for a re-entrant
 *      call or a related sub-operation using the same token), the existing one is reused.
 *    - It returns the `CancellationToken` from this source to the ExtHost service, which
 *      then passes it to the actual logic performing the operation (e.g., an extension's
 *      language provider).
 *    - Importantly, `obtainTokenAndDisposable` also returns an `IDisposable`. The caller
 *      (the ExtHost service) *MUST* call `dispose()` on this `IDisposable` when the
 *      operation associated with the `tokenId` completes (either successfully or with an
 *      error). This disposal action cleans up the `CancellationTokenSource` from the registry.
 *
 * 2. Processing Cancellation Signals:
 *    - The registry exposes a `cancel(tokenId)` method.
 *    - This method is typically called by the RPC/IPC layer of Cocoon (e.g., `cocoon-ipc.ts`)
 *      when it receives a cancellation signal from the MainThread for a specific `tokenId`.
 *    - Calling `cancel(tokenId)` triggers the `cancel()` method on the corresponding
 *      `CancellationTokenSource` stored in the registry. This, in turn, sets the
 *      `isCancellationRequested` property to `true` on the `CancellationToken` that was
 *      provided to the ongoing operation.
 *
 * 3. Lifecycle Management:
 *    - The registry manages the lifecycle of the `CancellationTokenSource` instances it creates.
 *    - Sources are created on demand by `obtainTokenAndDisposable`.
 *    - Sources are disposed of (and removed from the registry) when the `IDisposable`
 *      returned by `obtainTokenAndDisposable` is disposed by the consuming service.
 *    - The registry itself has a `dispose()` method to clean up all currently managed
 *      sources, which should be called if the registry instance is being shut down.
 *
 * Key Interactions and Usage Pattern:
 * - Instantiation: An instance of `CancellationTokenRegistry` is typically created as a
 *   singleton service within Cocoon (e.g., in `index.ts`) and can be made available
 *   via Dependency Injection (DI) using a DI key like `ICancellationTokenRegistry`.
 * - Consumption: ExtHost services that handle RPC calls from the MainThread involving
 *   cancellable operations (e.g., `ShimLanguageFeatures` for language provider execution)
 *   consume this registry.
 *   - Example Flow:
 *     1. `ShimLanguageFeatures.$provideHover(handle, uri, position, tokenDto)` is called by MainThread.
 *        `tokenDto` contains `{ id: tokenIdFromMainThread }`.
 *     2. `ShimLanguageFeatures` calls `registry.obtainTokenAndDisposable(tokenIdFromMainThread)`.
 *     3. The returned `token` is passed to `hoverProvider.provideHover(..., token)`.
 *     4. The returned `disposable` is added to an operation-specific `DisposableStore` within
 *        the `$provideHover` method's scope.
 *     5. The `DisposableStore` is disposed of in a `finally` block of the `$provideHover`
 *        method, ensuring the token source is released from the registry.
 * - Cancellation Trigger: The IPC layer (`cocoon-ipc.ts`) receives a cancellation message
 *   from MainThread (e.g., VineMsgType 5 or a specific RPC like `$cancelRpcOperation`)
 *   containing a `tokenId`. The IPC layer then calls `registry.cancel(tokenId)`.
 *
 * Logging:
 * - The registry can optionally take an `ILogService` instance for logging its activities,
 *   such as token creation, reuse, cancellation, and disposal. This is helpful for debugging
 *   cancellation flows.
 *--------------------------------------------------------------------------------------------*/

// --- VS Code Base Module Imports ---
// These are core utilities from VS Code's `base` layer, essential for cancellation and resource management.
import {
	CancellationToken, // The object passed to operations, allowing them to check for cancellation.
	CancellationTokenSource, // The object used to create and signal cancellation for a CancellationToken.
} from "vs/base/common/cancellation";
import {
	DisposableStore, // A utility for managing a collection of IDisposable objects.
	toDisposable, // Utility function to create an IDisposable from a cleanup function.
	type IDisposable, // Interface for objects that can be disposed of to release resources.
} from "vs/base/common/lifecycle";
// --- VS Code Platform Module Imports ---
// For logging, if an ILogService instance is provided.
import type { ILogService } from "vs/platform/log/common/log";

// TODO: If this registry is to be managed by VS Code's Dependency Injection system,
// a DI key (service identifier) would be created like this:
// import { createDecorator } from "vs/platform/instantiation/common/instantiation";
// export const ICancellationTokenRegistry = createDecorator<CancellationTokenRegistry>('cancellationTokenRegistry');
// And `index.ts` would register an instance using this key.

/**
 * Manages `CancellationTokenSource` instances for operations that are initiated
 * by the MainThread (Mountain) via RPC and need to be potentially cancellable.
 */
export class CancellationTokenRegistry {
	// A Map to store active CancellationTokenSource instances, keyed by their `tokenId`.
	// `tokenId` is a numeric identifier received from the MainThread for a specific operation.
	private readonly _cancellationTokenSourcesMap = new Map<
		number,
		CancellationTokenSource
	>();

	// An optional logging service instance for tracing registry activities.
	private readonly _logServiceInstance?: ILogService;

	/**
	 * Creates an instance of `CancellationTokenRegistry`.
	 * @param logServiceInstance - An optional `ILogService` instance for logging.
	 *                             If provided, the registry will log its actions (creation, cancellation, disposal of tokens).
	 */
	constructor(logServiceInstance?: ILogService) {
		this._logServiceInstance = logServiceInstance;
		this._logServiceInstance?.trace(
			"[CancellationTokenRegistry] CancellationTokenRegistry instance initialized.",
		);
	}

	/**
	 * Retrieves an existing `CancellationToken` for a given operation ID (`tokenId`),
	 * or creates a new `CancellationTokenSource` (and its associated `CancellationToken`)
	 * if one does not already exist for that `tokenId`.
	 *
	 * Crucially, this method returns an `IDisposable`. The caller (e.g., an ExtHost service
	 * method handling an RPC call) *MUST* call `dispose()` on this `IDisposable` when the
	 * operation associated with the `tokenId` is completed (either successfully or with an error).
	 * Disposing of this `IDisposable` will clean up the `CancellationTokenSource` from this
	 * registry, preventing memory leaks.
	 *
	 * @param tokenId - The unique numeric identifier for the operation, typically received
	 *                  from the MainThread as part of an RPC call.
	 * @returns An object containing:
	 *          - `token`: The `CancellationToken` to be passed to the cancellable operation.
	 *          - `disposable`: An `IDisposable` that MUST be disposed of by the caller
	 *                          when the operation completes, to release the token source.
	 *          Returns `{ token: CancellationToken.None, disposable: DisposableStore.None }`
	 *          if the provided `tokenId` is invalid (not a positive number).
	 */
	public obtainTokenAndDisposable(tokenId: number): {
		token: CancellationToken;
		disposable: IDisposable;
	} {
		// Validate the tokenId. It must be a positive number.
		if (typeof tokenId !== "number" || tokenId <= 0) {
			this._logServiceInstance?.warn(
				`[CancellationTokenRegistry] Invalid tokenId ('${tokenId}') provided to obtainTokenAndDisposable. ` +
					`TokenId must be a positive number. Returning CancellationToken.None.`,
			);
			// Return a non-cancellable token and a NOP disposable for invalid tokenIds.
			return {
				token: CancellationToken.None,
				disposable: DisposableStore.None,
			};
		}

		// Try to get an existing CancellationTokenSource for this tokenId.
		let cancellationTokenSource =
			this._cancellationTokenSourcesMap.get(tokenId);

		if (!cancellationTokenSource) {
			// If no source exists for this tokenId, create a new one.
			cancellationTokenSource = new CancellationTokenSource();
			this._cancellationTokenSourcesMap.set(
				tokenId,
				cancellationTokenSource,
			); // Store it in the map.
			this._logServiceInstance?.trace(
				`[CancellationTokenRegistry] Created new CancellationTokenSource for tokenId: ${tokenId}.`,
			);
		} else {
			// If a source already exists, reuse it. This might happen if, for example,
			// MainThread makes multiple related calls for the same underlying operation using the same tokenId.
			this._logServiceInstance?.trace(
				`[CancellationTokenRegistry] Reusing existing CancellationTokenSource for tokenId: ${tokenId}. ` +
					`Current cancellation state: ${cancellationTokenSource.token.isCancellationRequested}.`,
			);
		}

		// Create an IDisposable that, when disposed, will clean up this CancellationTokenSource.
		// The cleanup involves disposing the source itself and removing it from the map.
		const disposableToReturn = toDisposable(() => {
			const sourceToDisposeAndRemove =
				this._cancellationTokenSourcesMap.get(tokenId);
			if (sourceToDisposeAndRemove) {
				// It's important to log the state *before* disposal if needed for debugging.
				// if (!sourceToDisposeAndRemove.token.isCancellationRequested) {
				// 	// If the token was not cancelled by an explicit `cancel(tokenId)` call from MainThread,
				// 	// and the operation is now just "finishing" (i.e., this disposable is being called
				// 	// as part of normal cleanup in a `finally` block), we don't trigger cancellation here.
				// 	// We just dispose of the source to free up resources.
				// }
				sourceToDisposeAndRemove.dispose(); // Dispose the CancellationTokenSource.
				this._cancellationTokenSourcesMap.delete(tokenId); // Remove it from the map.
				this._logServiceInstance?.trace(
					`[CancellationTokenRegistry] Disposed and removed CancellationTokenSource for tokenId: ${tokenId} (via returned disposable).`,
				);
			}
			// If `sourceToDisposeAndRemove` is not found, it might mean it was already disposed of
			// (e.g., if the disposable was called multiple times, though `DisposableStore` handles that).
		});

		// Return the token from the source and the disposable for cleanup.
		return {
			token: cancellationTokenSource.token,
			disposable: disposableToReturn,
		};
	}

	/**
	 * Triggers cancellation for the `CancellationTokenSource` associated with the given `tokenId`.
	 * This method is typically called by the IPC layer (e.g., `cocoon-ipc.ts`) when a
	 * cancellation signal (e.g., VineMsgType 5 or a specific RPC cancellation method)
	 * for this `tokenId` is received from the MainThread.
	 *
	 * Calling this method will cause the `isCancellationRequested` property of the
	 * corresponding `CancellationToken` (obtained via `obtainTokenAndDisposable`) to become `true`,
	 * and any listeners registered on that token's `onCancellationRequested` event will be fired.
	 *
	 * @param tokenId - The unique numeric identifier of the operation to be cancelled.
	 */
	public cancel(tokenId: number): void {
		// Validate the tokenId.
		if (typeof tokenId !== "number" || tokenId <= 0) {
			this._logServiceInstance?.warn(
				`[CancellationTokenRegistry] Attempted to cancel operation with an invalid tokenId: '${tokenId}'. Ignoring.`,
			);
			return; // Do nothing for invalid tokenIds.
		}

		// Retrieve the CancellationTokenSource for this tokenId.
		const cancellationTokenSourceToCancel =
			this._cancellationTokenSourcesMap.get(tokenId);

		if (cancellationTokenSourceToCancel) {
			// If a source exists for this tokenId:
			if (
				!cancellationTokenSourceToCancel.token.isCancellationRequested
			) {
				// If it's not already cancelled, trigger cancellation.
				this._logServiceInstance?.debug(
					`[CancellationTokenRegistry] Received cancellation signal from MainThread. Cancelling operation for tokenId: ${tokenId}.`,
				);
				cancellationTokenSourceToCancel.cancel(); // This signals the token.
			} else {
				// If it was already cancelled, log for traceability.
				this._logServiceInstance?.trace(
					`[CancellationTokenRegistry] Received cancellation signal for tokenId: ${tokenId}, but the operation was already marked as cancelled.`,
				);
			}
			// Important Note on Disposal: We do NOT remove or dispose of the `cancellationTokenSourceToCancel` here
			// immediately upon receiving the `cancel(tokenId)` call from MainThread.
			// The `IDisposable` returned by `obtainTokenAndDisposable` is still responsible for the
			// ultimate cleanup of the source when the operation associated with it finally completes
			// or is otherwise cleaned up by the consuming service (e.g., in a `finally` block).
			//
			// Disposing the source here prematurely could cause issues if the operation was still
			// running and subsequently tried to check its `CancellationToken`. A disposed token
			// behaves like a cancelled one, but it might also lead to unexpected errors if the
			// operation tries to register further listeners on a disposed token.
			// The standard pattern is: `cancel()` signals, `dispose()` (on the source or its manager) cleans up.
		} else {
			// If no active CancellationTokenSource is found for the tokenId.
			// This could mean the operation already completed (and its source was disposed of via
			// the `IDisposable` from `obtainTokenAndDisposable`), or the `tokenId` is erroneous,
			// or a race condition occurred.
			this._logServiceInstance?.warn(
				`[CancellationTokenRegistry] Received cancellation signal for tokenId: ${tokenId}, but no active ` +
					`CancellationTokenSource was found. The operation might have already completed and its token source been disposed, ` +
					`or the tokenId is incorrect.`,
			);
		}
	}

	/**
	 * Disposes of all currently managed `CancellationTokenSource` instances in the registry.
	 * This method should be called when the `CancellationTokenRegistry` instance itself
	 * is being disposed of (e.g., during the shutdown of the Cocoon extension host process),
	 * to ensure that all resources are properly released and no lingering operations
	 * or listeners remain.
	 */
	public dispose(): void {
		this._logServiceInstance?.debug(
			`[CancellationTokenRegistry] Disposing of CancellationTokenRegistry. ` +
				`Disposing all (${this._cancellationTokenSourcesMap.size}) currently managed CancellationTokenSources.`,
		);
		// Iterate over all stored CancellationTokenSource instances and call `dispose()` on each.
		this._cancellationTokenSourcesMap.forEach(
			(cancellationTokenSourceInstance, tokenId) => {
				this._logServiceInstance?.trace(
					`[CancellationTokenRegistry] Disposing CancellationTokenSource for tokenId: ${tokenId} during registry shutdown.`,
				);
				cancellationTokenSourceInstance.dispose();
			},
		);
		// Clear the map to release references.
		this._cancellationTokenSourcesMap.clear();
		this._logServiceInstance?.trace(
			"[CancellationTokenRegistry] All CancellationTokenSources disposed and map cleared.",
		);
	}
}
