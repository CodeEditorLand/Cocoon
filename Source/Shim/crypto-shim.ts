// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/122_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): 0f0f77eeed162223172c911ee268abfaab063375577b968041ba0014ab1dcccf
// Extracted to File: Backup/TSFMSC/Code/crypto-shim.ts
// Extraction Timestamp: 2025-05-25T14:02:57.022Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE crypto-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Crypto Shim (crypto-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in 'crypto' module. This shim is intended to be
 * supplied by the `NodeModuleShimFactory` when an extension executes `require('crypto')`.
 *
 * For most common and generally safe cryptographic operations (such as hashing, HMAC,
 * random byte generation, and UUID creation), this shim delegates directly to the
 * native Node.js 'crypto' module available in the Cocoon environment.
 *
 * More sensitive or platform-dependent crypto operations (e.g., those requiring
 * system-specific key stores or entropy sources not directly available or trusted
 * in a sandboxed Cocoon environment) would need to be proxied to the Mountain host
 * if such functionality were required by extensions. Currently, this shim does not
 * proxy any operations to Mountain.
 *
 * Responsibilities:
 * - Mimicking the interface of the Node.js 'crypto' module for commonly used functions.
 * - Delegating safe operations directly to `node:crypto`.
 * - Handling the overloaded signature of `randomBytes`.
 * - Providing stubs or placeholders for operations that might require proxying.
 *
 * Key Interactions:
 * - Returned by `NodeModuleShimFactory` when `require('crypto')` is intercepted.
 * - Directly uses the `node:crypto` module from the Node.js environment.
 * - (Placeholder) Could use `sendToMountainAndWait` from `cocoon-ipc.ts` for proxied operations.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import * as nodeCrypto from "node:crypto";
// For type information from @types/node, assuming it's a dev dependency for accurate types.
import type * as NodeCryptoTypes from "node:crypto";

// Uncomment if proxying is implemented:
// import { sendToMountainAndWait } from "../cocoon-ipc";

// --- Type Definitions ---

/**
 * Defines the public interface of the Cocoon crypto shim.
 * This interface aims to match relevant parts of the Node.js 'crypto' module API.
 * It includes directly delegated functions and placeholders for potentially proxied ones.
 */
export interface CocoonCryptoShim {
	// Directly delegated from node:crypto
	createHash: typeof nodeCrypto.createHash;
	createHmac: typeof nodeCrypto.createHmac;

	/**
	 * Generates cryptographically strong pseudo-random data.
	 * Supports both synchronous and asynchronous (callback-based) invocation.
	 */
	randomBytes: (
		size: number,
		callback?: (err: Error | null, buf: Buffer) => void,
	) => Buffer; // Synchronous version returns Buffer; callback version has void return managed by shim logic.

	/**
	 * Fills the provided TypedArray with cryptographically strong random values.
	 * Available in Node.js v15.0.0+ / v14.17.0+. Part of the Web Crypto API.
	 */
	getRandomValues?: typeof nodeCrypto.getRandomValues;

	/**
	 * Generates a random UUID.
	 * Available in Node.js v15.6.0+ / v14.17.0+.
	 */
	randomUUID: typeof nodeCrypto.randomUUID;

	/** Exposes Node.js crypto constants (e.g., for OpenSSL). */
	constants: typeof nodeCrypto.constants;

	// Commonly used, safe crypto functions that can be directly delegated:
	timingSafeEqual: typeof nodeCrypto.timingSafeEqual;
	getHashes: typeof nodeCrypto.getHashes;
	getCiphers: typeof nodeCrypto.getCiphers;
	// TODO: Add other commonly used, safe crypto functions if needed by extensions, e.g.,
	// pbkdf2, scrypt, randomFill, generateKey, createCipheriv, createDecipheriv, etc.
	// Each should be evaluated for safety and whether proxying might be necessary.

	// Example of a function that might need proxying if it involved system specifics
	// or if Cocoon's environment has insufficient/untrusted entropy for key generation.
	// generateKeyPairProxied?(
	//    type: 'rsa' | 'dsa' | 'ec' | string, // NodeCryptoTypes.KeyType
	//    options: NodeCryptoTypes.GenerateKeyPairKeyObjectOptions | NodeCryptoTypes.GenerateKeyPairStringOptions
	// ): Promise<{ publicKey: string | Buffer; privateKey: string | Buffer }>;
}

/**
 * The actual instance of the crypto shim.
 */
const cryptoShimInstance: CocoonCryptoShim = {
	// Functions delegated directly to Node.js's crypto module:
	createHash: nodeCrypto.createHash,
	createHmac: nodeCrypto.createHmac,

	randomBytes: (
		size: number,
		callback?: (err: Error | null, buf: Buffer) => void,
	): Buffer => {
		if (callback) {
			// Asynchronous (callback-based) version
			try {
				const buf = nodeCrypto.randomBytes(size);
				// Defer the callback to the next tick to better mimic Node.js's async behavior
				// for I/O-bound operations, even though randomBytes can be CPU-bound.
				process.nextTick(() => callback(null, buf));
			} catch (err:any) {
				// If nodeCrypto.randomBytes throws synchronously (e.g., bad size),
				// pass the error to the callback in the next tick.
				process.nextTick(() => callback(err, Buffer.alloc(0))); // Pass empty buffer on error
			}
			// The signature for the callback version in Node.js is `void`.
			// However, to satisfy the union type `Buffer | void` (if we were stricter),
			// this branch should effectively return `void`.
			// Since the sync version *must* return a Buffer, and callers of the async
			// version ignore the return value, returning a dummy buffer here is acceptable
			// if the function must return Buffer.
			// Best approach for overloaded functions like this in a shim is often to
			// directly call the overloaded native function if types align, or pick one path.
			// Here, we handle both explicitly.
			// If a Buffer must be returned even for the async path (due to TS typing of the shim):
			return Buffer.alloc(0); // Or throw if strict void return is needed for async.
		} else {
			// Synchronous version
			return nodeCrypto.randomBytes(size);
		}
	},

	// randomUUID is available in Node.js v15.6.0+ / v14.17.0+.
	// Ensure Cocoon's target Node.js version supports this.
	randomUUID: nodeCrypto.randomUUID,

	// getRandomValues is part of Web Crypto API and also in Node's crypto since v15.0.0 / v14.17.0
	// It might not exist in older Node versions targeted by some VS Code code.
	// Provide it if available; otherwise, it will be undefined on the shim if nodeCrypto itself doesn't have it.
	getRandomValues: nodeCrypto.getRandomValues,

	constants: nodeCrypto.constants,

	timingSafeEqual: nodeCrypto.timingSafeEqual,
	getHashes: nodeCrypto.getHashes,
	getCiphers: nodeCrypto.getCiphers,

	// --- Example of a function that MIGHT need proxying (Placeholder) ---
	// generateKeyPairProxied: async (type, options) => {
	//    console.warn("[Cocoon Crypto Shim] generateKeyPairProxied - This is a placeholder and would proxy to Mountain if implemented.");
	//    // Example of how proxying might look:
	//    // return sendToMountainAndWait('crypto_generateKeyPair', { type, options }, 15000);
	//    throw new Error("generateKeyPairProxied is not implemented in this crypto-shim.");
	// }
};

// Default export for easy import by NodeModuleShimFactory.
export default cryptoShimInstance;
--- END OF FILE crypto-shim.ts ---