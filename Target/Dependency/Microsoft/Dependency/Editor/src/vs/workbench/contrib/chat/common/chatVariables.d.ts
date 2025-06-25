import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { IRange } from '../../../../editor/common/core/range.js';
import { Location } from '../../../../editor/common/languages.js';
import { IChatModel } from './chatModel.js';
import { IChatContentReference, IChatProgressMessage } from './chatService.js';
import { IDiagnosticVariableEntryFilterData } from './chatVariableEntries.js';
import { IToolData, ToolSet } from './languageModelToolsService.js';
export interface IChatVariableData {
    id: string;
    name: string;
    icon?: ThemeIcon;
    fullName?: string;
    description: string;
    modelDescription?: string;
    canTakeArgument?: boolean;
}
export interface IChatRequestProblemsVariable {
    id: 'vscode.problems';
    filter: IDiagnosticVariableEntryFilterData;
}
export declare const isIChatRequestProblemsVariable: (obj: unknown) => obj is IChatRequestProblemsVariable;
export type IChatRequestVariableValue = string | URI | Location | Uint8Array | IChatRequestProblemsVariable | unknown;
export type IChatVariableResolverProgress = IChatContentReference | IChatProgressMessage;
export interface IChatVariableResolver {
    (messageText: string, arg: string | undefined, model: IChatModel, progress: (part: IChatVariableResolverProgress) => void, token: CancellationToken): Promise<IChatRequestVariableValue | undefined>;
}
export declare const IChatVariablesService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IChatVariablesService>;
export interface IChatVariablesService {
    _serviceBrand: undefined;
    getDynamicVariables(sessionId: string): ReadonlyArray<IDynamicVariable>;
    getSelectedTools(sessionId: string): ReadonlyArray<IToolData>;
    getSelectedToolSets(sessionId: string): ReadonlyArray<ToolSet>;
}
export interface IDynamicVariable {
    range: IRange;
    id: string;
    fullName?: string;
    icon?: ThemeIcon;
    modelDescription?: string;
    isFile?: boolean;
    isDirectory?: boolean;
    data: IChatRequestVariableValue;
}
