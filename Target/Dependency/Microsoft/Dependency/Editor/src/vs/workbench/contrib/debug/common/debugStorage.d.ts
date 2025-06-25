import { Disposable } from '../../../../base/common/lifecycle.js';
import { ISettableObservable } from '../../../../base/common/observable.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IDebugModel, IEvaluate, IExpression } from './debug.js';
import { Breakpoint, DataBreakpoint, ExceptionBreakpoint, Expression, FunctionBreakpoint } from './debugModel.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
export interface IChosenEnvironment {
    type: string;
    dynamicLabel?: string;
}
export declare class DebugStorage extends Disposable {
    private readonly storageService;
    private readonly textFileService;
    private readonly uriIdentityService;
    private readonly logService;
    readonly breakpoints: ISettableObservable<Breakpoint[]>;
    readonly functionBreakpoints: ISettableObservable<FunctionBreakpoint[]>;
    readonly exceptionBreakpoints: ISettableObservable<ExceptionBreakpoint[]>;
    readonly dataBreakpoints: ISettableObservable<DataBreakpoint[]>;
    readonly watchExpressions: ISettableObservable<Expression[]>;
    constructor(storageService: IStorageService, textFileService: ITextFileService, uriIdentityService: IUriIdentityService, logService: ILogService);
    loadDebugUxState(): 'simple' | 'default';
    storeDebugUxState(value: 'simple' | 'default'): void;
    private loadBreakpoints;
    private loadFunctionBreakpoints;
    private loadExceptionBreakpoints;
    private loadDataBreakpoints;
    private loadWatchExpressions;
    loadChosenEnvironments(): Record<string, IChosenEnvironment>;
    storeChosenEnvironments(environments: Record<string, IChosenEnvironment>): void;
    storeWatchExpressions(watchExpressions: (IExpression & IEvaluate)[]): void;
    storeBreakpoints(debugModel: IDebugModel): void;
}
