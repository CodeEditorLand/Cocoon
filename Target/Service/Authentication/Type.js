var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
const ConvertSessionToVSCode = /* @__PURE__ */ __name((Session) => {
  return {
    id: Session.id,
    accessToken: Session.accessToken,
    account: {
      label: Session.account.label,
      id: Session.account.id
    },
    scopes: Session.scopes,
    tenantId: "",
    // Placeholder, adjust if needed
    idToken: void 0
    // Placeholder, adjust if needed
  };
}, "ConvertSessionToVSCode");
const ConvertSessionToInternal = /* @__PURE__ */ __name((Session) => {
  return {
    id: Session.id,
    accessToken: Session.accessToken,
    account: {
      label: Session.account.label,
      id: Session.account.id
    },
    scopes: Session.scopes,
    tenantId: "",
    // Placeholder, adjust if needed
    idToken: void 0
    // Placeholder, adjust if needed
  };
}, "ConvertSessionToInternal");
export {
  ConvertSessionToInternal,
  ConvertSessionToVSCode
};
//# sourceMappingURL=Type.js.map
