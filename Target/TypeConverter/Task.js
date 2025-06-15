var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { ProcessExecution, Task } from "../Type/ExtHostTypes.js";
const FromAPI = /* @__PURE__ */ __name((TaskToConvert, Extension) => {
  const Definition = TaskToConvert.definition;
  const Execution2 = TaskToConvert.execution;
  const Result = {
    _id: TaskToConvert._id,
    definition: {
      type: Definition.type,
      ...Definition
    },
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
  if (Execution2) {
    Result.execution = {
      ...Execution2
    };
  }
  return Result;
}, "FromAPI");
const ToAPI = /* @__PURE__ */ __name((DTO) => {
  const Execution2 = DTO.execution ? new ProcessExecution(
    DTO.execution.process,
    DTO.execution.args,
    DTO.execution.options
  ) : void 0;
  const ConvertedTask = new Task(
    DTO.definition,
    DTO.source.scope,
    DTO.source.label,
    DTO.source.id,
    Execution2,
    DTO.problemMatchers
  );
  ConvertedTask._id = DTO._id;
  return ConvertedTask;
}, "ToAPI");
const Execution = {
  ToAPI: /* @__PURE__ */ __name((_DTO, TaskToExecute) => {
    return {
      task: TaskToExecute,
      terminate: /* @__PURE__ */ __name(() => {
      }, "terminate")
    };
  }, "ToAPI")
};
var Task_default = { FromAPI, ToAPI, Execution };
export {
  Task_default as default
};
//# sourceMappingURL=Task.js.map
