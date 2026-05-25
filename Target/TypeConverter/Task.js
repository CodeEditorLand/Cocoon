var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));

// Source/Platform/VSCode/Type.ts
var Type_exports = {};
__export(Type_exports, {
  CancellationToken: () => CancellationToken,
  CancellationTokenSource: () => CancellationTokenSource,
  URI: () => URI
});
__reExport(Type_exports, extHostTypes_star);
import * as extHostTypes_star from "@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js";
import { URI } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js";
import {
  CancellationToken,
  CancellationTokenSource
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js";

// Source/TypeConverter/Task.ts
var FromAPI = /* @__PURE__ */ __name((TaskToConvert, Extension) => {
  const Definition = TaskToConvert.definition;
  const Execution = TaskToConvert.execution;
  const Result = {
    _id: TaskToConvert._id,
    definition: { ...Definition, type: Definition.type },
    name: TaskToConvert.name,
    source: {
      id: Extension.identifier.value,
      label: TaskToConvert.source,
      scope: TaskToConvert.scope
    },
    execution: void 0,
    isBackground: TaskToConvert.isBackground,
    group: TaskToConvert.group?.id,
    presentationOptions: TaskToConvert.presentationOptions,
    problemMatchers: TaskToConvert.problemMatchers,
    hasDefinedMatchers: TaskToConvert.hasDefinedMatchers
  };
  if (Execution) {
    Result.execution = { ...Execution };
  }
  return Result;
}, "FromAPI");
var ToAPI = /* @__PURE__ */ __name((DTO) => {
  const Execution = DTO.execution ? new Type_exports.ProcessExecution(
    DTO.execution.process,
    DTO.execution.args,
    DTO.execution.options
  ) : void 0;
  const ConvertedTask = new Type_exports.Task(
    DTO.definition,
    DTO.source.scope,
    DTO.name,
    DTO.source.label,
    Execution,
    DTO.problemMatchers
  );
  ConvertedTask._id = DTO._id;
  return ConvertedTask;
}, "ToAPI");
var ExecutionToAPI = /* @__PURE__ */ __name((_DTO, TaskToExecute) => {
  return {
    task: TaskToExecute,
    terminate: /* @__PURE__ */ __name(() => {
    }, "terminate")
  };
}, "ExecutionToAPI");
export {
  ExecutionToAPI,
  FromAPI,
  ToAPI
};
//# sourceMappingURL=Task.js.map
