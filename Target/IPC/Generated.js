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
  setRequestid(_Id) {
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
  setRequestid(_Id) {
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
  Method = "";
  Parameter;
  setMethod(Method) {
    this.Method = Method;
  }
  setParams(Parameters) {
    this.Parameter = Parameters;
  }
  getMethod() {
    return this.Method;
  }
  getParams() {
    return this.Parameter;
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
  getBuffer() {
    return new Uint8Array();
  }
}
const Proto = {
  Empty,
  GenericRequest,
  GenericResponse,
  GenericNotification,
  CancelOperationRequest,
  RPCDataPayload
};
export {
  CancelOperationRequest,
  Empty,
  GenericNotification,
  GenericRequest,
  GenericResponse,
  Proto,
  RPCDataPayload
};
//# sourceMappingURL=Generated.js.map
