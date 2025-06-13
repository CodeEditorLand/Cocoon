var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as NodeCrypto from "node:crypto";
const CreateStub = /* @__PURE__ */ __name((Name) => {
  return () => {
    throw new Error(
      `[Cocoon Crypto Shim] STUB: 'crypto.${Name}' is not implemented or is disallowed in the Cocoon runtime.`
    );
  };
}, "CreateStub");
const CryptoShim = {
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
  generatePrime: NodeCrypto.generatePrime ? CreateStub("generatePrime") : void 0,
  generateKeyPair: CreateStub("generateKeyPair"),
  generateKeyPairSync: CreateStub("generateKeyPairSync"),
  createCipheriv: CreateStub("createCipheriv"),
  createDecipheriv: CreateStub("createDecipheriv"),
  createSign: CreateStub("createSign"),
  createVerify: CreateStub("createVerify")
  // Add other sensitive functions to the blocklist as needed.
};
export {
  CryptoShim
};
//# sourceMappingURL=Crypto.js.map
