import sql, { ConnectionPool } from "mssql";

let pool: ConnectionPool | null = null;
let connecting: Promise<ConnectionPool> | null = null;

function getRequiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required database environment variable: ${name}`);
	}
	return value;
}

function parseBooleanEnv(name: string, defaultValue: boolean): boolean {
	const value = process.env[name];
	if (value === undefined || value === "") {
		return defaultValue;
	}

	return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parseNumberEnv(name: string, defaultValue: number): number {
	const value = process.env[name];
	if (!value) {
		return defaultValue;
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		throw new Error(`Invalid numeric database environment variable: ${name}`);
	}

	return parsed;
}

function buildConfig(): string | sql.config {
	if (process.env.MSSQL_CONNECTION) {
		return process.env.MSSQL_CONNECTION;
	}

	const instanceName = process.env.DB_INSTANCE;
	const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;

	if (port !== undefined && !Number.isFinite(port)) {
		throw new Error("Invalid numeric database environment variable: DB_PORT");
	}

	return {
		server: getRequiredEnv("DB_SERVER"),
		...(port !== undefined && !instanceName ? { port } : {}),
		database: getRequiredEnv("DB_DATABASE"),
		user: getRequiredEnv("DB_USER"),
		password: getRequiredEnv("DB_PASSWORD"),
		connectionTimeout: parseNumberEnv("DB_CONNECT_TIMEOUT", 60000),
		requestTimeout: parseNumberEnv("DB_REQUEST_TIMEOUT", 60000),
		options: {
			encrypt: parseBooleanEnv("DB_ENCRYPT", true),
			trustServerCertificate: parseBooleanEnv("DB_TRUST_SERVER_CERTIFICATE", false),
			enableArithAbort: true,
			...(instanceName ? { instanceName } : {}),
		},
		pool: {
			max: parseNumberEnv("DB_POOL_MAX", 20),
			min: parseNumberEnv("DB_POOL_MIN", 0),
			idleTimeoutMillis: parseNumberEnv("DB_POOL_IDLE_TIMEOUT", 30000),
		},
	};
}

export async function getDb(): Promise<ConnectionPool> {
	if (pool?.connected) {
		return pool;
	}

	if (connecting) {
		return connecting;
	}

	connecting = (async () => {
		try {
			if (pool) {
				try {
					await pool.close();
				} catch {
					// ignore close errors from a broken pool
				}
				pool = null;
			}

			const config = buildConfig();
			const nextPool =
				typeof config === "string"
					? await new sql.ConnectionPool(config).connect()
					: await new sql.ConnectionPool(config).connect();

			nextPool.on("error", (error) => {
				console.error("MSSQL pool error:", error);
				pool = null;
			});

			pool = nextPool;
			return nextPool;
		} catch (error) {
			pool = null;
			throw error;
		} finally {
			connecting = null;
		}
	})();

	return connecting;
}

export type UserRow = {
	username: string;
	password: string | null;
	email: string | null;
	created_at: Date | null;
	updated_at: Date | null;
	department: string | null;
	full_name: string | null;
	region: string | null;
	address: string | null;
	contact_no: string | null;
	access_level: string | null;
	access_granted_at: Date | null;
	access_add: boolean | number | null;
	access_edit: boolean | number | null;
	access_delete: boolean | number | null;
	access_reports: boolean | number | null;
	UserLoginLogs: string | null;
};
