import { IFileService } from '../../../../../platform/files/common/files.js';
import { TestLifecycleService } from '../../../../test/browser/workbenchTestServices.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { NativeWorkingCopyHistoryService } from '../../common/workingCopyHistoryService.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
export declare class TestWorkingCopyHistoryService extends NativeWorkingCopyHistoryService {
    readonly _fileService: IFileService;
    readonly _configurationService: TestConfigurationService;
    readonly _lifecycleService: TestLifecycleService;
    constructor(disposables: DisposableStore, fileService?: IFileService);
}
