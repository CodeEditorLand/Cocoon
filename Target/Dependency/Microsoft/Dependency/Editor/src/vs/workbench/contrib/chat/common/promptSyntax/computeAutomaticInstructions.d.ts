import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ChatRequestVariableSet, IPromptFileVariableEntry } from '../chatVariableEntries.js';
import { IPromptPath, IPromptsService } from './service/promptsService.js';
export declare class ComputeAutomaticInstructions {
    private readonly _promptsService;
    readonly _logService: ILogService;
    private readonly _labelService;
    private readonly _configurationService;
    private readonly _workspaceService;
    private readonly _fileService;
    private _parseResults;
    private _autoAddedInstructions;
    constructor(_promptsService: IPromptsService, _logService: ILogService, _labelService: ILabelService, _configurationService: IConfigurationService, _workspaceService: IWorkspaceContextService, _fileService: IFileService);
    get autoAddedInstructions(): readonly IPromptFileVariableEntry[];
    private _parsePromptFile;
    collect(variables: ChatRequestVariableSet, addInstructionsSummary: boolean, token: CancellationToken): Promise<void>;
    /** public for testing */
    findInstructionFilesFor(instructionFiles: readonly IPromptPath[], context: {
        files: ResourceSet;
        instructions: ResourceSet;
    }, token: CancellationToken): Promise<IPromptFileVariableEntry[]>;
    private _getContext;
    private _getCopilotInstructions;
    private _matches;
    private _getInstructionsWithPatternsList;
    private _getCopilotTextInstructions;
    private _addReferencedInstructions;
}
