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
 * @description Creates the shim object for the `crypto` module.
 * @returns An object that safely implements a subset of the `crypto` API.
 */
export declare const CreateCryptoShim: () => {
    createHash: typeof NodeCrypto.createHash;
    createHmac: typeof NodeCrypto.createHmac;
    randomBytes: typeof NodeCrypto.randomBytes;
    getRandomValues: typeof NodeCrypto.getRandomValues;
    randomUUID: typeof NodeCrypto.randomUUID;
    randomFill: typeof NodeCrypto.randomFill;
    randomFillSync: typeof NodeCrypto.randomFillSync;
    pbkdf2: typeof NodeCrypto.pbkdf2;
    pbkdf2Sync: typeof NodeCrypto.pbkdf2Sync;
    timingSafeEqual: typeof NodeCrypto.timingSafeEqual;
    getHashes: typeof NodeCrypto.getHashes;
    getCiphers: typeof NodeCrypto.getCiphers;
    constants: typeof NodeCrypto.constants;
    generatePrime: (() => never) | undefined;
    generateKeyPair: () => never;
    generateKeyPairSync: () => never;
    createCipheriv: () => never;
    createDecipheriv: () => never;
    createSign: () => never;
    createVerify: () => never;
};
