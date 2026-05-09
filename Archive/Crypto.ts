/**
 * @module Crypto
 * @description Provides a controlled shim for the Node.js `crypto` module.
 * This shim offers a safe subset of the `crypto` module's functionality,
 * delegating common operations to the native implementation while explicitly
 * blocking sensitive or computationally expensive functions to maintain host
 * stability and security.
 */

import * as NodeCrypto from "node:crypto";

/**
 * @description Creates a function that, when called, throws an error, indicating
 * that a specific crypto feature is not implemented or is disallowed.
 * @param Name The name of the stubbed function (e.g., 'generateKeyPair').
 * @returns A function that throws an error.
 */
const CreateStub = (Name: string) => {
	return () => {
		throw new Error(
			`[Cocoon Crypto Shim] STUB: 'crypto.${Name}' is not implemented or is disallowed in the Cocoon runtime.`,
		);
	};
};

/**
 * @description Creates the shim object for the `crypto` module.
 * @returns An object that safely implements a subset of the `crypto` API.
 */
export const CreateCryptoShim = () => {
	return {
		// --- Direct Delegations (Safe Functions) ---
		createHash: NodeCrypto.createHash,

		createHmac: NodeCrypto.createHmac,

		randomBytes: NodeCrypto.randomBytes,

		getRandomValues: NodeCrypto.getRandomValues,

		randomUUID: NodeCrypto.randomUUID,

		randomFill: NodeCrypto.randomFill,

		randomFillSync: NodeCrypto.randomFillSync,

		pbkdf2: NodeCrypto.pbkdf2,

		pbkdf2Sync: NodeCrypto.pbkdf2Sync,

		timingSafeEqual: NodeCrypto.timingSafeEqual,

		getHashes: NodeCrypto.getHashes,

		getCiphers: NodeCrypto.getCiphers,

		constants: NodeCrypto.constants,

		// --- Blocked / Stubbed Functions (Sensitive or Complex) ---
		generatePrime:
			typeof NodeCrypto.generatePrime === "function"
				? CreateStub("generatePrime")
				: undefined,

		generateKeyPair: CreateStub("generateKeyPair"),

		generateKeyPairSync: CreateStub("generateKeyPairSync"),

		createCipheriv: CreateStub("createCipheriv"),

		createDecipheriv: CreateStub("createDecipheriv"),

		createSign: CreateStub("createSign"),

		createVerify: CreateStub("createVerify"),
	};
};
