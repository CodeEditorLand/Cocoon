import { Dimension } from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorGroup } from '../../../services/editor/common/editorGroupsService.js';
import { ProcessExplorerControl } from './processExplorerControl.js';
export declare class ProcessExplorerEditor extends EditorPane {
    protected readonly instantiationService: IInstantiationService;
    static readonly ID: string;
    protected processExplorerControl: ProcessExplorerControl | undefined;
    constructor(group: IEditorGroup, telemetryService: ITelemetryService, themeService: IThemeService, storageService: IStorageService, instantiationService: IInstantiationService);
    protected createEditor(parent: HTMLElement): void;
    focus(): void;
    layout(dimension: Dimension): void;
}
