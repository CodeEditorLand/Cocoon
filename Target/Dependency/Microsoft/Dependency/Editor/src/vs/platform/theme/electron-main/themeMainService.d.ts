import { Event } from '../../../base/common/event.js';
import { IPartsSplash } from '../common/themeService.js';
import { IColorScheme } from '../../window/common/window.js';
import { ISingleFolderWorkspaceIdentifier, IWorkspaceIdentifier } from '../../workspace/common/workspace.js';
export declare const IThemeMainService: import("../../instantiation/common/instantiation.js").ServiceIdentifier<IThemeMainService>;
export interface IThemeMainService {
    readonly _serviceBrand: undefined;
    readonly onDidChangeColorScheme: Event<IColorScheme>;
    getBackgroundColor(): string;
    saveWindowSplash(windowId: number | undefined, workspace: IWorkspaceIdentifier | ISingleFolderWorkspaceIdentifier | undefined, splash: IPartsSplash): void;
    getWindowSplash(workspace: IWorkspaceIdentifier | ISingleFolderWorkspaceIdentifier | undefined): IPartsSplash | undefined;
    getColorScheme(): IColorScheme;
}
