var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Languages from "vs/editor/common/languages.js";
import {
  CodeAction as VscCodeAction,
  CodeActionTriggerKind as VscCodeActionTriggerKind
} from "vscode";
import { default as DiagnosticConverter } from "./Diagnostic.js";
import WorkSpaceEditConverter from "./WorkSpaceEdit.js";
const CodeActionKind = {
  ToAPI: /* @__PURE__ */ __name((kind) => {
    return { value: kind };
  }, "ToAPI"),
  FromAPI: /* @__PURE__ */ __name((kind) => {
    return kind.value;
  }, "FromAPI")
};
const CodeActionTriggerKind = {
  ToAPI: /* @__PURE__ */ __name((trigger) => {
    return trigger === Languages.CodeActionTriggerType.Invoke ? VscCodeActionTriggerKind.Invoke : VscCodeActionTriggerKind.Automatic;
  }, "ToAPI")
};
const CodeActionContext = {
  ToAPI: /* @__PURE__ */ __name((dto) => ({
    diagnostics: dto.diagnostics.map(
      (diagnostic) => DiagnosticConverter.ToAPI(diagnostic)
    ),
    only: dto.only ? CodeActionKind.ToAPI(dto.only) : void 0,
    triggerKind: dto.trigger ? CodeActionTriggerKind.ToAPI(dto.trigger) : VscCodeActionTriggerKind.Invoke
  }), "ToAPI")
};
const CodeAction = {
  FromAPI: /* @__PURE__ */ __name((action, commandsConverter, disposables, versionProvider) => {
    return {
      title: action.title,
      kind: action.kind ? CodeActionKind.FromAPI(action.kind) : void 0,
      isPreferred: action.isPreferred,
      disabled: action.disabled?.reason,
      command: action.command ? commandsConverter.ToInternal(action.command, disposables) : void 0,
      diagnostics: action.diagnostics ? DiagnosticConverter.FromAPIArray(action.diagnostics) : void 0,
      edit: action.edit ? WorkSpaceEditConverter.FromAPI(action.edit, versionProvider) : void 0
    };
  }, "FromAPI"),
  ToAPI: /* @__PURE__ */ __name((dto, commandsConverter) => {
    const Action = new VscCodeAction(
      dto.title,
      dto.kind ? CodeActionKind.ToAPI(dto.kind) : void 0
    );
    Action.command = dto.command ? commandsConverter.FromInternal(dto.command) : void 0;
    Action.diagnostics = dto.diagnostics?.map(
      (diagnostic) => DiagnosticConverter.ToAPI(diagnostic)
    );
    Action.edit = dto.edit ? WorkSpaceEditConverter.ToAPI(dto.edit) : void 0;
    Action.isPreferred = dto.isPreferred;
    if (dto.disabled) {
      Action.disabled = { reason: dto.disabled };
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
