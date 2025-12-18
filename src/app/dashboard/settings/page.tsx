"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
	Users, 
	Filter, 
	Edit, 
	Trash2, 
	Eye, 
	EyeOff, 
	Mail, 
	Phone, 
	MapPin, 
	Building, 
	User, 
	Shield,
	RefreshCw,
	Plus,
	MoreVertical,
	AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type UserData = {
	username: string;
	password: string;
	email: string;
	department: string;
	full_name: string;
	region: string;
	contact_no: string;
	access_level: string;
};

export default function SettingsPage() {
	const router = useRouter();
	const { user, getUserId } = useAuth();
	const userId = user?.id || getUserId();
	const [users, setUsers] = useState<UserData[]>([]);
	const [loading, setLoading] = useState(true);
	const [checkingAccess, setCheckingAccess] = useState(true);
	const [hasAccess, setHasAccess] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedDepartment, setSelectedDepartment] = useState("");
	const [selectedAccessLevel, setSelectedAccessLevel] = useState("");
	const [showPasswords, setShowPasswords] = useState(false);
	const [departments, setDepartments] = useState<string[]>([]);
	const [accessLevels, setAccessLevels] = useState<string[]>([]);

	useEffect(() => {
		checkAdminAccess();
	}, [userId]);

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
				fetchUsers();
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

	const fetchUsers = async () => {
		try {
			setLoading(true);
			const response = await fetch('/api/admin/users/settings');
			const data = await response.json();

			if (data.success) {
				setUsers(data.users || []);
				
				// Extract unique departments and access levels for filters
				const uniqueDepartments = [...new Set(data.users.map((user: UserData) => user.department).filter(Boolean))] as string[];
				const uniqueAccessLevels = [...new Set(data.users.map((user: UserData) => user.access_level).filter(Boolean))] as string[];
				
				setDepartments(uniqueDepartments);
				setAccessLevels(uniqueAccessLevels);
			} else {
				setError(data.message || "Failed to fetch users");
			}
		} catch (err) {
			setError("Error fetching users");
			console.error("Error fetching users:", err);
		} finally {
			setLoading(false);
		}
	};


	const handleReset = () => {
		setSearchTerm("");
		setSelectedDepartment("");
		setSelectedAccessLevel("");
	};

	const getAccessLevelColor = (accessLevel: string) => {
		switch (accessLevel?.toLowerCase()) {
			case 'admin':
				return 'bg-red-100 text-red-800 border-red-200';
			case 'user':
				return 'bg-blue-100 text-blue-800 border-blue-200';
			case 'manager':
				return 'bg-green-100 text-green-800 border-green-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	};

	const getDepartmentColor = (department: string) => {
		const colors = [
			'bg-purple-100 text-purple-800',
			'bg-indigo-100 text-indigo-800',
			'bg-cyan-100 text-cyan-800',
			'bg-emerald-100 text-emerald-800',
			'bg-amber-100 text-amber-800',
			'bg-rose-100 text-rose-800'
		];
		const index = department?.length % colors.length || 0;
		return colors[index];
	};

	const maskPassword = (password: string) => {
		if (!password) return "N/A";
		return showPasswords ? password : "•".repeat(Math.min(password.length, 8));
	};

	const formatPhoneNumber = (phone: string) => {
		if (!phone) return "N/A";
		// Simple phone formatting
		return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
	};

	// Filter users based on search and filters
	const filteredUsers = users.filter(user => {
		const matchesSearch = !searchTerm || 
			user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.region?.toLowerCase().includes(searchTerm.toLowerCase());
		
		const matchesDepartment = !selectedDepartment || user.department === selectedDepartment;
		const matchesAccessLevel = !selectedAccessLevel || user.access_level === selectedAccessLevel;
		
		return matchesSearch && matchesDepartment && matchesAccessLevel;
	});

	if (checkingAccess) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">User Management</h1>
					<p className="text-gray-600 mt-2">Manage system users and their access levels</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Checking access...</span>
				</div>
			</div>
		);
	}

	if (!hasAccess) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">User Management</h1>
					<p className="text-gray-600 mt-2">Manage system users and their access levels</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
					<p className="text-gray-600">You do not have access to this section. Please contact your administrator.</p>
					<button
						onClick={() => router.push('/dashboard')}
						className="mt-4 px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
					>
						Back to Dashboard
					</button>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">User Management</h1>
					<p className="text-gray-600 mt-2">Manage system users and their access levels</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading users...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">User Management</h1>
					<p className="text-gray-600 mt-2">Manage system users and their access levels</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
					<button
						onClick={fetchUsers}
						className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">User Management</h1>
					<p className="text-gray-600 mt-2">Manage system users and their access levels</p>
				</div>
				<div className="flex items-center space-x-3">
					<button
						onClick={() => setShowPasswords(!showPasswords)}
						className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
					>
						{showPasswords ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
						{showPasswords ? 'Hide' : 'Show'} Passwords
					</button>
					<button
						onClick={fetchUsers}
						className="inline-flex items-center px-3 py-2 text-sm font-medium text-[#0b4d2b] bg-[#0b4d2b]/10 rounded-lg hover:bg-[#0b4d2b]/20 transition-colors"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</button>
					<button 
						onClick={() => router.push('/dashboard/settings/add')}
						className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
					>
						<Plus className="h-4 w-4 mr-2" />
						Add User
					</button>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-lg font-semibold text-gray-900">Search & Filter Users</h3>
						<p className="text-sm text-gray-600">Find specific users by name, email, or department</p>
					</div>
					<div className="flex items-center space-x-4">
						<div className="flex items-center space-x-2">
							<div className="h-2 w-2 bg-green-500 rounded-full"></div>
							<span className="text-xs text-gray-500 font-medium">Live Search</span>
						</div>
						<button
							onClick={handleReset}
							className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
						>
							<Filter className="h-3 w-3 mr-1" />
							Reset
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					{/* Search Input */}
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
						<div className="relative">
							<input
								type="text"
								placeholder="Search by name, username, email..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full px-4 py-3 text-gray-900 placeholder-gray-500 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#0b4d2b]/20 focus:border-[#0b4d2b] focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md"
							/>
						</div>
					</div>

					{/* Department Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
						<select
							value={selectedDepartment}
							onChange={(e) => setSelectedDepartment(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Departments</option>
							{departments.map((dept) => (
								<option key={dept} value={dept}>
									{dept}
								</option>
							))}
						</select>
					</div>

					{/* Access Level Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Access Level</label>
						<select
							value={selectedAccessLevel}
							onChange={(e) => setSelectedAccessLevel(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Access Levels</option>
							{accessLevels.map((level) => (
								<option key={level} value={level}>
									{level}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Users Grid */}
			{filteredUsers.length === 0 ? (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
					<Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
					<p className="text-gray-600">
						{searchTerm || selectedDepartment || selectedAccessLevel 
							? "Try adjusting your search criteria" 
							: "No users available"
						}
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredUsers.map((user, index) => (
						<div
							key={index}
							className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group"
						>
							{/* User Header */}
							<div className="p-6 pb-4">
								<div className="flex items-start justify-between mb-4">
									<div className="flex items-center space-x-3">
										<div className="w-12 h-12 bg-gradient-to-br from-[#0b4d2b] to-[#0a3d24] rounded-full flex items-center justify-center">
											<User className="h-6 w-6 text-white" />
										</div>
										<div>
											<h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#0b4d2b] transition-colors">
												{user.full_name || user.username || "N/A"}
											</h3>
											<p className="text-sm text-gray-500">@{user.username}</p>
										</div>
									</div>
									<button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
										<MoreVertical className="h-4 w-4" />
									</button>
								</div>

								{/* User Information */}
								<div className="space-y-3 text-sm">
									{user.email && (
										<div className="flex items-center text-gray-600">
											<Mail className="h-4 w-4 mr-3 text-gray-400" />
											<span className="truncate">{user.email}</span>
										</div>
									)}
									{user.contact_no && (
										<div className="flex items-center text-gray-600">
											<Phone className="h-4 w-4 mr-3 text-gray-400" />
											<span>{formatPhoneNumber(user.contact_no)}</span>
										</div>
									)}
									{user.region && (
										<div className="flex items-center text-gray-600">
											<MapPin className="h-4 w-4 mr-3 text-gray-400" />
											<span className="truncate">{user.region}</span>
										</div>
									)}
									{user.department && (
										<div className="flex items-center text-gray-600">
											<Building className="h-4 w-4 mr-3 text-gray-400" />
											<span className="truncate">{user.department}</span>
										</div>
									)}
								</div>

								{/* Access Level and Department Badges */}
								<div className="flex flex-wrap gap-2 mt-4">
									{user.access_level && (
										<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getAccessLevelColor(user.access_level)}`}>
											<Shield className="h-3 w-3 mr-1" />
											{user.access_level}
										</span>
									)}
									{user.department && (
										<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDepartmentColor(user.department)}`}>
											<Building className="h-3 w-3 mr-1" />
											{user.department}
										</span>
									)}
								</div>

								{/* Password Display */}
								{user.password && (
									<div className="mt-4 p-3 bg-gray-50 rounded-lg">
										<div className="flex items-center justify-between">
											<span className="text-xs font-medium text-gray-500">Password:</span>
											<span className="text-sm font-mono text-gray-700">
												{maskPassword(user.password)}
											</span>
										</div>
									</div>
								)}
							</div>

							{/* Action Buttons */}
							<div className="px-6 py-4 bg-gray-50 rounded-b-lg flex items-center justify-between">
								<div className="flex items-center space-x-2">
									<button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
										<Eye className="h-4 w-4" />
									</button>
									<button className="p-2 text-gray-400 hover:text-green-600 transition-colors">
										<Edit className="h-4 w-4" />
									</button>
									<button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
								<button className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
									More actions
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Results Count */}
			{filteredUsers.length > 0 && (
				<div className="text-center text-sm text-gray-500">
					Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
					{(searchTerm || selectedDepartment || selectedAccessLevel) && ' matching your criteria'}
				</div>
			)}
		</div>
	);
}


