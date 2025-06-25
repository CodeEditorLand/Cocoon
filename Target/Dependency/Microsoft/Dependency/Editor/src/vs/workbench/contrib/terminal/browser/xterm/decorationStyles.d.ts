import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITerminalCommand } from '../../../../../platform/terminal/common/capabilities/capabilities.js';
export declare const enum DecorationSelector {
    CommandDecoration = "terminal-command-decoration",
    Hide = "hide",
    ErrorColor = "error",
    DefaultColor = "default-color",
    Default = "default",
    Codicon = "codicon",
    XtermDecoration = "xterm-decoration",
    OverviewRuler = ".xterm-decoration-overview-ruler"
}
export declare function getTerminalDecorationHoverContent(command: ITerminalCommand | undefined, hoverMessage?: string): string;
export declare function updateLayout(configurationService: IConfigurationService, element?: HTMLElement): void;
