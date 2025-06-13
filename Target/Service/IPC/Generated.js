var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
class Empty {
  static {
    __name(this, "Empty");
  }
}
class GenericRequest {
  static {
    __name(this, "GenericRequest");
  }
  setRequestid(_id) {
  }
  setMethod(_method) {
  }
  setParams(_params) {
  }
  getRequestid() {
    return 0;
  }
  getMethod() {
    return "";
  }
  getParams() {
    return void 0;
  }
}
class GenericResponse {
  static {
    __name(this, "GenericResponse");
  }
  setRequestid(_id) {
  }
  setResult(_result) {
  }
  getResult() {
    return void 0;
  }
}
class GenericNotification {
  static {
    __name(this, "GenericNotification");
  }
  setMethod(_method) {
  }
  setParams(_params) {
  }
}
class CancelOperationRequest {
  static {
    __name(this, "CancelOperationRequest");
  }
  getRequestidtocancel() {
    return 0;
  }
}
class RPCDataPayload {
  static {
    __name(this, "RPCDataPayload");
  }
  setBuffer(_buffer) {
  }
  getBuffer_asU8() {
    return new Uint8Array();
  }
}
const MountainServiceClient = /* @__PURE__ */ __name(function() {
}, "MountainServiceClient");
export {
  CancelOperationRequest,
  Empty,
  GenericNotification,
  GenericRequest,
  GenericResponse,
  MountainServiceClient,
  RPCDataPayload
};
//# sourceMappingURL=Generated.js.map
