'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, ChevronRight, Building2, Droplet, Trash2, Layers, Map as MapIcon } from 'lucide-react';

type MapType = {
	id: string;
	name: string;
	type: 'boundary' | 'water' | 'sw' | 'projectarea';
	icon: React.ComponentType<{ className?: string }>;
	color: string;
	file: string;
};

type Tehsil = {
	id: string;
	name: string;
	district: 'Bannu' | 'DIK';
	maps: MapType[];
};

type District = {
	id: string;
	name: string;
	tehsils: Tehsil[];
};

const districts: District[] = [
	{
		id: 'bannu',
		name: 'Bannu District',
		tehsils: [
			{
				id: 'domel',
				name: 'Domel',
				district: 'Bannu',
				maps: [
					{ id: 'domel-boundary', name: 'VC Boundary', type: 'boundary', icon: MapPin, color: 'bg-blue-500', file: 'Domel_VC_Boundary_WGS84.json' },
					{ id: 'domel-water', name: 'Water Infrastructure', type: 'water', icon: Droplet, color: 'bg-cyan-500', file: 'Domel_VC_Water_WGS84.json' },
					{ id: 'domel-sw', name: 'Solid Waste', type: 'sw', icon: Trash2, color: 'bg-red-500', file: 'Domel_VC_SW_WGS84.json' },
					{ id: 'domel-project', name: 'Project Area', type: 'projectarea', icon: Layers, color: 'bg-green-500', file: 'Domel_VC_ProjectArea_WGS84.json' },
				]
			},
			{
				id: 'kakki',
				name: 'Kakki',
				district: 'Bannu',
				maps: [
					{ id: 'kakki-boundary', name: 'VC Boundary', type: 'boundary', icon: MapPin, color: 'bg-blue-500', file: 'Kakki_VC_Boundary.json' },
				]
			},
			{
				id: 'kulachi',
				name: 'Kulachi',
				district: 'Bannu',
				maps: [
					{ id: 'kulachi-boundary', name: 'NC Boundary', type: 'boundary', icon: MapPin, color: 'bg-blue-500', file: 'Kulachi_NC_Boundary.json' },
					{ id: 'kulachi-water', name: 'Water Infrastructure', type: 'water', icon: Droplet, color: 'bg-cyan-500', file: 'Kulachi_NC_Water.json' },
				]
			},
			{
				id: 'paniala',
				name: 'Paniala',
				district: 'Bannu',
				maps: [
					{ id: 'paniala-boundary', name: 'NC Boundary', type: 'boundary', icon: MapPin, color: 'bg-blue-500', file: 'Paniala_NC_Boundary.json' },
					{ id: 'paniala-water', name: 'Water Infrastructure', type: 'water', icon: Droplet, color: 'bg-cyan-500', file: 'Paniala_NC_Water_WGS84.json' },
					{ id: 'paniala-sw', name: 'Solid Waste', type: 'sw', icon: Trash2, color: 'bg-red-500', file: 'Paniala_NC_SW_WGS84.json' },
				]
			},
			{
				id: 'wazir',
				name: 'SubDiviWazir',
				district: 'Bannu',
				maps: [
					{ id: 'wazir-boundary', name: 'VC Boundary', type: 'boundary', icon: MapPin, color: 'bg-blue-500', file: 'SubDiviWazir_VC_Boundary_WGS84.json' },
					{ id: 'wazir-water', name: 'Water Infrastructure', type: 'water', icon: Droplet, color: 'bg-cyan-500', file: 'SubDiviWazir_VC_Water_WGS84.json' },
					{ id: 'wazir-project', name: 'Project Area', type: 'projectarea', icon: Layers, color: 'bg-green-500', file: 'SubDiviWazir_VC_ProjectArea_WGS84.json' },
				]
			},
		]
	},
	{
		id: 'dik',
		name: 'DIK District',
		tehsils: [
			{
				id: 'daraban',
				name: 'Daraban',
				district: 'DIK',
				maps: [
					{ id: 'daraban-boundary', name: 'NC Boundary', type: 'boundary', icon: MapPin, color: 'bg-blue-500', file: 'Daraban_NC_Boundary.json' },
					{ id: 'daraban-water', name: 'Water Infrastructure', type: 'water', icon: Droplet, color: 'bg-cyan-500', file: 'Daraban_NC_Water.json' },
				]
			},
			{
				id: 'darazinda',
				name: 'Darazinda',
				district: 'DIK',
				maps: [
					{ id: 'darazinda-boundary', name: 'NC Boundary', type: 'boundary', icon: MapPin, color: 'bg-blue-500', file: 'Darazinda_NC_Boundary_WGS84.json' },
					{ id: 'darazinda-water', name: 'Water Infrastructure', type: 'water', icon: Droplet, color: 'bg-cyan-500', file: 'Darazinda_NC_Water_WGS84.json' },
				]
			},
			{
				id: 'paharpur',
				name: 'Paharpur',
				district: 'DIK',
				maps: [
					{ id: 'paharpur-boundary', name: 'NC Boundary', type: 'boundary', icon: MapPin, color: 'bg-blue-500', file: 'Paharpur_NC_Boundary_WGS84.json' },
					{ id: 'paharpur-water', name: 'Water Infrastructure', type: 'water', icon: Droplet, color: 'bg-cyan-500', file: 'Paharpur_NC_Water_WGS84.json' },
					{ id: 'paharpur-sw', name: 'Solid Waste', type: 'sw', icon: Trash2, color: 'bg-red-500', file: 'Paharpur_NC_Sw_WGS84.json' },
				]
			},
			{
				id: 'paroa',
				name: 'Paroa',
				district: 'DIK',
				maps: [
					{ id: 'paroa-boundary', name: 'NC Boundary', type: 'boundary', icon: MapPin, color: 'bg-blue-500', file: 'Paroa_NC_Boundary_WGS84.json' },
					{ id: 'paroa-water', name: 'Water Infrastructure', type: 'water', icon: Droplet, color: 'bg-cyan-500', file: 'Paroa_NC_Water_WGS84.json' },
					{ id: 'paroa-sw', name: 'Solid Waste', type: 'sw', icon: Trash2, color: 'bg-red-500', file: 'Paroa_NC_SW_WGS84.json' },
				]
			},
		]
	}
];

