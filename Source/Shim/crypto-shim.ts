/*---------------------------------------------------------------------------------------------
 * Cocoon Crypto Shim (crypto-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in 'crypto' module. This shim is intended to be
 * supplied by the `NodeModuleShimFactory` when an extension executes `require('crypto')`.
 *
 * The primary goal is to offer a controlled and safe subset of the native 'crypto'
 * module's capabilities. For most common and generally secure cryptographic operations
 * (such as hashing, HMAC, random byte generation, UUID creation, and various getters for
 * supported algorithms), this shim delegates directly to the native Node.js 'crypto'
 * module available in the Cocoon environment.
 *
 * Operations deemed more sensitive, platform-dependent, or those that might require
 * access to system-level key stores or entropy sources not directly available/trusted
 * in a sandboxed Cocoon environment, are currently NOT implemented for proxying to the
 * Mountain host. Placeholders or stubs might exist for such functions, indicating
 * they would require an IPC mechanism if their functionality were needed.
 *
 * Responsibilities:
 * - Mimicking the interface of the Node.js 'crypto' module for a curated set of
 *   commonly used and safe functions.
 * - Delegating these safe operations directly to the corresponding methods in `node:crypto`.
 * - Correctly handling the overloaded signature of `crypto.randomBytes` (synchronous
 *   and asynchronous callback-based versions).
 * - Exposing Node.js `crypto.constants`.
 * - Providing clear stubs or placeholders for crypto operations that are not currently
 *   supported or would require proxying to Mountain.
 *
 * Key Interactions:
 * - An instance of this shim is returned by `NodeModuleShimFactory` when an extension
 *   issues `require('crypto')`.
 * - It directly utilizes the `node:crypto` module from the Node.js runtime environment
 *   in which Cocoon operates.
 * - (Future) If any operations were proxied, it would use `sendToMountainAndWait` from
 *   `../cocoon-ipc.ts`.
 *
 *--------------------------------------------------------------------------------------------*/

import * as nodeCrypto from "node:crypto";
// For type information from @types/node, assuming it's a dev dependency for accurate types.
import type * as NodeCryptoTypes from "node:crypto";

// Uncomment if proxying is implemented in the future:
// import { sendToMountainAndWait } from "../cocoon-ipc";

// --- Type Definitions ---

/**
 * Defines the public interface of the Cocoon crypto shim.
 * This interface aims to match relevant and commonly used parts of the Node.js 'crypto' module API,
 *
 * focusing on operations that are generally safe to expose directly from the Cocoon environment.
 */
export interface CocoonCryptoShim {
	/** @see {@link nodeCrypto.createHash} */
	createHash: typeof nodeCrypto.createHash;

	/** @see {@link nodeCrypto.createHmac} */
	createHmac: typeof nodeCrypto.createHmac;

	/**
	 * Generates cryptographically strong pseudo-random data.
	 * Supports both synchronous invocation (returns a `Buffer`) and asynchronous
	 * invocation (takes a callback and effectively returns `void`).
	 * @param size The number of bytes to generate.
	 * @param callback Optional callback `(err, buf) => void`. If provided, the operation is asynchronous.
	 * @returns A `Buffer` containing the random data if invoked synchronously.
	 *          If a callback is provided, the return value of this shimmed function is a dummy
	 *          buffer to satisfy TypeScript; the actual result is passed to the callback.
	 * @see {@link nodeCrypto.randomBytes}
	 *
	 */
	randomBytes: (
		size: number,

		callback?: (err: Error | null, buf: Buffer) => void,
	) => Buffer;

	/**
	 * Fills the provided `TypedArray` with cryptographically strong random values.
	 * This method is part of the Web Crypto API and is available in Node.js v15.0.0+ / v14.17.0+.
	 * Will be `undefined` if the running Node.js version does not support it.
	 * @see {@link nodeCrypto.getRandomValues}
	 *
	 */
	getRandomValues?: typeof nodeCrypto.getRandomValues;

	/**
	 * Generates a random RFC 4122 version 4 UUID.
	 * Available in Node.js v15.6.0+ / v14.17.0+.
	 * @see {@link nodeCrypto.randomUUID}
	 *
	 */
	randomUUID: typeof nodeCrypto.randomUUID;

	/**
	 * Exposes Node.js crypto constants (e.g., for OpenSSL options, padding modes).
	 * @see {@link nodeCrypto.constants}
	 *
	 */
	constants: typeof nodeCrypto.constants;

	/**
	 * Performs a timing-safe equality comparison of two Buffers.
	 * @see {@link nodeCrypto.timingSafeEqual}
	 *
	 */
	timingSafeEqual: typeof nodeCrypto.timingSafeEqual;

