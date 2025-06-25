import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IColorTheme, IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IIssueFormService, IssueReporterData, IssueReporterStyles, IWorkbenchIssueService } from '../common/issue.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IIntegrityService } from '../../../services/integrity/common/integrity.js';
export declare class NativeIssueService implements IWorkbenchIssueService {
    private readonly issueFormService;
    private readonly themeService;
    private readonly extensionManagementService;
    private readonly extensionEnablementService;
    private readonly workspaceTrustManagementService;
    private readonly experimentService;
    private readonly authenticationService;
    private readonly integrityService;
    readonly _serviceBrand: undefined;
    constructor(issueFormService: IIssueFormService, themeService: IThemeService, extensionManagementService: IExtensionManagementService, extensionEnablementService: IWorkbenchExtensionEnablementService, workspaceTrustManagementService: IWorkspaceTrustManagementService, experimentService: IWorkbenchAssignmentService, authenticationService: IAuthenticationService, integrityService: IIntegrityService);
    openReporter(dataOverrides?: Partial<IssueReporterData>): Promise<void>;
}
export declare function getIssueReporterStyles(theme: IColorTheme): IssueReporterStyles;
