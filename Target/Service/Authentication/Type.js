var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
function ConvertSessionToVSCode(Session) {
  return {
    id: Session.id,
    accessToken: Session.accessToken,
    account: {
      label: Session.account.label,
      id: Session.account.id
    },
    scopes: Session.scopes
  };
}
__name(ConvertSessionToVSCode, "ConvertSessionToVSCode");
function ConvertSessionToInternal(Session) {
  return {
    id: Session.id,
    accessToken: Session.accessToken,
    account: {
      label: Session.account.label,
      id: Session.account.id
    },
    scopes: Session.scopes
  };
}
__name(ConvertSessionToInternal, "ConvertSessionToInternal");
export {
  ConvertSessionToInternal,
  ConvertSessionToVSCode
};
//# sourceMappingURL=Type.js.map
