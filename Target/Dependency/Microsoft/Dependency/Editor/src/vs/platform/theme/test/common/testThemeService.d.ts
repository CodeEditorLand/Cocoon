import { Color } from '../../../../base/common/color.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IconContribution } from '../../common/iconRegistry.js';
import { ColorScheme } from '../../common/theme.js';
import { IColorTheme, IFileIconTheme, IProductIconTheme, IThemeService, ITokenStyle } from '../../common/themeService.js';
export declare class TestColorTheme implements IColorTheme {
    private colors;
    type: ColorScheme;
    readonly semanticHighlighting: boolean;
    readonly label = "test";
    constructor(colors?: {
        [id: string]: string | undefined;
    }, type?: ColorScheme, semanticHighlighting?: boolean);
    getColor(color: string, useDefault?: boolean): Color | undefined;
    defines(color: string): boolean;
    getTokenStyleMetadata(type: string, modifiers: string[], modelLanguage: string): ITokenStyle | undefined;
    get tokenColorMap(): string[];
}
declare class TestFileIconTheme implements IFileIconTheme {
    hasFileIcons: boolean;
    hasFolderIcons: boolean;
    hidesExplorerArrows: boolean;
}
declare class UnthemedProductIconTheme implements IProductIconTheme {
    getIcon(contribution: IconContribution): undefined;
}
export declare class TestThemeService implements IThemeService {
    readonly _serviceBrand: undefined;
    _colorTheme: IColorTheme;
    _fileIconTheme: IFileIconTheme;
    _productIconTheme: IProductIconTheme;
    _onThemeChange: Emitter<IColorTheme>;
    _onFileIconThemeChange: Emitter<IFileIconTheme>;
    _onProductIconThemeChange: Emitter<IProductIconTheme>;
    constructor(theme?: TestColorTheme, fileIconTheme?: TestFileIconTheme, productIconTheme?: UnthemedProductIconTheme);
    getColorTheme(): IColorTheme;
    setTheme(theme: IColorTheme): void;
    fireThemeChange(): void;
    get onDidColorThemeChange(): Event<IColorTheme>;
    getFileIconTheme(): IFileIconTheme;
    get onDidFileIconThemeChange(): Event<IFileIconTheme>;
    getProductIconTheme(): IProductIconTheme;
    get onDidProductIconThemeChange(): Event<IProductIconTheme>;
}
export {};
