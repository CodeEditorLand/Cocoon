/**
 * @module Services/Window/State
 * @description
 * Window state management - plain mutable state, no Effect-TS Ref.
 */

import type { WindowStateConfig } from "./Types.js";

export interface WindowStateService {
	readonly getState: Effect.Effect<WindowStateConfig, never>;

	readonly setState: (
		state: WindowStateConfig,
	) => Effect.Effect<WindowStateConfig, never>;

	readonly onStateChange: Effect.Effect<void, never>;
}

export const WindowStateService = Context.Tag<WindowStateService>(
	"Service/Window/State",
);

function makeWindowStateService(): WindowStateService {
	let _state: WindowStateConfig = { focused: true, active: true };

	return WindowStateService.of({
		getState: Effect.suspend(() => Effect.succeed(_state)),
		setState: (newState: WindowStateConfig) =>
			Effect.sync(() => {
				_state = newState;

				return newState;
			}),
		onStateChange: Effect.void,
	});
}

export const WindowStateLive = Effect.succeed(makeWindowStateService());

export const WindowStateLayer = Layer.succeed(
	WindowStateService,

	makeWindowStateService(),
);
