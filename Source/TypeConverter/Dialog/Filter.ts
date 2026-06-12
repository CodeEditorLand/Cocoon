/**
 * @module Filter
 * @description A shared helper to serialize dialog filters for IPC.
 */

/**
 * @description Serializes dialog filter options into a DTO array.
 * @param Filters The filters object from `OpenDialogOptions` or `SaveDialogOptions`.
 * @returns A serializable array representation of the filters.
 */
export const SerializeFilters = (Filters?: {
	readonly [Name: string]: readonly string[];
}) => {
	if (!Filters) {
		return undefined;
	}

	return Object.entries(Filters).map(([Name, Extensions]) => ({
		name: Name,
		extensions: Extensions,
	});
};
