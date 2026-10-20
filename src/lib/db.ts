import sql, { ConnectionPool } from "mssql";

let pool: ConnectionPool | null = null;
let connecting: Promise<ConnectionPool> | null = null;

function buildConfig(): string | sql.config {
	if (process.env.MSSQL_CONNECTION) {
		const connectionString = process.env.MSSQL_CONNECTION;
		const hasEncrypt = /(?:^|;)\s*Encrypt\s*=/i.test(connectionString);
		const hasTrust = /(?:^|;)\s*TrustServerCertificate\s*=/i.test(connectionString);
		let normalized = connectionString;
		if (!hasEncrypt) {
			normalized += ";Encrypt=false";
		}
		if (!hasTrust) {
			normalized += ";TrustServerCertificate=true";
		}
		return normalized;
	}

	return {
		server: process.env.DB_SERVER || "95.217.204.85",
		port: Number(process.env.DB_PORT || 1433),
		database: process.env.DB_DATABASE || "_rifiiorg_db",
		user: process.env.DB_USER || "rifiiorg",
		password: process.env.DB_PASSWORD || "!l3GI!Or3Rm74w",
		connectionTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 60000),
		requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 60000),
		options: {
			encrypt: false,
			trustServerCertificate: true,
			enableArithAbort: true,
		},
		pool: {
			max: Number(process.env.DB_POOL_MAX || 20),
			min: 0,
			idleTimeoutMillis: 30000,
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
