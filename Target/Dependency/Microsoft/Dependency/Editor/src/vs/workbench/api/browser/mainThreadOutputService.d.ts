import { IOutputService, OutputChannelUpdateMode } from '../../services/output/common/output.js';
import { MainThreadOutputServiceShape } from '../common/extHost.protocol.js';
import { IExtHostContext } from '../../services/extensions/common/extHostCustomers.js';
import { UriComponents } from '../../../base/common/uri.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IStatusbarService } from '../../services/statusbar/browser/statusbar.js';
export declare class MainThreadOutputService extends Disposable implements MainThreadOutputServiceShape {
    private static _extensionIdPool;
    private readonly _proxy;
    private readonly _outputService;
    private readonly _viewsService;
    private readonly _configurationService;
    private readonly _statusbarService;
    private readonly _outputStatusItem;
    constructor(extHostContext: IExtHostContext, outputService: IOutputService, viewsService: IViewsService, configurationService: IConfigurationService, statusbarService: IStatusbarService);
    $register(label: string, file: UriComponents, languageId: string | undefined, extensionId: string): Promise<string>;
    $update(channelId: string, mode: OutputChannelUpdateMode, till?: number): Promise<void>;
    $reveal(channelId: string, preserveFocus: boolean): Promise<void>;
    private _showChannelQuietly;
    $close(channelId: string): Promise<void>;
    $dispose(channelId: string): Promise<void>;
    private _getChannel;
}
