import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { NativeFilesystemMcpDiscovery } from '../common/discovery/nativeMcpDiscoveryAbstract.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
export declare class NativeMcpDiscovery extends NativeFilesystemMcpDiscovery {
    private readonly mainProcess;
    private readonly logService;
    constructor(mainProcess: IMainProcessService, logService: ILogService, labelService: ILabelService, fileService: IFileService, instantiationService: IInstantiationService, mcpRegistry: IMcpRegistry, configurationService: IConfigurationService);
    start(): void;
}