	/**
	 * Returns an array of the names of the supported hash algorithms.
	 * @see {@link nodeCrypto.getHashes}
	 *
	 */
	getHashes: typeof nodeCrypto.getHashes;

	/**
	 * Returns an array of the names of the supported cipher algorithms.
	 * @see {@link nodeCrypto.getCiphers}
	 *
	 */
	getCiphers: typeof nodeCrypto.getCiphers;

	// TODO: Consider adding other commonly used, generally safe crypto functions from node:crypto as needed.
	// Examples:
	// - `pbkdf2`, `scrypt` (for password-based key derivation)
	// - `randomFill` (similar to randomBytes but fills an existing buffer)
	// - `generateKey` (for symmetric key generation)
	// - `createCipheriv`, `createDecipheriv`, `createSign`, `createVerify` (for symmetric/asymmetric crypto if IVs/keys are managed locally)
	// Each addition should be evaluated for security implications in the Cocoon context and whether
	// direct delegation is appropriate versus needing proxying or being omitted.

	// Placeholder for a function that might require proxying to Mountain due to system dependencies or entropy concerns.
	// generateKeyPairProxied?(
	// e.g., 'rsa', 'ec'
	//    type: NodeCryptoTypes.KeyType,

	//    options: NodeCryptoTypes.GenerateKeyPairKeyObjectOptions | NodeCryptoTypes.GenerateKeyPairStringOptions
	// ): Promise<{ publicKey: string | Buffer; privateKey: string | Buffer }>;
}

/**
 * The singleton instance of the Cocoon crypto shim, implementing `CocoonCryptoShim`.
 * This instance is what `NodeModuleShimFactory` provides when `require('crypto')` is called.
 */
const cryptoShimInstance: CocoonCryptoShim = {
	// Direct delegations to the native node:crypto module:
	createHash: nodeCrypto.createHash,

	createHmac: nodeCrypto.createHmac,

	randomBytes: (
		size: number,

		callback?: (err: Error | null, buf: Buffer) => void,
	): Buffer => {
		if (callback) {
			// Asynchronous (callback-based) invocation.
			try {
				const randomBuffer = nodeCrypto.randomBytes(size);

				// Defer the callback to the next tick of the event loop to better mimic
				// the asynchronous nature expected by callers of the callback version.
				process.nextTick(() => callback(null, randomBuffer));
			} catch (error: any) {
				// If nodeCrypto.randomBytes throws synchronously (e.g., invalid size argument),

				// capture the error and pass it to the callback in the next tick.
				// Provide an empty Buffer on error.
				process.nextTick(() => callback(error, Buffer.alloc(0)));
			}

			// The actual Node.js `randomBytes` with a callback has a `void` return type.
			// To satisfy the `CocoonCryptoShim.randomBytes` signature which must return `Buffer`
			// (due to the synchronous overload), we return a dummy empty buffer here.
			// Callers of the asynchronous version will ignore this return value and rely on the callback.
			return Buffer.alloc(0);
		} else {
			// Synchronous invocation.
			return nodeCrypto.randomBytes(size);
		}
	},

	// `nodeCrypto.randomUUID` is available in Node.js v15.6.0+ and v14.17.0+.
	// Ensure Cocoon's target Node.js environment version supports this.
	randomUUID: nodeCrypto.randomUUID,

	// `nodeCrypto.getRandomValues` is available in Node.js v15.0.0+ and v14.17.0+.
	// If running on an older Node.js version where `nodeCrypto.getRandomValues` is undefined,

	// then `cryptoShimInstance.getRandomValues` will also be undefined, matching native behavior.
	getRandomValues: nodeCrypto.getRandomValues,

	constants: nodeCrypto.constants,

	timingSafeEqual: nodeCrypto.timingSafeEqual,

	getHashes: nodeCrypto.getHashes,

	getCiphers: nodeCrypto.getCiphers,

	// --- Placeholder for a function that might require proxying to Mountain ---
	// generateKeyPairProxied: async (type, options) => {

	//    console.warn("[Cocoon Crypto Shim] generateKeyPairProxied - This is a placeholder function and would require IPC to Mountain.");

	// Example of how proxying might look if implemented:
	//
	// return sendToMountainAndWait('mountain_crypto_generateKeyPair', { type, options }, 15000);

	//
	//    throw new Error("generateKeyPairProxied is not implemented in this crypto-shim.");

	// }
};

// Export the singleton instance for use by NodeModuleShimFactory.
export default cryptoShimInstance;
