import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { URI } from '../../../../../base/common/uri.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { IChatWidgetService } from '../chat.js';
export declare class ChatRelatedFilesContribution extends Disposable implements IWorkbenchContribution {
    private readonly chatEditingService;
    private readonly chatWidgetService;
    static readonly ID = "chat.relatedFilesWorkingSet";
    private readonly chatEditingSessionDisposables;
    private _currentRelatedFilesRetrievalOperation;
    constructor(chatEditingService: IChatEditingService, chatWidgetService: IChatWidgetService);
    private _updateRelatedFileSuggestions;
    private _handleNewEditingSession;
    dispose(): void;
}
export interface IChatRelatedFile {
    uri: URI;
    description: string;
}
export declare class ChatRelatedFiles extends Disposable {
    private readonly _onDidChange;
    readonly onDidChange: Event<void>;
    private _removedFiles;
    get removedFiles(): ResourceSet;
    private _value;
    get value(): IChatRelatedFile[];
    set value(value: IChatRelatedFile[]);
    remove(uri: URI): void;
    clearRemovedFiles(): void;
    clear(): void;
}
