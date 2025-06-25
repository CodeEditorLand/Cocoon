/**
 * @module Command
 * @description Implements the CommandConverter. It handles the complex logic
 * of marshalling `vscode.Command` objects, their arguments, and handling command
 * delegation for functions passed as arguments.
 */
import type { IDisposable } from "vs/base/common/lifecycle.js";
import type * as VSCode from "vscode";
/**
 * @interface APICommandArgument
 * @description Represents and validates a single argument for a built-in API command.
 */
export declare class APICommandArgument<V, D> {
    readonly Name: string;
    readonly Description: string;
    readonly Validate: (Value: V) => boolean;
    readonly Convert: (Value: V) => D;
    constructor(Name: string, Description: string, Validate: (Value: V) => boolean, Convert: (Value: V) => D);
}
/**
 * @interface APICommandResult
 * @description Represents and converts the result of a built-in API command.
 */
export declare class APICommandResult<V, R> {
    readonly Name: string;
    readonly Convert: (Value: V) => R;
    constructor(Name: string, Convert: (Value: V) => R);
}
/**
 * @interface APICommand
 * @description A descriptor for a built-in API command, detailing its signature.
 */
export declare class APICommand {
    readonly Id: string;
    readonly InternalId: string;
    readonly Description: string;
    readonly Arguments: readonly APICommandArgument<any, any>[];
    readonly Result: APICommandResult<any, any>;
    constructor(Id: string, InternalId: string, Description: string, Arguments: readonly APICommandArgument<any, any>[], Result: APICommandResult<any, any>);
}
/**
 * @interface InternalCommand
 * @description Represents the serializable DTO for a command sent over IPC.
 */
interface InternalCommand {
    id: string;
    title: string;
    tooltip?: string;
    arguments?: any[];
}
/**
 * @class Command
 * @description The CommandConverter implementation.
 */
export declare class Command {
    private readonly RegisterCommand;
    private readonly ExecuteCommand;
    private readonly LookupAPICommand;
    private readonly DelegatingCommandId;
    private readonly DelegatedCommands;
    constructor(RegisterCommand: (global: boolean, // Changed from 'id' to 'global' to match CommandService
    id: string, handler: (...args: any[]) => any, thisArg?: any) => IDisposable, ExecuteCommand: <T>(command: string, ...rest: any[]) => Promise<T | undefined>, LookupAPICommand: (Id: string) => APICommand | undefined);
    private ExecuteDelegatedCommand;
    ToInternal(Command: VSCode.Command, DisposableArray: IDisposable[]): InternalCommand | undefined;
    FromInternal(CommandDTO: InternalCommand): VSCode.Command | undefined;
}
export {};
