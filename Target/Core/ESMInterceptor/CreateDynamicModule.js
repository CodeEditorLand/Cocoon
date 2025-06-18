var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME } from "./Constants.js";
import { DynamicModuleTemplate } from "./DynamicModuleTemplate.js";
const CreateDynamicModule = /* @__PURE__ */ __name((APIKey, VSCodeAPI) => {
  const ExportablePropertyNames = Object.keys(VSCodeAPI);
  const ExportStatements = ExportablePropertyNames.map(
    (PropertyName) => `export const ${PropertyName} = VSCodeAPI['${PropertyName}'];`
  ).join("\n");
  return DynamicModuleTemplate.replace(
    "__BUILD_TIME_GLOBAL_API_FUNCTION_NAME__",
    // Placeholder in the template
    `'${ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME}'`
  ).replace("__RUNTIME_API_KEY__", `'${APIKey}'`).replace("__RUNTIME_EXPORT_STATEMENTS__", ExportStatements);
}, "CreateDynamicModule");
var CreateDynamicModule_default = CreateDynamicModule;
export {
  CreateDynamicModule_default as default
};
//# sourceMappingURL=CreateDynamicModule.js.map
