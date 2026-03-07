export function parseCategoryValues(value?: string | string[] | null): string[] {
	if (Array.isArray(value)) {
		return Array.from(
			new Set(
				value
					.map((item) => item.trim())
					.filter(Boolean)
			)
		);
	}

	if (!value) {
		return [];
	}

	return Array.from(
		new Set(
			value
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean)
		)
	);
}

export function serializeCategoryValues(value?: string | string[] | null): string {
	return parseCategoryValues(value).join(", ");
}
