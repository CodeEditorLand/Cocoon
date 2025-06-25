import { ServiceIdentifier, ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
export declare class StaticServiceAccessor implements ServicesAccessor {
    private services;
    withService<T>(id: ServiceIdentifier<T>, service: T): this;
    get<T>(id: ServiceIdentifier<T>): T;
}
