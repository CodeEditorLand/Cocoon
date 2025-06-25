import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { TextEdit } from '../../../../editor/common/languages.js';
import { ICellEditOperation } from '../../notebook/common/notebookCommon.js';
export interface ICodeMapperResponse {
    textEdit: (resource: URI, textEdit: TextEdit[]) => void;
    notebookEdit: (resource: URI, edit: ICellEditOperation[]) => void;
}
export interface ICodeMapperCodeBlock {
    readonly code: string;
    readonly resource: URI;
    readonly markdownBeforeBlock?: string;
}
export interface ICodeMapperRequest {
    readonly codeBlocks: ICodeMapperCodeBlock[];
    readonly chatRequestId?: string;
    readonly chatRequestModel?: string;
    readonly chatSessionId?: string;
    readonly location?: string;
}
export interface ICodeMapperResult {
    readonly errorMessage?: string;
}
export interface ICodeMapperProvider {
    readonly displayName: string;
    mapCode(request: ICodeMapperRequest, response: ICodeMapperResponse, token: CancellationToken): Promise<ICodeMapperResult | undefined>;
}
export declare const ICodeMapperService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<ICodeMapperService>;
export interface ICodeMapperService {
    readonly _serviceBrand: undefined;
    readonly providers: ICodeMapperProvider[];
    registerCodeMapperProvider(handle: number, provider: ICodeMapperProvider): IDisposable;
    mapCode(request: ICodeMapperRequest, response: ICodeMapperResponse, token: CancellationToken): Promise<ICodeMapperResult | undefined>;
}
export declare class CodeMapperService implements ICodeMapperService {
    _serviceBrand: undefined;
    readonly providers: ICodeMapperProvider[];
    registerCodeMapperProvider(handle: number, provider: ICodeMapperProvider): IDisposable;
    mapCode(request: ICodeMapperRequest, response: ICodeMapperResponse, token: CancellationToken): Promise<ICodeMapperResult | undefined>;
}
