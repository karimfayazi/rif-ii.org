import ReportUploadPage from "@/components/reports/ReportUploadPage";

export default function TestingReportPage() {
	return (
		<ReportUploadPage 
			title="Testing Report" 
			backLink="/dashboard/remote-monitoring" 
			backLinkText="Back to Remote Monitoring" 
		/>
	);
}
