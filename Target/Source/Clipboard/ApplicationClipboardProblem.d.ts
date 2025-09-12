/**
 * @module ApplicationClipboardProblem
 * @description Defines a domain-specific, tagged error for clipboard operations
 * within the application service layer.
 */
import type { IntegrationClipboardProblem } from "../Integration/Tauri/Clipboard/Problem.js";
declare const ApplicationClipboardProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ApplicationClipboardProblem";
} & Readonly<A>;
/**
 * @class ApplicationClipboardProblem
 * @description Represents a failure within the Clipboard application service.
 * It wraps a more specific problem from the Integration layer to provide
 * context while allowing for domain-specific error handling.
 */
export declare class ApplicationClipboardProblem extends ApplicationClipboardProblem_base<{
    /** The underlying problem from the Integration layer that caused this failure. */
    readonly Cause: IntegrationClipboardProblem;
}> {
}
export {};
//# sourceMappingURL=ApplicationClipboardProblem.d.ts.map