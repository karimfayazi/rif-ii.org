"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
	ArrowLeft, 
	Save, 
	AlertCircle, 
	CheckCircle, 
	Loader2, 
	ArrowRight,
	ArrowLeft as PrevIcon,
	Upload,
	X,
	FileText,
	Image as ImageIcon
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";

const TRAINING_FACILITATOR_OPTIONS = [
	"Nasrullah/Rehana",
	"Nasrullah/Asia",
	"Dr. Gohar Ali",
	"Nasrullah"
];

type TrainingFormData = {
	id?: number;
	trainingTitle?: string;
	output?: string;
	subNo?: string;
	subActivityName?: string;
	eventType?: string;
	sector?: string;
	venue?: string;
	locationTehsil?: string;
	district?: string;
	startDate?: string;
	endDate?: string;
	trainingFacilitatorName?: string;
	tmaMale?: number;
	tmaFemale?: number;
	phedMale?: number;
	phedFemale?: number;
	lgrdMale?: number;
	lgrdFemale?: number;
	pddMale?: number;
	pddFemale?: number;
	communityMale?: number;
	communityFemale?: number;
	anyOtherMale?: number;
	anyOtherFemale?: number;
	anyOtherSpecify?: string;
	preTrainingEvaluation?: string;
	postTrainingEvaluation?: string;
	eventAgendas?: string;
	expectedOutcomes?: string;
	challengesFaced?: string;
	suggestedActions?: string;
	activityCompletionReportLink?: string;
	participantListAttachment?: string;
	pictureAttachment?: string;
	externalLinks?: string;
	remarks?: string;
	dataCompilerName?: string;
	dataVerifiedBy?: string;
};

