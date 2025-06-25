/**
 * @module ProcessUserData
 * @description This module defines the complete, self-contained workflow for
 * the 'ProcessUserData' command. It orchestrates getting text from the active
 * editor, sending it to a backend service for processing, and then displaying
 * the result to the user, with declarative, type-safe error handling.
 */
import { Effect } from "effect";
declare const ActiveEditorNotFoundProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ActiveEditorNotFoundProblem";
} & Readonly<A>;
/**
 * @class ActiveEditorNotFoundProblem
 * @description An error indicating that no text editor is currently active.
 */
export declare class ActiveEditorNotFoundProblem extends ActiveEditorNotFoundProblem_base<{}> {
    readonly message: string;
    constructor();
}
declare const ProcessingServiceProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ProcessingServiceProblem";
} & Readonly<A>;
/**
 * @class ProcessingServiceProblem
 * @description An error indicating a failure to communicate with the backend processing service.
 */
export declare class ProcessingServiceProblem extends ProcessingServiceProblem_base<{
    readonly Cause: unknown;
}> {
    readonly message: string;
    constructor(Properties: {
        readonly Cause: unknown;
    });
}
/**
 * @description An `Effect` that encapsulates the entire workflow for processing user data.
 */
export declare const ProcessUserData: Effect.Effect<unknown, unknown, unknown>;
export {};
