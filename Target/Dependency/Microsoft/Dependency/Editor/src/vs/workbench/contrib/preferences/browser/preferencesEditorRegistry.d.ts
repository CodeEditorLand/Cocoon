import { IDisposable } from '../../../../base/common/lifecycle.js';
import * as DOM from '../../../../base/browser/dom.js';
import { Event } from '../../../../base/common/event.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
export declare namespace Extensions {
    const PreferencesEditorPane = "workbench.registry.preferences.editorPanes";
}
export interface IPreferencesEditorPane extends IDisposable {
    getDomNode(): HTMLElement;
    layout(dimension: DOM.Dimension): void;
    search(text: string): void;
}
export interface IPreferencesEditorPaneDescriptor {
    /**
     * The id of the view container
     */
    readonly id: string;
    /**
     * The title of the view container
     */
    readonly title: string;
    /**
     * Icon representation of the View container
     */
    readonly icon?: ThemeIcon | URI;
    /**
     * Order of the view container.
     */
    readonly order: number;
    /**
     * IViewPaneContainer Ctor to instantiate
     */
    readonly ctorDescriptor: SyncDescriptor<IPreferencesEditorPane>;
    /**
     * Storage id to use to store the view container state.
     * If not provided, it will be derived.
     */
    readonly storageId?: string;
}
export interface IPreferencesEditorPaneRegistry {
    readonly onDidRegisterPreferencesEditorPanes: Event<IPreferencesEditorPaneDescriptor[]>;
    readonly onDidDeregisterPreferencesEditorPanes: Event<IPreferencesEditorPaneDescriptor[]>;
    registerPreferencesEditorPane(descriptor: IPreferencesEditorPaneDescriptor): IDisposable;
    getPreferencesEditorPanes(): readonly IPreferencesEditorPaneDescriptor[];
}
