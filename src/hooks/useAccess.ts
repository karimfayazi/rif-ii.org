"use client";

import { useState, useEffect } from "react";

type AccessLevel = 'Admin' | 'User' | null;

type AccessPermissions = {
	accessLevel: AccessLevel;
	isAdmin: boolean;
	canUpload: boolean;
	canUploadPictures: boolean;
	canUploadDocuments: boolean;
	canManageCategories: boolean;
	canManageSubCategories: boolean;
	accessAdd: boolean;
	accessEdit: boolean;
	accessDelete: boolean;
	accessReports: boolean;
	userLoginLogs: boolean;
	trackingSection: boolean;
	trainingSection: boolean;
	accessSecurity: boolean;
	accessLinks: boolean;
	accessSecurityUpdates: boolean;
	accessNews: boolean;
	accessSecurityIncidentsData: boolean;
	loading: boolean;
	error: string | null;
};

export function useAccess(userId?: string | null) {
	const [permissions, setPermissions] = useState<AccessPermissions>({
		accessLevel: null,
		isAdmin: false,
		canUpload: false,
		canUploadPictures: false,
		canUploadDocuments: false,
		canManageCategories: false,
		canManageSubCategories: false,
		accessAdd: false,
		accessEdit: false,
		accessDelete: false,
		accessReports: false,
		userLoginLogs: false,
		trackingSection: true,
		trainingSection: true,
		accessSecurity: false,
		accessLinks: false,
		accessSecurityUpdates: false,
		accessNews: false,
		accessSecurityIncidentsData: false,
		loading: true,
		error: null
	});

	useEffect(() => {
		if (!userId) {
			setPermissions(prev => ({
				...prev,
				loading: false,
				error: "No user ID provided"
			}));
			return;
		}

		checkAccess(userId);
	}, [userId]);

		const checkAccess = async (userId: string) => {
		try {
			setPermissions(prev => ({ ...prev, loading: true, error: null }));
			
			const response = await fetch(`/api/auth/access?userId=${encodeURIComponent(userId)}`);
			const data = await response.json();
			
			console.log('[useAccess] API Response:', data);
			
			if (data.success) {
				// Helper function to convert to boolean
				const toBool = (value: any): boolean => {
					if (value === true || value === 1 || value === '1' || value === 'true' || value === 'True') return true;
					return false;
				};
				
				const canUpload = toBool(data.canUpload);
				const canUploadPics = toBool(data.canUploadPictures);
				const canUploadDocs = toBool(data.canUploadDocuments);
				
				console.log('[useAccess] Setting permissions - canUpload:', canUpload, 'canUploadPictures:', canUploadPics, 'canUploadDocuments:', canUploadDocs);
				console.log('[useAccess] Raw values - canUpload:', data.canUpload, 'canUploadPictures:', data.canUploadPictures, 'canUploadDocuments:', data.canUploadDocuments);
				
				setPermissions({
					accessLevel: data.accessLevel,
					isAdmin: data.isAdmin === true || data.isAdmin === 1,
					canUpload: canUpload,
					canUploadPictures: canUploadPics,
					canUploadDocuments: canUploadDocs,
					canManageCategories: toBool(data.canManageCategories),
					canManageSubCategories: toBool(data.canManageSubCategories),
					accessAdd: toBool(data.accessAdd),
					accessEdit: toBool(data.accessEdit),
					accessDelete: toBool(data.accessDelete),
					accessReports: toBool(data.accessReports),
					userLoginLogs: toBool(data.userLoginLogs),
					trackingSection: data.trackingSection !== false && data.trackingSection !== 0,
					trainingSection: data.trainingSection !== false && data.trainingSection !== 0,
					accessSecurity: toBool(data.accessSecurity),
					accessLinks: toBool(data.accessLinks),
					accessSecurityUpdates: toBool(data.accessSecurityUpdates),
					accessNews: toBool(data.accessNews),
					accessSecurityIncidentsData: toBool(data.accessSecurityIncidentsData),
					loading: false,
					error: null
				});
			} else {
				setPermissions({
					accessLevel: null,
					isAdmin: false,
					canUpload: false,
					canUploadPictures: false,
					canUploadDocuments: false,
					canManageCategories: false,
					canManageSubCategories: false,
					accessAdd: false,
					accessEdit: false,
					accessDelete: false,
					accessReports: false,
					userLoginLogs: false,
					trackingSection: false,
					trainingSection: false,
					accessSecurity: false,
					accessLinks: false,
					accessSecurityUpdates: false,
					accessNews: false,
					accessSecurityIncidentsData: false,
					loading: false,
					error: data.message || "Failed to check access"
				});
			}
		} catch (error) {
			setPermissions({
				accessLevel: null,
				isAdmin: false,
				canUpload: false,
				canUploadPictures: false,
				canUploadDocuments: false,
				canManageCategories: false,
				canManageSubCategories: false,
				accessAdd: false,
				accessEdit: false,
				accessDelete: false,
				accessReports: false,
				userLoginLogs: false,
				trackingSection: false,
				trainingSection: false,
				accessSecurity: false,
				accessLinks: false,
				accessSecurityUpdates: false,
				accessNews: false,
				accessSecurityIncidentsData: false,
				loading: false,
				error: "Error checking access permissions"
			});
			console.error("Error checking access:", error);
		}
	};

	const refreshAccess = () => {
		if (userId) {
			checkAccess(userId);
		}
	};

	return {
		...permissions,
		refreshAccess
	};
}
