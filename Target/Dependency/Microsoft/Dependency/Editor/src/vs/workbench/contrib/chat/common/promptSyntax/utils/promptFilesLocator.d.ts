import { URI } from '../../../../../../base/common/uri.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { PromptsType } from '../promptTypes.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
import { ISearchService } from '../../../../../services/search/common/search.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { TPromptsStorage } from '../service/promptsService.js';
import { IUserDataProfileService } from '../../../../../services/userDataProfile/common/userDataProfile.js';
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
/**
 * Utility class to locate prompt files.
 */
export declare class PromptFilesLocator extends Disposable {
    private readonly fileService;
    private readonly configService;
    private readonly workspaceService;
    private readonly environmentService;
    private readonly searchService;
    private readonly userDataService;
    private readonly logService;
    constructor(fileService: IFileService, configService: IConfigurationService, workspaceService: IWorkspaceContextService, environmentService: IWorkbenchEnvironmentService, searchService: ISearchService, userDataService: IUserDataProfileService, logService: ILogService);
    /**
     * List all prompt files from the filesystem.
     *
     * @returns List of prompt files found in the workspace.
     */
    listFiles(type: PromptsType, storage: TPromptsStorage, token: CancellationToken): Promise<readonly URI[]>;
    private listFilesInUserData;
    getCopilotInstructionsFiles(instructionFilePaths: Iterable<string>): Promise<URI[]>;
    createFilesUpdatedEvent(type: PromptsType): {
        readonly event: Event<void>;
        dispose: () => void;
    };
    /**
     * Get all possible unambiguous prompt file source folders based on
     * the current workspace folder structure.
     *
     * This method is currently primarily used by the `> Create Prompt`
     * command that providers users with the list of destination folders
     * for a newly created prompt file. Because such a list cannot contain
     * paths that include `glob pattern` in them, we need to process config
     * values and try to create a list of clear and unambiguous locations.
     *
     * @returns List of possible unambiguous prompt file folders.
     */
    getConfigBasedSourceFolders(type: PromptsType): readonly URI[];
    /**
     * Finds all existent prompt files in the configured local source folders.
     *
     * @returns List of prompt files found in the local source folders.
     */
    private listFilesInLocal;
    private getLocalParentFolders;
    /**
     * Converts locations defined in `settings` to absolute filesystem path URIs.
     * This conversion is needed because locations in settings can be relative,
     * hence we need to resolve them based on the current workspace folders.
     */
    private toAbsoluteLocations;
    /**
     * Uses the file service to resolve the provided location and return either the file at the location of files in the directory.
     */
    private resolveFilesAtLocation;
    /**
     * Uses the search service to find all files at the provided location
     */
    private searchFilesInLocation;
}
/**
 * Checks if the provided `pattern` could be a valid glob pattern.
 */
export declare function isValidGlob(pattern: string): boolean;
