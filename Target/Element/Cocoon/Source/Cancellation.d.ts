/**
 * @module Cancellation
 * @description Defines the service for managing cancellation tokens for long-running
 * or remote operations. This service allows for the creation, reuse, and disposal
 * of cancellation sources, which is crucial for preventing resource leaks and
 * unnecessary work in asynchronous workflows.
 */
import { Effect, type Scope } from "effect";
import type { CancellationToken } from "vscode";
import { InvalidTokenIdProblem } from "./Cancellation/InvalidTokenIdProblem.js";
/**
 * @interface Cancellation
 * @description The contract for the Cancellation service.
 */
export interface Cancellation {
    readonly ObtainToken: (TokenId: number) => Effect.Effect<CancellationToken, InvalidTokenIdProblem, Scope.Scope>;
    readonly CancelToken: (TokenId: number) => Effect.Effect<void, never>;
    readonly DisposeAll: () => Effect.Effect<void, never>;
}
declare const CancellationService_base: Effect.Service.Class<CancellationService, "Service/Cancellation", {
    readonly scoped: Effect.Effect<{
        ObtainToken: (TokenId: number) => Effect.Effect<import("vs/base/common/cancellation.js").CancellationToken, InvalidTokenIdProblem, Scope.Scope>;
        CancelToken: (TokenId: number) => Effect.Effect<void, never, never>;
        DisposeAll: () => Effect.Effect<void, never, never>;
    }, never, Scope.Scope>;
}>;
/**
 * @class Cancellation
 * @description The `Effect.Service` for managing cancellation tokens.
 * This service is scoped because it manages resources (`CancellationTokenSource`
 * instances) that must be cleaned up gracefully upon application shutdown.
 */
export declare class CancellationService extends CancellationService_base {
}
export {};
