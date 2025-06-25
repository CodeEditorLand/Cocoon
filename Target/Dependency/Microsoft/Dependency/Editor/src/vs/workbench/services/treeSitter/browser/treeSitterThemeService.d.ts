import { IObservable, IReader } from '../../../../base/common/observable.js';
import { ITreeSitterThemeService } from '../../../../editor/common/services/treeSitter/treeSitterThemeService.js';
import { IWorkbenchThemeService } from '../../themes/common/workbenchThemeService.js';
export declare class TreeSitterThemeService implements ITreeSitterThemeService {
    private readonly _themeService;
    _serviceBrand: undefined;
    readonly onChange: IObservable<void>;
    private readonly _colorTheme;
    constructor(_themeService: IWorkbenchThemeService);
    findMetadata(captureNames: string[], languageId: number, bracket: boolean, reader: IReader | undefined): number;
}
