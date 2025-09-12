var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  Task as ExtHostTask,
  ProcessExecution
} from "../Platform/VSCode/Type.js";
const FromAPI = /* @__PURE__ */ __name((TaskToConvert, Extension) => {
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
const ToAPI = /* @__PURE__ */ __name((DTO) => {
  const Execution = DTO.execution ? new ProcessExecution(
    DTO.execution.process,
    DTO.execution.args,
    DTO.execution.options
  ) : void 0;
  const ConvertedTask = new ExtHostTask(
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
const ExecutionToAPI = /* @__PURE__ */ __name((_DTO, TaskToExecute) => {
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
