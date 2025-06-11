var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { DisposableStore } from "vs/base/common/lifecycle.js";
import * as Languages from "vs/editor/common/languages.js";
import * as ExtHostProtocol from "vs/workbench/api/common/extHost.protocol.js";
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { Commands as CommandsConverter } from "./Commands.js";
import { Diagnostic as DiagnosticConverter } from "./Diagnostic.js";
import {
  WorkspaceEdit as WorkspaceEditConverter
} from "./WorkspaceEdit.js";
var CodeActionKind;
((CodeActionKind2) => {
  CodeActionKind2.toApi = /* @__PURE__ */ __name((kind) => new ExtHostTypes.CodeActionKind(kind), "toApi");
  CodeActionKind2.fromApi = /* @__PURE__ */ __name((kind) => kind.value, "fromApi");
})(CodeActionKind || (CodeActionKind = {}));
var CodeActionTriggerKind;
((CodeActionTriggerKind2) => {
  CodeActionTriggerKind2.toApi = /* @__PURE__ */ __name((trigger) => trigger === Languages.CodeActionTriggerType.Invoke ? ExtHostTypes.CodeActionTriggerKind.Invoke : ExtHostTypes.CodeActionTriggerKind.Automatic, "toApi");
})(CodeActionTriggerKind || (CodeActionTriggerKind = {}));
var CodeActionContext;
((CodeActionContext2) => {
  CodeActionContext2.toApi = /* @__PURE__ */ __name((dto, uriTransformer) => ({
    diagnostics: dto.diagnostics.map(
      (diag) => DiagnosticConverter.toApi(diag, uriTransformer)
    ),
    only: dto.only ? CodeActionKind.toApi(dto.only) : void 0,
    triggerKind: dto.trigger ? CodeActionTriggerKind.toApi(dto.trigger) : ExtHostTypes.CodeActionTriggerKind.Invoke
  }), "toApi");
})(CodeActionContext || (CodeActionContext = {}));
var CodeAction;
((CodeAction2) => {
  CodeAction2.fromApi = /* @__PURE__ */ __name((action, commandsConverter, disposables, uriTransformer, versionProvider) => ({
    title: action.title,
    kind: action.kind ? CodeActionKind.fromApi(action.kind) : void 0,
    isPreferred: action.isPreferred,
    disabled: action.disabled?.reason,
    command: action.command ? commandsConverter.ToInternal(action.command, disposables) : void 0,
    diagnostics: action.diagnostics ? DiagnosticConverter.fromApiArray(
      action.diagnostics,
      uriTransformer
    ) : void 0,
    edit: action.edit ? WorkspaceEditConverter.fromApi(
      action.edit,
      versionProvider,
      commandsConverter,
      disposables,
      uriTransformer
    ) : void 0
  }), "fromApi");
  CodeAction2.toApi = /* @__PURE__ */ __name((dto, commandsConverter, uriTransformer) => {
    const action = new ExtHostTypes.CodeAction(
      dto.title,
      dto.kind ? CodeActionKind.toApi(dto.kind) : void 0
    );
    action.command = dto.command ? commandsConverter.FromInternal(dto.command) : void 0;
    action.diagnostics = dto.diagnostics?.map(
      (d) => DiagnosticConverter.toApi(d, uriTransformer)
    );
    action.edit = dto.edit ? WorkspaceEditConverter.toApi(
      dto.edit,
      uriTransformer,
      commandsConverter
    ) : void 0;
    action.isPreferred = dto.isPreferred;
    if (dto.disabled) {
      action.disabled = { reason: dto.disabled };
    }
    return action;
  }, "toApi");
})(CodeAction || (CodeAction = {}));
export {
  CodeAction,
  CodeActionContext,
  CodeActionKind,
  CodeActionTriggerKind
};
//# sourceMappingURL=CodeAction.js.map
