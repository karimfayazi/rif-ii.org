"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
	ArrowLeft, 
	Save, 
	AlertCircle, 
	CheckCircle, 
	Loader2,
	User,
	Mail,
	Phone,
	MapPin,
	Building,
	Shield,
	Lock,
	FileText
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type UserFormData = {
	username: string;
	password: string;
	email: string;
	department: string;
	full_name: string;
	region: string;
	address: string;
	contact_no: string;
	access_level: string;
	access_add: boolean;
	access_edit: boolean;
	access_delete: boolean;
	access_reports: boolean;
	UserLoginLogs: boolean;
	Tracking_Section: boolean;
	Training_Section: boolean;
	Setting: boolean;
};

export default function AddUserPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const id = searchParams.get('id');
	const isEditMode = !!id;
	
	const { user, getUserId } = useAuth();
	const userId = user?.id || getUserId();
	const [checkingAccess, setCheckingAccess] = useState(true);
	const [hasAccess, setHasAccess] = useState(false);
	
	const [formData, setFormData] = useState<UserFormData>({
		username: "",
		password: "",
		email: "",
		department: "",
		full_name: "",
		region: "",
		address: "",
		contact_no: "",
		access_level: "User",
		access_add: false,
		access_edit: false,
		access_delete: false,
		access_reports: false,
		UserLoginLogs: false,
		Tracking_Section: false,
		Training_Section: false,
		Setting: false,
	});
	
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(isEditMode);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		checkAdminAccess();
		if (isEditMode && id) {
			fetchUserData();
		}
	}, [userId, isEditMode, id]);

	const checkAdminAccess = async () => {
		if (!userId) {
			setCheckingAccess(false);
			setHasAccess(false);
			return;
		}

		try {
			const response = await fetch(`/api/auth/access?userId=${userId}`);
			const data = await response.json();
			
			if (data.setting === true) {
				setHasAccess(true);
			} else {
				setHasAccess(false);
			}
		} catch (err) {
			console.error("Error checking access:", err);
			setHasAccess(false);
		} finally {
			setCheckingAccess(false);
		}
	};

	const fetchUserData = async () => {
		try {
			setFetching(true);
			const response = await fetch(`/api/admin/users/settings?id=${id}`);
			const data = await response.json();

			if (data.success && data.user) {
				const userData = data.user;
				setFormData({
					username: userData.username || "",
					password: "", // Don't show password
					email: userData.email || "",
					department: userData.department || "",
					full_name: userData.full_name || "",
					region: userData.region || "",
					address: userData.address || "",
					contact_no: userData.contact_no || "",
					access_level: userData.access_level || "User",
					access_add: userData.access_add === true || userData.access_add === 1,
					access_edit: userData.access_edit === true || userData.access_edit === 1,
					access_delete: userData.access_delete === true || userData.access_delete === 1,
					access_reports: userData.access_reports === true || userData.access_reports === 1,
					UserLoginLogs: userData.UserLoginLogs === true || userData.UserLoginLogs === 1,
					Tracking_Section: userData.Tracking_Section === true || userData.Tracking_Section === 1,
					Training_Section: userData.Training_Section === true || userData.Training_Section === 1,
					Setting: userData.Setting === true || userData.Setting === 1,
				});
			}
		} catch (err) {
			console.error("Error fetching user data:", err);
			setError("Failed to load user data");
		} finally {
			setFetching(false);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		const { name, value, type } = e.target;
		const checked = (e.target as HTMLInputElement).checked;
		
		setFormData(prev => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value
		}));
	};

	const validateForm = (): string | null => {
		if (!formData.username || formData.username.trim() === '') {
			return 'Username is required';
		}
		if (!isEditMode && (!formData.password || formData.password.trim() === '')) {
			return 'Password is required';
		}
		if (!formData.email || formData.email.trim() === '') {
			return 'Email is required';
		}
		if (!formData.full_name || formData.full_name.trim() === '') {
			return 'Full Name is required';
		}
		if (!formData.access_level || formData.access_level.trim() === '') {
			return 'Access Level is required';
		}
		return null;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const validationError = validateForm();
			if (validationError) {
				setError(validationError);
				setLoading(false);
				return;
			}

			const url = '/api/admin/users/add';
			const method = isEditMode ? 'PUT' : 'POST';
			
			const dataToSave = {
				...(isEditMode && { id: id, username: formData.username }),
				...formData,
				password: formData.password || undefined, // Only send password if provided
			};

			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(dataToSave),
			});

			const result = await response.json();

			if (result.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push('/dashboard/settings');
				}, 2000);
			} else {
				throw new Error(result.message || 'Failed to save user');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	if (checkingAccess || fetching) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b] mx-auto mb-4" />
					<p className="text-gray-600">{checkingAccess ? "Checking access..." : "Loading user data..."}</p>
				</div>
			</div>
		);
	}

	if (!hasAccess) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
					<p className="text-gray-600">You do not have access to this section. Please contact your administrator.</p>
					<button
						onClick={() => router.push('/dashboard/settings')}
						className="mt-4 px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
					>
						Back to Settings
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white shadow-sm border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center">
							<button
								onClick={() => router.back()}
								className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
							>
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back
							</button>
							<div className="ml-4">
								<h1 className="text-2xl font-bold text-gray-900">
									{isEditMode ? 'Edit User' : 'Add New User'}
								</h1>
								<p className="text-sm text-gray-600 mt-1">
									{isEditMode ? 'Update user information and access permissions' : 'Create a new user account'}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{success && (
					<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center mb-6">
						<CheckCircle className="h-5 w-5 text-green-500 mr-2" />
						<span className="text-green-700 font-medium">
							User {isEditMode ? 'updated' : 'added'} successfully! Redirecting...
						</span>
					</div>
				)}

				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
						<AlertCircle className="h-5 w-5 text-red-500 mr-2" />
						<span className="text-red-700">{error}</span>
					</div>
				)}

				<form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
					{/* Basic Information */}
					<div>
						<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
							<User className="h-5 w-5 mr-2" />
							Basic Information
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
								<input
									type="text"
									name="username"
									value={formData.username}
									onChange={handleInputChange}
									required
									disabled={isEditMode}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent disabled:bg-gray-100"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Password {!isEditMode && '*'}
									{isEditMode && <span className="text-gray-500 text-xs">(Leave blank to keep current)</span>}
								</label>
								<input
									type="password"
									name="password"
									value={formData.password}
									onChange={handleInputChange}
									required={!isEditMode}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
								<input
									type="email"
									name="email"
									value={formData.email}
									onChange={handleInputChange}
									required
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
								<input
									type="text"
									name="full_name"
									value={formData.full_name}
									onChange={handleInputChange}
									required
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
								<input
									type="text"
									name="department"
									value={formData.department}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
								<input
									type="text"
									name="region"
									value={formData.region}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
								<input
									type="text"
									name="address"
									value={formData.address}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
								<input
									type="text"
									name="contact_no"
									value={formData.contact_no}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Access Level *</label>
								<select
									name="access_level"
									value={formData.access_level}
									onChange={handleInputChange}
									required
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value="User">User</option>
									<option value="Admin">Admin</option>
									<option value="Manager">Manager</option>
								</select>
							</div>
						</div>
					</div>

					{/* Access Permissions */}
					<div>
						<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
							<Shield className="h-5 w-5 mr-2" />
							Access Permissions
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
								<input
									type="checkbox"
									name="access_add"
									checked={formData.access_add}
									onChange={handleInputChange}
									className="w-5 h-5 text-[#0b4d2b] border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b]"
								/>
								<span className="ml-3 text-sm font-medium text-gray-700">Access Add</span>
							</label>
							<label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
								<input
									type="checkbox"
									name="access_edit"
									checked={formData.access_edit}
									onChange={handleInputChange}
									className="w-5 h-5 text-[#0b4d2b] border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b]"
								/>
								<span className="ml-3 text-sm font-medium text-gray-700">Access Edit</span>
							</label>
							<label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
								<input
									type="checkbox"
									name="access_delete"
									checked={formData.access_delete}
									onChange={handleInputChange}
									className="w-5 h-5 text-[#0b4d2b] border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b]"
								/>
								<span className="ml-3 text-sm font-medium text-gray-700">Access Delete</span>
							</label>
							<label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
								<input
									type="checkbox"
									name="access_reports"
									checked={formData.access_reports}
									onChange={handleInputChange}
									className="w-5 h-5 text-[#0b4d2b] border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b]"
								/>
								<span className="ml-3 text-sm font-medium text-gray-700">Access Reports</span>
							</label>
							<label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
								<input
									type="checkbox"
									name="UserLoginLogs"
									checked={formData.UserLoginLogs}
									onChange={handleInputChange}
									className="w-5 h-5 text-[#0b4d2b] border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b]"
								/>
								<span className="ml-3 text-sm font-medium text-gray-700">User Login Logs</span>
							</label>
							<label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
								<input
									type="checkbox"
									name="Tracking_Section"
									checked={formData.Tracking_Section}
									onChange={handleInputChange}
									className="w-5 h-5 text-[#0b4d2b] border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b]"
								/>
								<span className="ml-3 text-sm font-medium text-gray-700">Tracking Section</span>
							</label>
							<label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
								<input
									type="checkbox"
									name="Training_Section"
									checked={formData.Training_Section}
									onChange={handleInputChange}
									className="w-5 h-5 text-[#0b4d2b] border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b]"
								/>
								<span className="ml-3 text-sm font-medium text-gray-700">Training Section</span>
							</label>
							<label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
								<input
									type="checkbox"
									name="Setting"
									checked={formData.Setting}
									onChange={handleInputChange}
									className="w-5 h-5 text-[#0b4d2b] border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b]"
								/>
								<span className="ml-3 text-sm font-medium text-gray-700">Setting</span>
							</label>
						</div>
					</div>

					{/* Submit Buttons */}
					<div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
						<button
							type="button"
							onClick={() => router.back()}
							className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="inline-flex items-center px-6 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									{isEditMode ? 'Update' : 'Save'} User
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

