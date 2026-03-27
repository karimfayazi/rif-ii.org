import KmzStandaloneGisPageShell from "@/components/remote-monitoring/KmzStandaloneGisPageShell";
import { PAHARPUR_KMZ_STANDALONE_CONFIG } from "@/config/gis/kmz-standalone-sites";

export default function PaharpurGisMapStandalonePage() {
	return <KmzStandaloneGisPageShell config={PAHARPUR_KMZ_STANDALONE_CONFIG} />;
}
