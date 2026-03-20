/** Browser ESM bundle (avoids Node `jspdf.node.min.js` / fflate worker in Next). Types come from the package root. */
declare module "jspdf/dist/jspdf.es.min.js" {
	export { jsPDF } from "jspdf";
}
