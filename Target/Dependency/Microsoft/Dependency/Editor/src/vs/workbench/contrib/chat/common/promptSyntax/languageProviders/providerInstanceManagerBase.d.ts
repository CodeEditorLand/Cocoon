import { ProviderInstanceBase } from './providerInstanceBase.js';
import { ITextModel } from '../../../../../../editor/common/model.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IEditor } from '../../../../../../editor/common/editorCommon.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
/**
 * Type for a text editor that is used for reusable prompt files.
 */
export interface IPromptFileEditor extends IEditor {
    readonly getModel: () => ITextModel;
}
/**
 * Type for a class that can create a new provider instance.
 */
export type TProviderClass<TInstance extends ProviderInstanceBase> = new (editor: ITextModel, ...args: any[]) => TInstance;
/**
 * A generic base class that manages creation and disposal of {@link TInstance}
 * objects for each specific editor object that is used for reusable prompt files.
 */
export declare abstract class ProviderInstanceManagerBase<TInstance extends ProviderInstanceBase> extends Disposable {
    /**
     * Currently available {@link TInstance} instances.
     */
    private readonly instances;
    /**
     * Class object of the managed {@link TInstance}.
     */
    protected abstract get InstanceClass(): TProviderClass<TInstance>;
    constructor(modelService: IModelService, editorService: IEditorService, instantiationService: IInstantiationService, configService: IConfigurationService);
    /**
     * Initialize a new {@link TInstance} for the given editor.
     */
    private handleNewEditor;
}
