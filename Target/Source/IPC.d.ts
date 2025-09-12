/**
 * @module IPC
 * @description Defines the high-level service for Inter-Process Communication (IPC)
 * between Cocoon and Mountain. It orchestrates gRPC client/server connections,
 * RPC protocol adaptation, and request/notification dispatching.
 */
import type { IMessagePassingProtocol } from "@codeeditorland/output/vs/base/parts/ipc/common/ipc.js";
import { Effect } from "effect";
import type { Disposable } from "vscode";
import { CancellationService } from "./Cancellation.js";
import { gRPCConnectionError } from "./IPC/gRPCConnectionError.js";
import { IPCProblem } from "./IPC/IPCProblem.js";
import { IPCConfigurationService } from "./IPCConfiguration.js";
/**
 * @interface IPC
 * @description The contract for the IPC service.
 */
export interface IPC {
    readonly SendRequest: <ResponseType = unknown>(Method: string, Parameters: readonly unknown[]) => Effect.Effect<ResponseType, IPCProblem>;
    readonly SendNotification: (Method: string, Parameters: readonly unknown[]) => Effect.Effect<void, IPCProblem>;
    readonly SendCancel: (TokenId: number) => Effect.Effect<void, never>;
    readonly CreateProtocolAdapter: () => IMessagePassingProtocol & {
        ProcessIncomingData: (Data: Uint8Array) => Effect.Effect<void, never>;
    };
    readonly CreateProxy: <T extends object>(Channel: string) => T;
    readonly RegisterInvokeHandler: (Channel: string, Handler: (...args: any[]) => Promise<any>) => Disposable;
}
declare const IPCService_base: Effect.Service.Class<IPCService, "Service/IPC", {
    readonly scoped: Effect.Effect<IPC, gRPCConnectionError, CancellationService | import("effect/Scope").Scope | IPCConfigurationService>;
}>;
/**
 * @class IPCService
 * @description The `Effect.Service` for IPC. It is a scoped service because it
 * manages the lifecycle of a gRPC client, ensuring it is gracefully acquired and released.
 */
export declare class IPCService extends IPCService_base {
}
export {};
//# sourceMappingURL=IPC.d.ts.map