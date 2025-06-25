import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatRequestVariableEntry } from '../../common/chatVariableEntries.js';
import { IChatContentReference } from '../../common/chatService.js';
export declare class ChatAttachmentsContentPart extends Disposable {
    private readonly variables;
    private readonly contentReferences;
    readonly domNode: HTMLElement | undefined;
    private readonly instantiationService;
    private readonly attachedContextDisposables;
    private readonly _onDidChangeVisibility;
    private readonly _contextResourceLabels;
    contextMenuHandler?: (attachment: IChatRequestVariableEntry, event: MouseEvent) => void;
    constructor(variables: IChatRequestVariableEntry[], contentReferences: ReadonlyArray<IChatContentReference> | undefined, domNode: HTMLElement | undefined, instantiationService: IInstantiationService);
    private initAttachedContext;
}
