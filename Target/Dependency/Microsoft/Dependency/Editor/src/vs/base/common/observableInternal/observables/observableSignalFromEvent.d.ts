import { IObservable } from '../base.js';
import { Event } from '../commonFacade/deps.js';
import { DebugOwner } from '../debugName.js';
export declare function observableSignalFromEvent(owner: DebugOwner | string, event: Event<any>): IObservable<void>;
