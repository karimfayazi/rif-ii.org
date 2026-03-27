import type { KmzStandaloneSiteConfig } from "@/config/gis/kmz-standalone-sites";
import ParoaGisMapContent from "@/components/remote-monitoring/ParoaGisMapContent";

export default function KmzStandaloneGisPageShell({ config }: { config: KmzStandaloneSiteConfig }) {
	return (
		<div className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-none">
				<ParoaGisMapContent
					showBackButton={false}
					legendDisplayMode="modal"
					enableMapExport
					title={config.title}
					description={config.description}
					kmzApiPath={config.kmzApiPath}
					legendsModalBrandLabel={config.legendsModalBrandLabel}
					exportFileBasePrefix={config.exportFileBasePrefix}
					kmzLayerFileOrder={config.kmzLayerFileOrder}
					kmzDisplayNamesByFile={config.kmzDisplayNamesByFile}
					kmzLayerColorsByFile={config.kmzLayerColorsByFile}
				/>
			</div>
		</div>
	);
}