export default function MapsMasterPage() {
	const router = useRouter();
	const [expandedDistricts, setExpandedDistricts] = useState<{ [key: string]: boolean }>({
		'bannu': true,
		'dik': true
	});
	const [expandedTehsils, setExpandedTehsils] = useState<{ [key: string]: boolean }>({});

	const toggleDistrict = (districtId: string) => {
		setExpandedDistricts(prev => ({ ...prev, [districtId]: !prev[districtId] }));
	};

	const toggleTehsil = (tehsilId: string) => {
		setExpandedTehsils(prev => ({ ...prev, [tehsilId]: !prev[tehsilId] }));
	};

	const getMapUrl = (district: string, tehsil: string, file: string) => {
		const districtPath = district === 'Bannu' ? 'Bannu' : 'DIK';
		// Determine map type from filename
		let mapType = 'boundary';
		if (file.toLowerCase().includes('water')) mapType = 'water';
		else if (file.toLowerCase().includes('sw') || file.toLowerCase().includes('solid')) mapType = 'sw';
		else if (file.toLowerCase().includes('project')) mapType = 'projectarea';
		
		return `/dashboard/maps/view?district=${districtPath}&tehsil=${tehsil}&file=${encodeURIComponent(file)}&type=${mapType}`;
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">GIS Maps Master</h1>
					<p className="text-gray-600 mt-2">Browse and access all district, tehsil, and NC/VC maps</p>
				</div>
				<button
					onClick={() => router.push('/dashboard/maps/testing-gis')}
					className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0b4d2b] rounded-lg hover:bg-[#0a3d24] transition-colors shadow-sm hover:shadow-md"
				>
					Testing GIS
				</button>
			</div>

			{/* Districts */}
			<div className="space-y-4">
				{districts.map((district) => (
					<div key={district.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
						{/* District Header */}
						<button
							onClick={() => toggleDistrict(district.id)}
							className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
						>
							<div className="flex items-center space-x-4">
								<div className="p-3 bg-[#0b4d2b]/10 rounded-lg">
									<MapIcon className="h-6 w-6 text-[#0b4d2b]" />
								</div>
								<div className="text-left">
									<h2 className="text-xl font-semibold text-gray-900">{district.name}</h2>
									<p className="text-sm text-gray-600 mt-1">{district.tehsils.length} Tehsils</p>
								</div>
							</div>
							<ChevronRight
								className={`h-5 w-5 text-gray-400 transition-transform ${
									expandedDistricts[district.id] ? 'rotate-90' : ''
								}`}
							/>
						</button>

						{/* Tehsils */}
						{expandedDistricts[district.id] && (
							<div className="border-t border-gray-200 divide-y divide-gray-200">
								{district.tehsils.map((tehsil) => (
									<div key={tehsil.id}>
										<button
											onClick={() => toggleTehsil(tehsil.id)}
											className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
										>
											<div className="flex items-center space-x-3">
												<div className="p-2 bg-blue-50 rounded-lg">
													<Building2 className="h-5 w-5 text-blue-600" />
												</div>
												<div className="text-left">
													<h3 className="text-lg font-medium text-gray-900">{tehsil.name} Tehsil</h3>
													<p className="text-sm text-gray-600 mt-0.5">{tehsil.maps.length} Maps Available</p>
												</div>
											</div>
											<ChevronRight
												className={`h-4 w-4 text-gray-400 transition-transform ${
													expandedTehsils[tehsil.id] ? 'rotate-90' : ''
												}`}
											/>
										</button>

										{/* Maps */}
										{expandedTehsils[tehsil.id] && (
											<div className="bg-gray-50 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
												{tehsil.maps.map((map) => {
													const Icon = map.icon;
													return (
														<Link
															key={map.id}
															href={getMapUrl(tehsil.district, tehsil.id, map.file)}
															className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-[#0b4d2b] hover:shadow-md transition-all"
														>
															<div className="flex items-start space-x-3">
																<div className={`p-2 ${map.color} rounded-lg text-white`}>
																	<Icon className="h-5 w-5" />
																</div>
																<div className="flex-1 min-w-0">
																	<h4 className="text-sm font-semibold text-gray-900 group-hover:text-[#0b4d2b] transition-colors">
																		{map.name}
																	</h4>
																	<p className="text-xs text-gray-500 mt-1 capitalize">
																		{map.type === 'sw' ? 'Solid Waste' : map.type === 'projectarea' ? 'Project Area' : map.type}
																	</p>
																</div>
																<ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#0b4d2b] transition-colors flex-shrink-0 mt-1" />
															</div>
														</Link>
													);
												})}
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				))}
			</div>

			{/* Legend */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
				<h3 className="text-sm font-semibold text-blue-900 mb-4">Map Types</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div className="flex items-center space-x-2">
						<div className="p-2 bg-blue-500 rounded-lg text-white">
							<MapPin className="h-4 w-4" />
						</div>
						<span className="text-sm text-blue-800">Boundary</span>
					</div>
					<div className="flex items-center space-x-2">
						<div className="p-2 bg-cyan-500 rounded-lg text-white">
							<Droplet className="h-4 w-4" />
						</div>
						<span className="text-sm text-blue-800">Water</span>
					</div>
					<div className="flex items-center space-x-2">
						<div className="p-2 bg-red-500 rounded-lg text-white">
							<Trash2 className="h-4 w-4" />
						</div>
						<span className="text-sm text-blue-800">Solid Waste</span>
					</div>
					<div className="flex items-center space-x-2">
						<div className="p-2 bg-green-500 rounded-lg text-white">
							<Layers className="h-4 w-4" />
						</div>
						<span className="text-sm text-blue-800">Project Area</span>
					</div>
				</div>
			</div>
		</div>
	);
}

