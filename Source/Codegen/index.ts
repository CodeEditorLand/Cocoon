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

export { RunExtHostCodegen } from "./Run/Ext/Host/Codegen.js";

export type {
	RunExtHostCodegenOptions,
	RunExtHostCodegenSummary,
} from "./Run/Ext/Host/Codegen.js";

export { IterateExtHostDecorators } from "./Extract/Iterate/Ext/Host/Decorators.js";

export { IsExtHostFile } from "./Extract/Is/Ext/Host/File.js";

export { EmitExtHostSchema } from "./Emit/Emit/Ext/Host/Schema.js";

export type {
	EmitExtHostSchemaOptions,
	EmitExtHostSchemaOutcome,
} from "./Emit/Emit/Ext/Host/Schema.js";

export type { ExtHostDecoratorRecord } from "./Type/Ext/Host/Decorator/Record.js";
