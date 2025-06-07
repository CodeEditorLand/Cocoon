/*
 * File: Cocoon/Source/Shim/Disposable.ts
 * Responsibility: Provides a utility for managing disposable resources in the Node.js sidecar, ensuring proper cleanup of resources such as event listeners or provider registrations when they are no longer needed.
 * Modified: 2025-06-07 00:57:44 UTC
 * Export: Disposable
 */

// Defines the `Disposable` class for the `vscode` API shim. This is a fundamental
// utility for managing resources that need to be cleaned up.

/**
 * Represents a disposable resource.
 * The standard pattern is that an object that allocates a resource, like an event listener
 * or a provider registration, will return a `Disposable`. The caller is responsible for
 * calling `Dispose()` on this object when the resource is no longer needed.
 */
export class Disposable {
	private _IsDisposed: boolean = false;
	private readonly _CallOnDispose: () => any;

	/**
	 * Creates a new `Disposable`.
	 * @param CallOnDispose The function to call when `Dispose()` is invoked.
	 */
	constructor(CallOnDispose: () => any) {
		this._CallOnDispose = CallOnDispose;
	}

	/**
	 * Disposes the resource, triggering the cleanup function.
	 * This method can be called multiple times but will only execute the cleanup once.
	 */
	public Dispose(): any {
		if (!this._IsDisposed) {
			this._IsDisposed = true;
			this._CallOnDispose();
		}
	}

	/**
	 * A static factory method to create a `Disposable` from a set of disposable-like objects.
	 * The returned `Disposable` will dispose all provided disposables when it is disposed.
	 * @param DisposableLike A set of objects that have a `dispose` method.
	 * @returns A new `Disposable` that manages the lifecycle of the input disposables.
	 */
	public static From(...DisposableLike: { Dispose(): any }[]): Disposable {
		return new Disposable(() => {
			if (Array.isArray(DisposableLike)) {
				for (const Item of DisposableLike) {
					if (Item && typeof Item.Dispose === "function") {
						try {
							Item.Dispose();
						} catch (Error) {
							// Log or handle error if necessary, but don't stop disposing others.
							console.error(
								"Error during aggregated disposal:",
								Error,
							);
						}
					}
				}
			}
		});
	}
}
