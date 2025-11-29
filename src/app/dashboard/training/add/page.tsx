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
	ArrowLeft as PrevIcon
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
	const { isAdmin, loading: accessLoading } = useAccess(userId);

	const [formData, setFormData] = useState<TrainingFormData>({});
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(isEditMode);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [currentStep, setCurrentStep] = useState(1);
	const totalSteps = 5;

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
		setFormData(prev => ({
			...prev,
			[name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
		}));
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const url = isEditMode ? '/api/training/update' : '/api/training/add';
			const method = isEditMode ? 'PUT' : 'POST';
			
			const dataToSave = {
				...(isEditMode && { id: formData.id }),
				...formData,
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

	if (!isAdmin) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
					<p className="text-gray-600">You need admin privileges to {isEditMode ? 'edit' : 'add'} training events.</p>
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
									<label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
									<input
										type="text"
										name="eventType"
										value={formData.eventType || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Output</label>
									<input
										type="text"
										name="output"
										value={formData.output || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Sub No</label>
									<input
										type="text"
										name="subNo"
										value={formData.subNo || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Sub Activity Name</label>
									<input
										type="text"
										name="subActivityName"
										value={formData.subActivityName || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Training Facilitator</label>
									<select
										name="trainingFacilitatorName"
										value={formData.trainingFacilitatorName || ""}
										onChange={handleInputChange}
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
									<label className="block text-sm font-medium text-gray-700 mb-1">District</label>
									<input
										type="text"
										name="district"
										value={formData.district || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Location Tehsil</label>
									<input
										type="text"
										name="locationTehsil"
										value={formData.locationTehsil || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
									<input
										type="text"
										name="venue"
										value={formData.venue || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
									<input
										type="date"
										name="startDate"
										value={formData.startDate || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
									<input
										type="date"
										name="endDate"
										value={formData.endDate || ""}
										onChange={handleInputChange}
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
									<label className="block text-sm font-medium text-gray-700 mb-1">TMA Male</label>
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
									<label className="block text-sm font-medium text-gray-700 mb-1">TMA Female</label>
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
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Activity Completion Report Link</label>
									<input
										type="text"
										name="activityCompletionReportLink"
										value={formData.activityCompletionReportLink || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Participant List Attachment</label>
									<input
										type="text"
										name="participantListAttachment"
										value={formData.participantListAttachment || ""}
										onChange={handleInputChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Picture Attachment</label>
									<input
										type="text"
										name="pictureAttachment"
										value={formData.pictureAttachment || ""}
										onChange={handleInputChange}
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
								disabled={loading}
								className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
							>
								{loading ? (
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

