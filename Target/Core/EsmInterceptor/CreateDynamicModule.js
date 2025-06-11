var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME } from "./Constants.js";
import { DynamicModuleTemplate } from "./DynamicModuleTemplate.js";
const CreateDynamicModule = /* @__PURE__ */ __name((ApiKey, VscodeApiInstance) => {
  const ExportablePropertyNames = Object.keys(VscodeApiInstance);
  const ExportStatements = ExportablePropertyNames.map(
    (PropertyName) => `export const ${PropertyName} = VscodeApiInstance['${PropertyName}'];`
  ).join("\n");
  return DynamicModuleTemplate.replace(
    "__BUILD_TIME_GLOBAL_API_FUNCTION_NAME__",
    // Placeholder in the template
    `'${ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME}'`
  ).replace("__RUNTIME_API_KEY__", ApiKey).replace("__RUNTIME_EXPORT_STATEMENTS__", ExportStatements);
}, "CreateDynamicModule");
export {
  CreateDynamicModule
};
//# sourceMappingURL=CreateDynamicModule.js.map
