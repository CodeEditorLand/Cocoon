/**
 * @module Codegen
 * @description
 * Public surface of the Cocoon codegen pipeline. Walks the same
 * VS Code source tree Wind walks but narrows to the extension-
 * host subtree (`vs/workbench/api/...`) and emits Cocoon-side
 * `IExtHost*Upstream` schemas grounded in real upstream source.
 *
 * Reuses every Wind extractor and resolver verbatim. Only the
 * file-name predicate (`IsExtHostFile`) and the emit destination
 * differ.
 * @category Public
 */

export { RunExtHostCodegen } from "./RunExtHostCodegen.js";
export type {
	RunExtHostCodegenOptions,
	RunExtHostCodegenSummary,
} from "./RunExtHostCodegen.js";

export { IterateExtHostDecorators } from "./Extract/IterateExtHostDecorators.js";
export { IsExtHostFile } from "./Extract/IsExtHostFile.js";

export { EmitExtHostSchema } from "./Emit/EmitExtHostSchema.js";
export type {
	EmitExtHostSchemaOptions,
	EmitExtHostSchemaOutcome,
} from "./Emit/EmitExtHostSchema.js";

export type { ExtHostDecoratorRecord } from "./Type/ExtHostDecoratorRecord.js";
