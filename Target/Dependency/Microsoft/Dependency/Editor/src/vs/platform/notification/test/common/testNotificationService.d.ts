import { Event } from '../../../../base/common/event.js';
import { INotification, INotificationHandle, INotificationService, INotificationSource, INotificationSourceFilter, IPromptChoice, IPromptOptions, IStatusHandle, IStatusMessageOptions, NotificationsFilter, Severity } from '../../common/notification.js';
export declare class TestNotificationService implements INotificationService {
    readonly onDidChangeFilter: Event<void>;
    readonly _serviceBrand: undefined;
    private static readonly NO_OP;
    info(message: string): INotificationHandle;
    warn(message: string): INotificationHandle;
    error(error: string | Error): INotificationHandle;
    notify(notification: INotification): INotificationHandle;
    prompt(severity: Severity, message: string, choices: IPromptChoice[], options?: IPromptOptions): INotificationHandle;
    status(message: string | Error, options?: IStatusMessageOptions): IStatusHandle;
    setFilter(): void;
    getFilter(source?: INotificationSource | undefined): NotificationsFilter;
    getFilters(): INotificationSourceFilter[];
    removeFilter(sourceId: string): void;
}
