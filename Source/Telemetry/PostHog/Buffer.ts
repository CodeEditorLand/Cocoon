/**
 * @module Telemetry/PostHog/Buffer
 * @description
 * In-memory event buffer + flush scheduler. Events push onto an array;
 * a debounced timer triggers `Transport` after `BatchWindowMilliseconds`
 * or immediately when `BatchMaximum` is reached. `Drain` runs the same
 * flush path synchronously - used by the process-exit hook.
 */

import type { Configuration } from "./Configuration.js";
import Event, { type Properties, type Event as QueuedEvent } from "./Event.js";
import Transport from "./Transport.js";

export type Buffer = {
	readonly Enqueue: (Name: string, Properties: Properties) => void;
	readonly Drain: () => void;
};

export default (Config: Configuration, DistinctIdentifier: string): Buffer => {
	let Queue: QueuedEvent[] = [];

	let FlushTimer: NodeJS.Timeout | undefined;

	const Send = (): void => {
		if (Queue.length === 0) return;

		const Pending = Queue;

		Queue = [];

		Transport(Config.Host, Config.Key, DistinctIdentifier, Pending);
	};

	const ScheduleFlush = (): void => {
		if (FlushTimer) return;

		FlushTimer = setTimeout(() => {
			FlushTimer = undefined;

			Send();
		}, Config.BatchWindowMilliseconds);

		(FlushTimer as unknown as { unref?: () => void }).unref?.();
	};

	return {
		Enqueue: (Name: string, Properties: Properties): void => {
			Queue.push(Event.Create(Name, Properties));

			if (Queue.length >= Config.BatchMaximum) {
				Send();

				return;
			}

			ScheduleFlush();
		},
		Drain: (): void => {
			if (FlushTimer) {
				clearTimeout(FlushTimer);

				FlushTimer = undefined;
			}

			Send();
		},
	};
};
