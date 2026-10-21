import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * Shared API error handling:
 * - assigns a request/reference ID
 * - writes one structured, sanitized log entry (with stack + DB error details)
 * - returns a safe message in production and sanitized diagnostics in development only
 */

export const CONNECTION_ERROR_MESSAGE =
	"We are unable to connect to the system right now. Please try again in a few minutes. If the problem continues, please contact your IT support team.";

export type ApiErrorCategory =
	| "CONFIG_MISSING"
	| "TLS_CERTIFICATE"
	| "DB_LOGIN_FAILED"
	| "DB_TIMEOUT"
	| "DB_UNREACHABLE"
	| "DB_CONNECTION"
	| "UNKNOWN";

type LooseError = {
	name?: string;
	code?: string;
	number?: number;
	state?: number;
	class?: number;
	lineNumber?: number;
	procName?: string;
	serverName?: string;
	address?: string;
	port?: number;
	message?: string;
	stack?: string;
	originalError?: LooseError;
	cause?: unknown;
	errors?: unknown[];
};

type CauseDetails = {
	type?: string;
	code?: string;
	message?: string;
	address?: string;
	port?: number;
};

type ErrorDetails = {
	type: string;
	code?: string;
	message: string;
	originalMessage?: string;
	sql?: {
		number?: number;
		state?: number;
		class?: number;
		lineNumber?: number;
		procName?: string;
		serverName?: string;
	};
	causes?: CauseDetails[];
	stack?: string[];
};

const isDevelopment = () => process.env.NODE_ENV === "development";

/** Env values that must never appear in logs or responses. */
const SECRET_ENV_NAMES = ["DB_PASSWORD", "DB_USER", "MSSQL_CONNECTION", "BLOB_READ_WRITE_TOKEN"];

export function redactSensitive(value: unknown): string {
	let text = typeof value === "string" ? value : String(value ?? "");

	for (const name of SECRET_ENV_NAMES) {
		const secret = process.env[name];
		if (secret && secret.length >= 3) {
			text = text.split(secret).join("[REDACTED]");
		}
	}

	return text
		.replace(
			/\b(password|pwd|user\s*id|uid|secret|token|api[_-]?key|authorization)\s*[=:]\s*[^;,\s]+/gi,
			"$1=[REDACTED]"
		)
		.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
		.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
}

function pickCauses(error: LooseError | undefined): CauseDetails[] {
	if (!error) {
		return [];
	}

	const candidates: unknown[] = [];
	const cause = error.cause as LooseError | undefined;

	if (cause) {
		candidates.push(...(Array.isArray(cause.errors) && cause.errors.length ? cause.errors : [cause]));
	}
	if (Array.isArray(error.errors)) {
		candidates.push(...error.errors);
	}

	return candidates.slice(0, 5).map((item) => {
		const entry = item as LooseError;
		return {
			type: entry?.name,
			code: entry?.code,
			message: entry?.message ? redactSensitive(entry.message) : undefined,
			address: entry?.address,
			port: entry?.port,
		};
	});
}

function describeError(error: unknown): ErrorDetails {
	const err = (error ?? {}) as LooseError;
	const original = err.originalError;
	const message = redactSensitive(
		error instanceof Error ? error.message : typeof error === "string" ? error : err.message ?? "Unknown error"
	);
	const originalMessage = original?.message ? redactSensitive(original.message) : undefined;

	const sql = {
		number: err.number ?? original?.number,
		state: err.state ?? original?.state,
		class: err.class ?? original?.class,
		lineNumber: err.lineNumber ?? original?.lineNumber,
		procName: err.procName ?? original?.procName,
		serverName: err.serverName ?? original?.serverName,
	};
	const hasSql = Object.values(sql).some((v) => v !== undefined);

	const causes = [...pickCauses(err), ...pickCauses(original)];

	return {
		type: err.name || (error instanceof Error ? error.constructor.name : typeof error),
		code: err.code ?? original?.code,
		message,
		originalMessage: originalMessage && originalMessage !== message ? originalMessage : undefined,
		sql: hasSql ? sql : undefined,
		causes: causes.length ? causes : undefined,
		stack: err.stack
			? redactSensitive(err.stack)
					.split("\n")
					.map((line) => line.trim())
					.filter(Boolean)
					.slice(0, 15)
			: undefined,
	};
}

