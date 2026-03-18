import ParoaGisMapContent from "@/components/remote-monitoring/ParoaGisMapContent";

export default function ParoaGisMapStandalonePage() {
	return (
		<div className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-none">
				<ParoaGisMapContent showBackButton={false} legendDisplayMode="modal" />
			</div>
		</div>
	);
}
