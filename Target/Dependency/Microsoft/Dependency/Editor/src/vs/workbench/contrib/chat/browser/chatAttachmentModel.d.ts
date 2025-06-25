import { URI } from '../../../../base/common/uri.js';
import { IRange } from '../../../../editor/common/core/range.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IChatRequestFileEntry, IChatRequestVariableEntry } from '../common/chatVariableEntries.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { IChatAttachmentResolveService } from './chatAttachmentResolveService.js';
export interface IChatAttachmentChangeEvent {
    readonly deleted: readonly string[];
    readonly added: readonly IChatRequestVariableEntry[];
    readonly updated: readonly IChatRequestVariableEntry[];
}
export declare class ChatAttachmentModel extends Disposable {
    private readonly fileService;
    private readonly webContentExtractorService;
    private readonly chatAttachmentResolveService;
    private readonly _attachments;
    private _onDidChange;
    readonly onDidChange: import("../../../workbench.web.main.internal.js").Event<IChatAttachmentChangeEvent>;
    constructor(fileService: IFileService, webContentExtractorService: ISharedWebContentExtractorService, chatAttachmentResolveService: IChatAttachmentResolveService);
    get attachments(): ReadonlyArray<IChatRequestVariableEntry>;
    get size(): number;
    get fileAttachments(): URI[];
    getAttachmentIDs(): Set<string>;
    addFile(uri: URI, range?: IRange): Promise<void>;
    addFolder(uri: URI): void;
    clear(clearStickyAttachments?: boolean): void;
    addContext(...attachments: IChatRequestVariableEntry[]): void;
    clearAndSetContext(...attachments: IChatRequestVariableEntry[]): void;
    delete(...variableEntryIds: string[]): void;
    updateContext(toDelete: Iterable<string>, upsert: Iterable<IChatRequestVariableEntry>): void;
    asFileVariableEntry(uri: URI, range?: IRange): IChatRequestFileEntry;
    asImageVariableEntry(uri: URI): Promise<IChatRequestVariableEntry | undefined>;
}
