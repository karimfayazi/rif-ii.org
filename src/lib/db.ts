import sql, { ConnectionPool } from "mssql";

let pool: ConnectionPool | null = null;

const defaultConnection =
	"Data Source=95.217.204.85;Initial Catalog=_rifiiorg_db;Integrated Security=False;User ID=rifiiorg;Password=!l3GI!Or3Rm74w;Connect Timeout=60;Max Pool Size=300;Encrypt=false";

export async function getDb(): Promise<ConnectionPool> {
	if (pool) return pool;

	const connectionString = process.env.MSSQL_CONNECTION || defaultConnection;
	pool = await sql.connect(connectionString);
	return pool;
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


