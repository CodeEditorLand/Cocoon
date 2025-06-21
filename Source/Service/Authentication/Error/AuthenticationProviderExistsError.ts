import { Data } from "effect";

/**
 * An error indicating that an extension attempted to register an authentication
 * provider with an ID that is already in use.
 */
export default class extends Data.TaggedError(
	"AuthenticationProviderExistsError",
)<{
	readonly ProviderID: string;
}> {
	constructor(properties: { readonly ProviderID: string }) {
		super(properties);
		this.message = `Authentication provider with ID '${this.ProviderID}' is already registered.`;
	}
	public override readonly message: string;
}
