var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Languages from "vs/editor/common/languages.js";
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { default as DiagnosticConverter } from "./Diagnostic.js";
import WorkSpaceEditConverter from "./WorkSpaceEdit.js";
const CodeActionKind = {
  ToAPI: /* @__PURE__ */ __name((Kind) => {
    return new ExtHostTypes.CodeActionKind(Kind);
  }, "ToAPI"),
  FromAPI: /* @__PURE__ */ __name((Kind) => {
    return Kind.value;
  }, "FromAPI")
};
const CodeActionTriggerKind = {
  ToAPI: /* @__PURE__ */ __name((Trigger) => {
    return Trigger === Languages.CodeActionTriggerType.Invoke ? ExtHostTypes.CodeActionTriggerKind.Invoke : ExtHostTypes.CodeActionTriggerKind.Automatic;
  }, "ToAPI")
};
const CodeActionContext = {
  ToAPI: /* @__PURE__ */ __name((DTO) => ({
    diagnostics: DTO.diagnostics.map(
      (Diagnostic) => DiagnosticConverter.ToAPI(Diagnostic)
    ),
    only: DTO.only ? CodeActionKind.ToAPI(DTO.only) : void 0,
    triggerKind: DTO.trigger ? CodeActionTriggerKind.ToAPI(DTO.trigger) : ExtHostTypes.CodeActionTriggerKind.Invoke
  }), "ToAPI")
};
const CodeAction = {
  FromAPI: /* @__PURE__ */ __name((Action, CommandsConverter, Disposables, VersionProvider) => {
    return {
      title: Action.title,
      kind: Action.kind ? CodeActionKind.FromAPI(Action.kind) : void 0,
      isPreferred: Action.isPreferred,
      disabled: Action.disabled?.reason,
      command: Action.command ? CommandsConverter.ToInternal(Action.command, Disposables) : void 0,
      diagnostics: Action.diagnostics ? DiagnosticConverter.FromAPIArray(Action.diagnostics) : void 0,
      edit: Action.edit ? WorkSpaceEditConverter.FromAPI(Action.edit, VersionProvider) : void 0
    };
  }, "FromAPI"),
  ToAPI: /* @__PURE__ */ __name((DTO, CommandsConverter) => {
    const Action = new ExtHostTypes.CodeAction(
      DTO.title,
      DTO.kind ? CodeActionKind.ToAPI(DTO.kind) : void 0
    );
    Action.command = DTO.command ? CommandsConverter.FromInternal(DTO.command) : void 0;
    Action.diagnostics = DTO.diagnostics?.map(
      (Diagnostic) => DiagnosticConverter.ToAPI(Diagnostic)
    );
    Action.edit = DTO.edit ? WorkSpaceEditConverter.ToAPI(DTO.edit) : void 0;
    Action.isPreferred = DTO.isPreferred;
    if (DTO.disabled) {
      Action.disabled = { reason: DTO.disabled };
    }
    return Action;
  }, "ToAPI")
};
var CodeAction_default = {
  CodeActionKind,
  CodeActionTriggerKind,
  CodeActionContext,
  CodeAction
};
export {
  CodeAction_default as default
};
//# sourceMappingURL=CodeAction.js.map