export default function AddTrainingPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const id = searchParams.get('id');
	const isEditMode = !!id;
	
	const { user, getUserId } = useAuth();
	const userId = user?.id || getUserId();
	const { accessAdd, trainingSection, loading: accessLoading } = useAccess(userId);

	const [formData, setFormData] = useState<TrainingFormData>({});
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(isEditMode);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [currentStep, setCurrentStep] = useState(1);
	const totalSteps = 5;
	
	// File upload states
	const [reportFile, setReportFile] = useState<File | null>(null);
	const [participantListFile, setParticipantListFile] = useState<File | null>(null);
	const [pictureFiles, setPictureFiles] = useState<File[]>([]);
	const [uploadingFiles, setUploadingFiles] = useState(false);

	// Tehsils data based on district
	const districtTehsils: Record<string, string[]> = {
		'DIK': [
			'Dera Ismail Khan Tehsil',
			'Paharpur Tehsil',
			'Paroa Tehsil',
			'Kulachi Tehsil',
			'Daraban Tehsil',
			'Local Area (Ex-FR DI Khan) Tehsil'
		],
		'Bannu': [
			'Bannu Tehsil',
			'Domel Tehsil',
			'Kakki Tehsil',
			'Baka Khel Tehsil',
			'Miryan Tehsil',
			'Wazir Tehsil'
		]
	};

	const availableTehsils = formData.district ? (districtTehsils[formData.district] || []) : [];

	// Fetch existing data if editing
	useEffect(() => {
		if (isEditMode && id) {
			fetchTrainingData();
		}
	}, [isEditMode, id]);

	const fetchTrainingData = async () => {
		try {
			setFetching(true);
			const response = await fetch(`/api/training?id=${id}`);
			const data = await response.json();

			if (data.success && data.trainingData) {
				const training = data.trainingData;
				setFormData({
					id: training.SN,
					trainingTitle: training.TrainingTitle || "",
					output: training.Output || "",
					subNo: training.SubNo || "",
					subActivityName: training.SubActivityName || "",
					eventType: training.EventType || "",
					sector: training.Sector || "",
					venue: training.Venue || "",
					locationTehsil: training.LocationTehsil || "",
					district: training.District || "",
					startDate: training.StartDate ? (() => {
						const parts = training.StartDate.split('/');
						if (parts.length === 3) {
							return `${parts[2]}-${parts[1]}-${parts[0]}`;
						}
						return "";
					})() : "",
					endDate: training.EndDate ? (() => {
						const parts = training.EndDate.split('/');
						if (parts.length === 3) {
							return `${parts[2]}-${parts[1]}-${parts[0]}`;
						}
						return "";
					})() : "",
					trainingFacilitatorName: training.TrainingFacilitatorName || "",
					tmaMale: training.TMAMale || 0,
					tmaFemale: training.TMAFemale || 0,
					phedMale: training.PHEDMale || 0,
					phedFemale: training.PHEDFemale || 0,
					lgrdMale: training.LGRDMale || 0,
					lgrdFemale: training.LGRDFemale || 0,
					pddMale: training.PDDMale || 0,
					pddFemale: training.PDDFemale || 0,
					communityMale: training.CommunityMale || 0,
					communityFemale: training.CommunityFemale || 0,
					anyOtherMale: training.AnyOtherMale || 0,
					anyOtherFemale: training.AnyOtherFemale || 0,
					anyOtherSpecify: training.AnyOtherSpecify || "",
					preTrainingEvaluation: training.PreTrainingEvaluation || "",
					postTrainingEvaluation: training.PostTrainingEvaluation || "",
					eventAgendas: training.EventAgendas || "",
					expectedOutcomes: training.ExpectedOutcomes || "",
					challengesFaced: training.ChallengesFaced || "",
					suggestedActions: training.SuggestedActions || "",
					activityCompletionReportLink: training.ActivityCompletionReportLink || "",
					participantListAttachment: training.ParticipantListAttachment || "",
					pictureAttachment: training.PictureAttachment || "",
					externalLinks: training.External_Links || "",
					remarks: training.Remarks || "",
					dataCompilerName: training.DataCompilerName || "",
					dataVerifiedBy: training.DataVerifiedBy || "",
				});
			}
		} catch (err) {
			console.error("Error fetching training data:", err);
			setError("Failed to load training data");
		} finally {
			setFetching(false);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		const { name, value, type } = e.target;
		
		// Clear tehsil when district changes
		if (name === 'district') {
			setFormData(prev => ({
				...prev,
				[name]: value,
				locationTehsil: '' // Clear tehsil when district changes
			}));
		} else {
			setFormData(prev => ({
				...prev,
				[name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
			}));
		}
	};

	const nextStep = () => {
		if (currentStep < totalSteps) {
			setCurrentStep(currentStep + 1);
		}
	};

	const prevStep = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const uploadFile = async (fileType: 'report' | 'participantList' | 'pictures', file?: File, files?: File[]) => {
		const uploadFormData = new FormData();
		uploadFormData.append('fileType', fileType);
		uploadFormData.append('trainingTitle', formData.trainingTitle || '');
		uploadFormData.append('trainingSN', formData.id?.toString() || '');

		if (fileType === 'pictures' && files) {
			files.forEach((f) => {
				uploadFormData.append('files', f);
			});
		} else if (file) {
			uploadFormData.append('file', file);
		}

		const response = await fetch('/api/training/upload', {
			method: 'POST',
			body: uploadFormData,
		});

		const result = await response.json();
		if (!result.success) {
			throw new Error(result.message || 'Failed to upload file');
		}

		return result.filePath || result.uploadedFiles?.[0]?.filePath || '';
	};

	const validateForm = (): string | null => {
		// Validate Step 1: Basic Information
		if (!formData.trainingTitle || formData.trainingTitle.trim() === '') {
			return 'Training Title is required';
		}
		if (!formData.eventType || formData.eventType.trim() === '') {
			return 'Event Type is required';
		}
		if (!formData.output || formData.output.trim() === '') {
			return 'Output is required';
		}
		if (!formData.subNo || formData.subNo.trim() === '') {
			return 'Sub No is required';
		}
		if (!formData.subActivityName || formData.subActivityName.trim() === '') {
			return 'Sub Activity Name is required';
		}
		if (!formData.trainingFacilitatorName || formData.trainingFacilitatorName.trim() === '') {
			return 'Training Facilitator is required';
		}

		// Validate Step 2: Location & Dates
		if (!formData.district || formData.district.trim() === '') {
			return 'District is required';
		}
		if (!formData.locationTehsil || formData.locationTehsil.trim() === '') {
			return 'Location Tehsil is required';
		}
		if (!formData.venue || formData.venue.trim() === '') {
			return 'Venue is required';
		}
		if (!formData.startDate || formData.startDate.trim() === '') {
			return 'Start Date is required';
		}
		if (!formData.endDate || formData.endDate.trim() === '') {
			return 'End Date is required';
		}

		// Validate Step 5: File Uploads (required for both new and edit)
		const hasReport = reportFile || (formData.activityCompletionReportLink && formData.activityCompletionReportLink.trim() !== '');
		if (!hasReport) {
			return 'Activity Completion Report is required. Please upload a PDF or DOC file.';
		}
		
		const hasParticipantList = participantListFile || (formData.participantListAttachment && formData.participantListAttachment.trim() !== '');
		if (!hasParticipantList) {
			return 'Participant List Attachment is required. Please upload a PDF or DOC file.';
		}
		
		const hasPictures = (pictureFiles.length >= 5) || (formData.pictureAttachment && formData.pictureAttachment.trim() !== '');
		if (!hasPictures) {
			if (pictureFiles.length > 0 && pictureFiles.length < 5) {
				return 'At least 5 pictures are required. Please upload more pictures.';
			}
			return 'At least 5 pictures are required. Please upload pictures.';
		}

		return null;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			// Validate all required fields
			const validationError = validateForm();
			if (validationError) {
				setError(`Please complete data before save. ${validationError}`);
				setLoading(false);
				return;
			}

			let trainingSN = formData.id?.toString() || '';

			// For new records, save first to get SN
			if (!isEditMode) {
				const url = '/api/training/add';
				const dataToSave = {
					...formData,
					activityCompletionReportLink: formData.activityCompletionReportLink || '',
					participantListAttachment: formData.participantListAttachment || '',
					pictureAttachment: formData.pictureAttachment || '',
					dataCompilerName: formData.dataCompilerName || userId
				};

				const response = await fetch(url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(dataToSave),
				});

				const result = await response.json();

				if (!result.success) {
					throw new Error(result.message || 'Failed to save record');
				}

				// Get the SN from the response
				if (result.sn) {
					trainingSN = result.sn.toString();
					setFormData(prev => ({ ...prev, id: parseInt(trainingSN) }));
				} else {
					throw new Error('Failed to get record ID');
				}
			}

			// Upload files
			setUploadingFiles(true);
			let reportPath = formData.activityCompletionReportLink || '';
			let participantListPath = formData.participantListAttachment || '';
			let picturePath = formData.pictureAttachment || '';

			// Upload Activity Completion Report
			if (reportFile) {
				reportPath = await uploadFile('report', reportFile);
			}

			// Upload Participant List
			if (participantListFile) {
				participantListPath = await uploadFile('participantList', participantListFile);
			}

			// Upload Pictures (at least 5 required)
			if (pictureFiles.length >= 5) {
				picturePath = await uploadFile('pictures', undefined, pictureFiles);
			}

			setUploadingFiles(false);

			// Update training event with file paths (for both new and edit)
			const url = isEditMode ? '/api/training/update' : '/api/training/update';
			const method = 'PUT';
			
			const dataToSave = {
				id: isEditMode ? formData.id : parseInt(trainingSN),
				...formData,
				activityCompletionReportLink: reportPath,
				participantListAttachment: participantListPath,
				pictureAttachment: picturePath,
				dataCompilerName: formData.dataCompilerName || userId
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
					router.push('/dashboard/training');
				}, 2000);
			} else {
				throw new Error(result.message || 'Failed to save record');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			setUploadingFiles(false);
		} finally {
			setLoading(false);
		}
	};

	const getStepTitle = (step: number) => {
		switch (step) {
			case 1: return "Basic Information";
			case 2: return "Location & Dates";
			case 3: return "Participants";
			case 4: return "Event Details";
			case 5: return "Additional Information";
			default: return "";
		}
	};

	if (accessLoading || fetching) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b] mx-auto mb-4" />
					<p className="text-gray-600">{isEditMode ? "Loading training data..." : "Loading..."}</p>
				</div>
			</div>
		);
	}

	if (!trainingSection) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
					<p className="text-gray-600">You do not have access to the Training Section. Please contact your administrator.</p>
					<button
						onClick={() => router.push('/dashboard')}
						className="mt-4 px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24]"
					>
						Back to Dashboard
					</button>
				</div>
			</div>
		);
	}

	if (!accessAdd || !trainingSection) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
					<p className="text-gray-600">You do not have permission to {isEditMode ? 'edit' : 'add'} training events. Please contact your administrator.</p>
					<button
						onClick={() => router.push('/dashboard/training')}
						className="mt-4 px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24]"
					>
						Back to Training
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
									{isEditMode ? 'Edit Training Event' : 'Add New Training Event'}
								</h1>
								<p className="text-sm text-gray-600 mt-1">
									{getStepTitle(currentStep)} - Step {currentStep} of {totalSteps}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Progress Bar */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between mb-2">
						{Array.from({ length: totalSteps }, (_, i) => (
							<div key={i} className="flex items-center">
								<div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
									i + 1 <= currentStep 
										? 'bg-[#0b4d2b] text-white' 
										: 'bg-gray-200 text-gray-600'
								}`}>
									{i + 1}
								</div>
								{i < totalSteps - 1 && (
									<div className={`w-12 h-1 mx-2 ${
										i + 1 < currentStep ? 'bg-[#0b4d2b]' : 'bg-gray-200'
									}`} />
								)}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{success && (
					<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center mb-6">
						<CheckCircle className="h-5 w-5 text-green-500 mr-2" />
						<span className="text-green-700 font-medium">
							Training event {isEditMode ? 'updated' : 'added'} successfully! Redirecting...
						</span>
					</div>
				)}

				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
						<AlertCircle className="h-5 w-5 text-red-500 mr-2" />
						<span className="text-red-700">{error}</span>
					</div>
				)}

				<form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					{/* Step 1: Basic Information */}
					{currentStep === 1 && (
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Training Title *</label>
									<input
										type="text"
										name="trainingTitle"
										value={formData.trainingTitle || ""}
										onChange={handleInputChange}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
									<select
										name="eventType"
										value={formData.eventType || ""}
										onChange={handleInputChange}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									>
										<option value="">Select Event Type</option>
										<option value="Workshop">Workshop</option>
										<option value="Training">Training</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
									<input
										type="text"
										name="sector"
										value={formData.sector || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Output *</label>
									<input
										type="text"
										name="output"
										value={formData.output || ""}
										onChange={handleInputChange}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Sub No *</label>
									<input
										type="text"
										name="subNo"
										value={formData.subNo || ""}
										onChange={handleInputChange}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Sub Activity Name *</label>
									<input
										type="text"
										name="subActivityName"
										value={formData.subActivityName || ""}
										onChange={handleInputChange}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Training Facilitator *</label>
									<select
										name="trainingFacilitatorName"
										value={formData.trainingFacilitatorName || ""}
										onChange={handleInputChange}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									>
										<option value="">Select Training Facilitator</option>
										{TRAINING_FACILITATOR_OPTIONS.map((facilitator) => (
											<option key={facilitator} value={facilitator}>
												{facilitator}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>
					)}

					{/* Step 2: Location & Dates */}
					{currentStep === 2 && (
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">Location & Dates</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
									<select
										name="district"
										value={formData.district || ""}
										onChange={handleInputChange}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									>
										<option value="">Select District</option>
										<option value="DIK">DIK</option>
										<option value="Bannu">Bannu</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Location Tehsil *</label>
									<select
										name="locationTehsil"
										value={formData.locationTehsil || ""}
										onChange={handleInputChange}
										disabled={!formData.district || availableTehsils.length === 0}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
									>
										<option value="">
											{!formData.district ? "Select District first" : "Select Tehsil"}
										</option>
										{availableTehsils.map((tehsil) => (
											<option key={tehsil} value={tehsil}>
												{tehsil}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
									<input
										type="text"
										name="venue"
										value={formData.venue || ""}
										onChange={handleInputChange}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
									<input
										type="date"
										name="startDate"
										value={formData.startDate || ""}
										onChange={handleInputChange}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
									<input
										type="date"
										name="endDate"
										value={formData.endDate || ""}
										onChange={handleInputChange}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
							</div>
						</div>
					)}

					{/* Step 3: Participants */}
					{currentStep === 3 && (
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="col-span-2 font-semibold text-gray-700">TMA</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">MA Male</label>
									<input
										type="number"
										name="tmaMale"
										value={formData.tmaMale || 0}
										onChange={handleInputChange}
										min="0"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">MA Female</label>
									<input
										type="number"
										name="tmaFemale"
										value={formData.tmaFemale || 0}
										onChange={handleInputChange}
										min="0"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div className="col-span-2 font-semibold text-gray-700 mt-4">PHED</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">PHED Male</label>
									<input
										type="number"
										name="phedMale"
										value={formData.phedMale || 0}
										onChange={handleInputChange}
										min="0"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">PHED Female</label>
									<input
										type="number"
										name="phedFemale"
										value={formData.phedFemale || 0}
										onChange={handleInputChange}
										min="0"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div className="col-span-2 font-semibold text-gray-700 mt-4">LGRD</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">LGRD Male</label>
									<input
										type="number"
										name="lgrdMale"
										value={formData.lgrdMale || 0}
										onChange={handleInputChange}
										min="0"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">LGRD Female</label>
									<input
										type="number"
										name="lgrdFemale"
										value={formData.lgrdFemale || 0}
										onChange={handleInputChange}
										min="0"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div className="col-span-2 font-semibold text-gray-700 mt-4">PDD</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">PDD Male</label>
									<input
										type="number"
										name="pddMale"
										value={formData.pddMale || 0}
										onChange={handleInputChange}
										min="0"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">PDD Female</label>
									<input
										type="number"
										name="pddFemale"
										value={formData.pddFemale || 0}
										onChange={handleInputChange}
										min="0"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div className="col-span-2 font-semibold text-gray-700 mt-4">Community</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Community Male</label>
									<input
										type="number"
										name="communityMale"
										value={formData.communityMale || 0}
										onChange={handleInputChange}
										min="0"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Community Female</label>
									<input
										type="number"
										name="communityFemale"
										value={formData.communityFemale || 0}
										onChange={handleInputChange}
										min="0"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div className="col-span-2 font-semibold text-gray-700 mt-4">Any Other</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Any Other Male</label>
									<input
										type="number"
										name="anyOtherMale"
										value={formData.anyOtherMale || 0}
										onChange={handleInputChange}
										min="0"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Any Other Female</label>
									<input
										type="number"
										name="anyOtherFemale"
										value={formData.anyOtherFemale || 0}
										onChange={handleInputChange}
										min="0"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div className="col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-1">Any Other Specify</label>
									<input
										type="text"
										name="anyOtherSpecify"
										value={formData.anyOtherSpecify || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
							</div>
						</div>
					)}

					{/* Step 4: Event Details */}
					{currentStep === 4 && (
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Event Agendas</label>
									<textarea
										name="eventAgendas"
										value={formData.eventAgendas || ""}
										onChange={handleInputChange}
										rows={4}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Expected Outcomes</label>
									<textarea
										name="expectedOutcomes"
										value={formData.expectedOutcomes || ""}
										onChange={handleInputChange}
										rows={4}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Challenges Faced</label>
									<textarea
										name="challengesFaced"
										value={formData.challengesFaced || ""}
										onChange={handleInputChange}
										rows={4}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Suggested Actions</label>
									<textarea
										name="suggestedActions"
										value={formData.suggestedActions || ""}
										onChange={handleInputChange}
										rows={4}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Pre Training Evaluation</label>
									<textarea
										name="preTrainingEvaluation"
										value={formData.preTrainingEvaluation || ""}
										onChange={handleInputChange}
										rows={3}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Post Training Evaluation</label>
									<textarea
										name="postTrainingEvaluation"
										value={formData.postTrainingEvaluation || ""}
										onChange={handleInputChange}
										rows={3}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
							</div>
						</div>
					)}

					{/* Step 5: Additional Information */}
					{currentStep === 5 && (
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
							<div className="space-y-6">
								{/* Activity Completion Report Upload */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Activity Completion Report (PDF/DOC/DOCX) *
									</label>
									<div className="mt-1">
										{reportFile ? (
											<div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
												<div className="flex items-center space-x-2">
													<FileText className="h-5 w-5 text-green-600" />
													<span className="text-sm text-gray-700">{reportFile.name}</span>
													<span className="text-xs text-gray-500">
														({(reportFile.size / 1024 / 1024).toFixed(2)} MB)
													</span>
												</div>
												<button
													type="button"
													onClick={() => setReportFile(null)}
													className="text-red-600 hover:text-red-800"
												>
													<X className="h-4 w-4" />
												</button>
											</div>
										) : (
											<label className="flex flex-col items-center justify-center w-full h-32 border-2 border-red-300 border-dashed rounded-lg cursor-pointer bg-red-50 hover:bg-red-100 transition-colors">
												<div className="flex flex-col items-center justify-center pt-5 pb-6">
													<Upload className="h-8 w-8 text-red-400 mb-2" />
													<p className="text-sm text-red-600 mb-1">
														<span className="font-semibold">Click to upload</span> or drag and drop
													</p>
													<p className="text-xs text-red-500">PDF, DOC, or DOCX (MAX. 10MB) - Required</p>
												</div>
												<input
													type="file"
													accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) {
															if (file.size > 10 * 1024 * 1024) {
																setError('File size must be less than 10MB');
																return;
															}
															setReportFile(file);
														}
													}}
													className="hidden"
												/>
											</label>
										)}
									</div>
									{formData.activityCompletionReportLink && !reportFile && (
										<p className="mt-1 text-xs text-gray-500">
											Current: {formData.activityCompletionReportLink}
										</p>
									)}
								</div>

								{/* Participant List Upload */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Participant List Attachment (PDF/DOC/DOCX) *
									</label>
									<div className="mt-1">
										{participantListFile ? (
											<div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
												<div className="flex items-center space-x-2">
													<FileText className="h-5 w-5 text-green-600" />
													<span className="text-sm text-gray-700">{participantListFile.name}</span>
													<span className="text-xs text-gray-500">
														({(participantListFile.size / 1024 / 1024).toFixed(2)} MB)
													</span>
												</div>
												<button
													type="button"
													onClick={() => setParticipantListFile(null)}
													className="text-red-600 hover:text-red-800"
												>
													<X className="h-4 w-4" />
												</button>
											</div>
										) : (
											<label className="flex flex-col items-center justify-center w-full h-32 border-2 border-red-300 border-dashed rounded-lg cursor-pointer bg-red-50 hover:bg-red-100 transition-colors">
												<div className="flex flex-col items-center justify-center pt-5 pb-6">
													<Upload className="h-8 w-8 text-red-400 mb-2" />
													<p className="text-sm text-red-600 mb-1">
														<span className="font-semibold">Click to upload</span> or drag and drop
													</p>
													<p className="text-xs text-red-500">PDF, DOC, or DOCX (MAX. 10MB) - Required</p>
												</div>
												<input
													type="file"
													accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) {
															if (file.size > 10 * 1024 * 1024) {
																setError('File size must be less than 10MB');
																return;
															}
															setParticipantListFile(file);
														}
													}}
													className="hidden"
												/>
											</label>
										)}
									</div>
									{formData.participantListAttachment && !participantListFile && (
										<p className="mt-1 text-xs text-gray-500">
											Current: {formData.participantListAttachment}
										</p>
									)}
								</div>

								{/* Picture Upload (Minimum 5) */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Picture Attachments (Minimum 5 pictures required) *
									</label>
									<div className="mt-1">
										{pictureFiles.length > 0 && (
											<div className="mb-3 grid grid-cols-2 md:grid-cols-3 gap-3">
												{pictureFiles.map((file, index) => (
													<div key={index} className="relative group">
														<div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
															<div className="flex items-center space-x-2 flex-1 min-w-0">
																<ImageIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
																<span className="text-xs text-gray-700 truncate">{file.name}</span>
															</div>
															<button
																type="button"
																onClick={() => {
																	setPictureFiles(pictureFiles.filter((_, i) => i !== index));
																}}
																className="text-red-600 hover:text-red-800 flex-shrink-0 ml-2"
															>
																<X className="h-4 w-4" />
															</button>
														</div>
													</div>
												))}
											</div>
										)}
										<label className="flex flex-col items-center justify-center w-full h-32 border-2 border-red-300 border-dashed rounded-lg cursor-pointer bg-red-50 hover:bg-red-100 transition-colors">
											<div className="flex flex-col items-center justify-center pt-5 pb-6">
												<Upload className="h-8 w-8 text-red-400 mb-2" />
												<p className="text-sm text-red-600 mb-1">
													<span className="font-semibold">Click to upload</span> or drag and drop
												</p>
												<p className="text-xs text-red-500">
													Images (JPEG, PNG, GIF, WEBP) - MAX. 10MB each - Required
												</p>
												<p className="text-xs text-red-600 mt-1 font-semibold">
													{pictureFiles.length} / 5 minimum required
												</p>
											</div>
											<input
												type="file"
												accept="image/*"
												multiple
												onChange={(e) => {
													const files = Array.from(e.target.files || []);
													if (files.length > 0) {
														const validFiles = files.filter(file => {
															if (file.size > 10 * 1024 * 1024) {
																setError(`File ${file.name} is too large (max 10MB)`);
																return false;
															}
															return true;
														});
														setPictureFiles([...pictureFiles, ...validFiles]);
													}
												}}
												className="hidden"
											/>
										</label>
									</div>
									{formData.pictureAttachment && pictureFiles.length === 0 && (
										<p className="mt-1 text-xs text-gray-500">
											Current: {formData.pictureAttachment}
										</p>
									)}
									{pictureFiles.length > 0 && pictureFiles.length < 5 && (
										<p className="mt-1 text-xs text-red-600">
											Please upload at least {5 - pictureFiles.length} more picture(s)
										</p>
									)}
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">External Links</label>
									<input
										type="text"
										name="externalLinks"
										value={formData.externalLinks || ""}
										onChange={handleInputChange}
										placeholder="Enter external links (e.g., https://example.com)"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
									<textarea
										name="remarks"
										value={formData.remarks || ""}
										onChange={handleInputChange}
										rows={4}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Data Compiler Name</label>
									<input
										type="text"
										name="dataCompilerName"
										value={formData.dataCompilerName || userId || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Data Verified By</label>
									<input
										type="text"
										name="dataVerifiedBy"
										value={formData.dataVerifiedBy || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
							</div>
						</div>
					)}

					{/* Navigation Buttons */}
					<div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
						<button
							type="button"
							onClick={prevStep}
							disabled={currentStep === 1}
							className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<PrevIcon className="h-4 w-4 mr-2" />
							Previous
						</button>
						<div className="flex items-center gap-3">
							{currentStep < totalSteps && (
								<button
									type="button"
									onClick={nextStep}
									className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
								>
									Next
									<ArrowRight className="h-4 w-4 ml-2" />
								</button>
							)}
							<button
								type="submit"
								disabled={loading || uploadingFiles || (pictureFiles.length > 0 && pictureFiles.length < 5)}
								className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{uploadingFiles ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Uploading files...
									</>
								) : loading ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Saving...
									</>
								) : (
									<>
										<Save className="h-4 w-4 mr-2" />
										{isEditMode ? 'Update' : 'Save'} Training Event
									</>
								)}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}

