import { IProcessEnvironment } from '../../../base/common/platform.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IShellLaunchConfig, ITerminalEnvironment, ITerminalProcessOptions, ShellIntegrationInjectionFailureReason } from '../common/terminal.js';
export declare function getWindowsBuildNumber(): number;
export interface IShellIntegrationConfigInjection {
    readonly type: 'injection';
    /**
     * A new set of arguments to use.
     */
    readonly newArgs: string[] | undefined;
    /**
     * An optional environment to mixing to the real environment.
     */
    readonly envMixin?: IProcessEnvironment;
    /**
     * An optional array of files to copy from `source` to `dest`.
     */
    readonly filesToCopy?: {
        source: string;
        dest: string;
    }[];
}
export interface IShellIntegrationInjectionFailure {
    readonly type: 'failure';
    readonly reason: ShellIntegrationInjectionFailureReason;
}
/**
 * For a given shell launch config, returns arguments to replace and an optional environment to
 * mixin to the SLC's environment to enable shell integration. This must be run within the context
 * that creates the process to ensure accuracy. Returns undefined if shell integration cannot be
 * enabled.
 */
export declare function getShellIntegrationInjection(shellLaunchConfig: IShellLaunchConfig, options: ITerminalProcessOptions, env: ITerminalEnvironment | undefined, logService: ILogService, productService: IProductService, skipStickyBit?: boolean): Promise<IShellIntegrationConfigInjection | IShellIntegrationInjectionFailure>;
