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
  setRequestid(_ID) {
  }
  setMethod(_Method) {
  }
  setParams(_Parameters) {
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
  setRequestid(_ID) {
  }
  setResult(_Result) {
  }
  getResult() {
    return void 0;
  }
}
class GenericNotification {
  static {
    __name(this, "GenericNotification");
  }
  method = "";
  params;
  setMethod(Method) {
    this.method = Method;
  }
  setParams(Parameters) {
    this.params = Parameters;
  }
  getMethod() {
    return this.method;
  }
  getParams() {
    return this.params;
  }
}
class CancelOperationRequest {
  static {
    __name(this, "CancelOperationRequest");
  }
  getRequestid() {
    return 0;
  }
}
class RPCDataPayload {
  static {
    __name(this, "RPCDataPayload");
  }
  setBuffer(_Buffer) {
  }
  getBuffer_asU8() {
    return new Uint8Array();
  }
}
const MountainServiceClient = /* @__PURE__ */ __name(() => {
}, "MountainServiceClient");
var Generated_default = {
  Empty,
  GenericRequest,
  GenericResponse,
  GenericNotification,
  CancelOperationRequest,
  RPCDataPayload,
  MountainServiceClient
};
export {
  Generated_default as default
};
//# sourceMappingURL=Generated.js.map
