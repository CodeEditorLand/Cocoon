import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IWorkbenchContribution } from '../../../../../common/contributions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
/**
 * Contribution that migrates the old config setting value to a new one.
 *
 * Note! This is a temporary logic and can be removed on ~2026-04-29.
 */
export declare class ConfigMigration implements IWorkbenchContribution {
    private readonly logService;
    private readonly configService;
    constructor(logService: ILogService, configService: IConfigurationService);
    /**
     * The main function that implements the migration logic.
     */
    private migrateConfig;
}
