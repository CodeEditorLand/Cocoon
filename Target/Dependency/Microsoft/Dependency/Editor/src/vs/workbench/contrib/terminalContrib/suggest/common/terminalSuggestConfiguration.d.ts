import type { IStringDictionary } from '../../../../../base/common/collections.js';
import type { IConfigurationPropertySchema } from '../../../../../platform/configuration/common/configurationRegistry.js';
export declare const enum TerminalSuggestSettingId {
    Enabled = "terminal.integrated.suggest.enabled",
    QuickSuggestions = "terminal.integrated.suggest.quickSuggestions",
    SuggestOnTriggerCharacters = "terminal.integrated.suggest.suggestOnTriggerCharacters",
    RunOnEnter = "terminal.integrated.suggest.runOnEnter",
    WindowsExecutableExtensions = "terminal.integrated.suggest.windowsExecutableExtensions",
    Providers = "terminal.integrated.suggest.providers",
    ShowStatusBar = "terminal.integrated.suggest.showStatusBar",
    CdPath = "terminal.integrated.suggest.cdPath",
    InlineSuggestion = "terminal.integrated.suggest.inlineSuggestion",
    UpArrowNavigatesHistory = "terminal.integrated.suggest.upArrowNavigatesHistory",
    SelectionMode = "terminal.integrated.suggest.selectionMode"
}
export declare const windowsDefaultExecutableExtensions: string[];
export declare const terminalSuggestConfigSection = "terminal.integrated.suggest";
export interface ITerminalSuggestConfiguration {
    enabled: boolean;
    quickSuggestions: {
        commands: 'off' | 'on';
        arguments: 'off' | 'on';
        unknown: 'off' | 'on';
    };
    suggestOnTriggerCharacters: boolean;
    runOnEnter: 'never' | 'exactMatch' | 'exactMatchIgnoreExtension' | 'always';
    windowsExecutableExtensions: {
        [key: string]: boolean;
    };
    providers: {
        'terminal-suggest': boolean;
        'pwsh-shell-integration': boolean;
    };
    showStatusBar: boolean;
    cdPath: 'off' | 'relative' | 'absolute';
    inlineSuggestion: 'off' | 'alwaysOnTopExceptExactMatch' | 'alwaysOnTop';
}
export declare const terminalSuggestConfiguration: IStringDictionary<IConfigurationPropertySchema>;
