var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Utility/Result.ts
var Result = {
  Ok: /* @__PURE__ */ __name((Value) => ({ success: true, value: Value }), "Ok"),
  Err: /* @__PURE__ */ __name((Error2) => ({ success: false, error: Error2 }), "Err"),
  IsOk: /* @__PURE__ */ __name((R) => R.success, "IsOk"),
  IsErr: /* @__PURE__ */ __name((R) => !R.success, "IsErr")
};
var Ok = Result.Ok;
var Err = Result.Err;
var Result_default = Result;
export {
  Err,
  Ok,
  Result,
  Result_default as default
};
//# sourceMappingURL=Result.js.map
