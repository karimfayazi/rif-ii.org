import { getDb } from "@/lib/db";

export type PermissionField =
	| "Upload_Report"
	| "Upload_Documents"
	| "Upload_Pictures"
	| "security"
	| "access_links"
	| "access_security_updates"
	| "access_news"
	| "access_security_incidents_data";

type PermissionCheckResult = {
	allowed: boolean;
	message?: string;
};

function checkBitField(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (Buffer.isBuffer(value)) return value[0] === 1;
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value === 1;
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		return normalized === "1" || normalized === "true";
	}
	return false;
}

export async function checkPermission(
	userId: string | null,
	permissionField: PermissionField
): Promise<PermissionCheckResult> {
	if (!userId) {
		return { allowed: false, message: "Unauthorized" };
	}

	try {
		const pool = await getDb();
		const query = `
			SELECT [access_level], [${permissionField}]
			FROM [_rifiiorg_db].[dbo].[tbl_user_access]
			WHERE [username] = @userId OR [email] = @userId
		`;

		const result = await pool.request().input("userId", userId).query(query);
		if (result.recordset.length === 0) {
			return { allowed: false, message: "User not found" };
		}

		const userAccess = result.recordset[0];
		const isAdmin = userAccess.access_level === "Admin";
		const hasPermission = checkBitField(userAccess[permissionField]);

		if (!isAdmin && !hasPermission) {
			return {
				allowed: false,
				message: "You do not have permission to perform this action.",
			};
		}

		return { allowed: true };
	} catch (error) {
		console.error(`Error checking ${permissionField} permission:`, error);
		return { allowed: false, message: "Error checking access permissions" };
	}
}

export { checkBitField };
