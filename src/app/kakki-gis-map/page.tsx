import KmzStandaloneGisPageShell from "@/components/remote-monitoring/KmzStandaloneGisPageShell";
import { KAKKI_KMZ_STANDALONE_CONFIG } from "@/config/gis/kmz-standalone-sites";

export default function KakkiGisMapStandalonePage() {
	return <KmzStandaloneGisPageShell config={KAKKI_KMZ_STANDALONE_CONFIG} />;
}
