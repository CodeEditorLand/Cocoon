import { Emitter } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IWorkbenchConfigurationService } from '../../../services/configuration/common/configuration.js';
import { SettingsTreeSettingElement } from './settingsTreeModels.js';
type ScopeString = 'workspace' | 'user' | 'remote' | 'default';
export interface ISettingOverrideClickEvent {
    scope: ScopeString;
    language: string;
    settingKey: string;
}
/**
 * Renders the indicators next to a setting, such as "Also Modified In".
 */
export declare class SettingsTreeIndicatorsLabel implements IDisposable {
    private readonly configurationService;
    private readonly hoverService;
    private readonly userDataSyncEnablementService;
    private readonly languageService;
    private readonly commandService;
    private readonly indicatorsContainerElement;
    private readonly previewIndicator;
    private readonly workspaceTrustIndicator;
    private readonly scopeOverridesIndicator;
    private readonly syncIgnoredIndicator;
    private readonly defaultOverrideIndicator;
    /** Indicators that each have their own square container at the top-right of the setting */
    private readonly isolatedIndicators;
    /** Indicators that end up wrapped in a parenthesis at the top-right of the setting */
    private readonly parenthesizedIndicators;
    private readonly keybindingListeners;
    private focusedIndex;
    constructor(container: HTMLElement, configurationService: IWorkbenchConfigurationService, hoverService: IHoverService, userDataSyncEnablementService: IUserDataSyncEnablementService, languageService: ILanguageService, commandService: ICommandService);
    private defaultHoverOptions;
    private addHoverDisposables;
    private createWorkspaceTrustIndicator;
    private createScopeOverridesIndicator;
    private createSyncIgnoredIndicator;
    private createDefaultOverrideIndicator;
    private createPreviewIndicator;
    private render;
    private resetIndicatorNavigationKeyBindings;
    private focusIndicatorAt;
    updateWorkspaceTrust(element: SettingsTreeSettingElement): void;
    updateSyncIgnored(element: SettingsTreeSettingElement, ignoredSettings: string[]): void;
    updatePreviewIndicator(element: SettingsTreeSettingElement): void;
    private getInlineScopeDisplayText;
    dispose(): void;
    updateScopeOverrides(element: SettingsTreeSettingElement, onDidClickOverrideElement: Emitter<ISettingOverrideClickEvent>, onApplyFilter: Emitter<string>): void;
    updateDefaultOverrideIndicator(element: SettingsTreeSettingElement): void;
}
export declare function getIndicatorsLabelAriaLabel(element: SettingsTreeSettingElement, configurationService: IWorkbenchConfigurationService, userDataProfilesService: IUserDataProfilesService, languageService: ILanguageService): string;
export {};
