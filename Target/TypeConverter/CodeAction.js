var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Languages from "vs/editor/common/languages.js";
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import * as DiagnosticConverter from "./Diagnostic.js";
import {
  WorkSpaceEdit as WorkSpaceEditConverter
} from "./WorkSpaceEdit.js";
var CodeActionKind;
((CodeActionKind2) => {
  function ToAPI(kind) {
    return new ExtHostTypes.CodeActionKind(kind);
  }
  CodeActionKind2.ToAPI = ToAPI;
  __name(ToAPI, "ToAPI");
  function FromAPI(kind) {
    return kind.value;
  }
  CodeActionKind2.FromAPI = FromAPI;
  __name(FromAPI, "FromAPI");
})(CodeActionKind || (CodeActionKind = {}));
var CodeActionTriggerKind;
((CodeActionTriggerKind2) => {
  function ToAPI(trigger) {
    return trigger === Languages.CodeActionTriggerType.Invoke ? ExtHostTypes.CodeActionTriggerKind.Invoke : ExtHostTypes.CodeActionTriggerKind.Automatic;
  }
  CodeActionTriggerKind2.ToAPI = ToAPI;
  __name(ToAPI, "ToAPI");
})(CodeActionTriggerKind || (CodeActionTriggerKind = {}));
var CodeActionContext;
((CodeActionContext2) => {
  function ToAPI(DTO) {
    return {
      diagnostics: DTO.diagnostics.map(
        (diag) => DiagnosticConverter.ToAPI(diag)
      ),
      only: DTO.only ? CodeActionKind.ToAPI(DTO.only) : void 0,
      triggerKind: DTO.trigger ? CodeActionTriggerKind.ToAPI(DTO.trigger) : ExtHostTypes.CodeActionTriggerKind.Invoke
    };
  }
  CodeActionContext2.ToAPI = ToAPI;
  __name(ToAPI, "ToAPI");
})(CodeActionContext || (CodeActionContext = {}));
var CodeAction;
((CodeAction2) => {
  function FromAPI(Action, CommandsConverter, Disposables, VersionProvider) {
    return {
      title: Action.title,
      kind: Action.kind ? CodeActionKind.FromAPI(Action.kind) : void 0,
      isPreferred: Action.isPreferred,
      disabled: Action.disabled?.reason,
      command: Action.command ? CommandsConverter.ToInternal(Action.command, Disposables) : void 0,
      diagnostics: Action.diagnostics ? DiagnosticConverter.FromAPIArray(Action.diagnostics) : void 0,
      edit: Action.edit ? WorkSpaceEditConverter.FromAPI(Action.edit, VersionProvider) : void 0
    };
  }
  CodeAction2.FromAPI = FromAPI;
  __name(FromAPI, "FromAPI");
  function ToAPI(DTO, CommandsConverter) {
    const action = new ExtHostTypes.CodeAction(
      DTO.title,
      DTO.kind ? CodeActionKind.ToAPI(DTO.kind) : void 0
    );
    action.command = DTO.command ? CommandsConverter.FromInternal(DTO.command) : void 0;
    action.diagnostics = DTO.diagnostics?.map(
      (d) => DiagnosticConverter.ToAPI(d)
    );
    action.edit = DTO.edit ? WorkSpaceEditConverter.ToAPI(DTO.edit) : void 0;
    action.isPreferred = DTO.isPreferred;
    if (DTO.disabled) {
      action.disabled = { reason: DTO.disabled };
    }
    return action;
  }
  CodeAction2.ToAPI = ToAPI;
  __name(ToAPI, "ToAPI");
})(CodeAction || (CodeAction = {}));
export {
  CodeAction,
  CodeActionContext,
  CodeActionKind,
  CodeActionTriggerKind
};
//# sourceMappingURL=CodeAction.js.map