const CATEGORY_HINTS: Record<Exclude<ApiErrorCategory, "UNKNOWN">, string> = {
	CONFIG_MISSING:
		"Database environment variables are not loaded. Set DB_SERVER, DB_DATABASE, DB_USER and DB_PASSWORD (or MSSQL_CONNECTION) in .env.local / .env.development.local, then restart the dev server.",
	TLS_CERTIFICATE:
		"SQL Server's TLS certificate is not trusted. Install a CA-trusted certificate on SQL Server (connect using its hostname) or explicitly approve DB_TRUST_SERVER_CERTIFICATE=true for this environment.",
	DB_LOGIN_FAILED:
		"SQL Server rejected the login. Verify DB_USER/DB_PASSWORD, SQL Authentication mode, and that the login is mapped to DB_DATABASE.",
	DB_TIMEOUT:
		"The connection or query timed out. Check firewall/IP allow-list for port 1433, SQL Server TCP/IP binding, and DB_CONNECT_TIMEOUT / DB_REQUEST_TIMEOUT.",
	DB_UNREACHABLE:
		"The SQL Server host could not be reached. Check DB_SERVER, DNS, network access and firewall rules.",
	DB_CONNECTION:
		"The database connection failed. Check the server logs for the full error for this request ID.",
};

function classify(details: ErrorDetails): ApiErrorCategory {
	const haystack = [
		details.message,
		details.originalMessage ?? "",
		...(details.causes ?? []).map((c) => `${c.code ?? ""} ${c.message ?? ""}`),
	]
		.join(" ")
		.toLowerCase();
	const code = (details.code ?? "").toUpperCase();

	if (haystack.includes("database environment variable")) return "CONFIG_MISSING";
	if (
		/self[- ]signed|certificate|unable to verify|cert_|unable_to_get_issuer/.test(haystack)
	) {
		return "TLS_CERTIFICATE";
	}
	if (code === "ELOGIN" || details.sql?.number === 18456 || haystack.includes("login failed")) {
		return "DB_LOGIN_FAILED";
	}
	if (
		code === "ETIMEOUT" ||
		/connect timeout|connection timeout|login timeout|timeout expired|timed out|in \d+ms/.test(haystack)
	) {
		return "DB_TIMEOUT";
	}
	if (
		["ECONNREFUSED", "EHOSTUNREACH", "ENOTFOUND", "ENETUNREACH"].includes(code) ||
		haystack.includes("getaddrinfo") ||
		haystack.includes("connection refused")
	) {
		return "DB_UNREACHABLE";
	}
	if (
		["ESOCKET", "ECONNRESET", "EPIPE", "ECONNCLOSED", "ENOTOPEN"].includes(code) ||
		haystack.includes("failed to connect") ||
		haystack.includes("could not connect") ||
		haystack.includes("socket hang up")
	) {
		return "DB_CONNECTION";
	}

	return "UNKNOWN";
}

function resolveRequestId(request: Request): string {
	const incoming = request.headers.get("x-request-id");
	if (incoming && /^[A-Za-z0-9-]{8,64}$/.test(incoming)) {
		return incoming;
	}
	return randomUUID();
}

export type ApiErrorOptions = {
	/** Short operation name used in logs, e.g. "change-password:lookup". */
	operation: string;
	/** Safe message returned in production for non-connection failures. */
	fallbackMessage: string;
};

export function createApiErrorResponse(request: Request, error: unknown, options: ApiErrorOptions) {
	const requestId = resolveRequestId(request);
	const details = describeError(error);
	const category = classify(details);
	const isConnectionError = category !== "UNKNOWN";
	const status = isConnectionError ? 503 : 500;
	const timestamp = new Date().toISOString();

	let pathname = "";
	try {
		pathname = new URL(request.url).pathname; // query string intentionally excluded
	} catch {
		pathname = "";
	}

	// Structured server-side log (sanitized; includes stack and DB error details).
	const logEntry = {
		level: "error",
		event: "api_error",
		timestamp,
		requestId,
		operation: options.operation,
		method: request.method,
		path: pathname,
		httpStatus: status,
		category,
		error: details,
	};
	console.error(JSON.stringify(logEntry, null, isDevelopment() ? 2 : undefined));

	const safeMessage = isConnectionError ? CONNECTION_ERROR_MESSAGE : options.fallbackMessage;

	const body: Record<string, unknown> = {
		success: false,
		...(isConnectionError ? { code: "CONNECTION_ERROR" } : {}),
		message: isDevelopment() ? details.originalMessage || details.message || safeMessage : safeMessage,
		requestId,
	};

	if (isDevelopment()) {
		body.debug = {
			requestId,
			operation: options.operation,
			httpStatus: status,
			category,
			errorType: details.type,
			errorCode: details.code,
			sql: details.sql,
			causes: details.causes,
			hint: category === "UNKNOWN" ? undefined : CATEGORY_HINTS[category],
			timestamp,
		};
	}

	return NextResponse.json(body, {
		status,
		headers: { "x-request-id": requestId },
	});
}
