import { Event } from '../../../../../base/common/event.js';
import { IViewContainerModel, IViewDescriptor, IViewDescriptorService, ViewContainer, ViewContainerLocation } from '../../../../common/views.js';
export declare class TestViewDescriptorService implements Partial<IViewDescriptorService> {
    getViewLocationById(id: string): ViewContainerLocation | null;
    readonly onDidChangeLocation: Event<{
        views: IViewDescriptor[];
        from: ViewContainerLocation;
        to: ViewContainerLocation;
    }>;
    getViewDescriptorById(id: string): IViewDescriptor | null;
    getViewContainerByViewId(id: string): ViewContainer | null;
    getViewContainerModel(viewContainer: ViewContainer): IViewContainerModel;
    getDefaultContainerById(id: string): ViewContainer | null;
}
