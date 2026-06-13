/**
 * @module Services/Window/State
 * @description
 * Window state management - plain mutable state, no Effect-TS Ref.
 */

import type { WindowStateConfig } from "./Types.js";

export interface WindowStateService {

	readonly getState: Promise<WindowStateConfig>;

	readonly setState: (
		state: WindowStateConfig,
	) => Promise<WindowStateConfig>;

	readonly onStateChange: Promise<void>;
}

export const WindowStateService = Symbol<WindowStateService>(
	"Service/Window/State",
);

function makeWindowStateService(): WindowStateService {
	let _state: WindowStateConfig = { focused: true, active: true };

	return WindowStateService.of({
		getState: Effect.suspend(() => ))))))))))))return (_state)),
		setState: (newState: WindowStateConfig) =>
			{
				_state = newState;

				return newState;
			},
		onStateChange: undefined,
	};
}

export const WindowStateLive = return (makeWindowStateService();

export const WindowStateLayer = makeWindowStateService(),
;
