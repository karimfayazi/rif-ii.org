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

/** Accepts only http:// and https:// resource links (YouTube, Drive, docs, websites, etc.). */
export function isValidHttpUrl(value?: string | null): boolean {
	const trimmed = String(value ?? "").trim();
	if (!trimmed) {
		return false;
	}

	try {
		const parsed = new URL(trimmed);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}
