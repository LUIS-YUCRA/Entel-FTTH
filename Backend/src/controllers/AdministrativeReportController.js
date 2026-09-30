const { getAdministrativeReport } = require('../services/AdministrativeReportService');
const { createDocx, createPdf, createXlsx } = require('../services/ReportDocumentService');

const show = async (req, res, next) => { try { res.json({ success: true, ...(await getAdministrativeReport(req.query.from, req.query.to)) }); } catch (error) { next(error); } };
const download = async (req, res, next) => {
  try {
    const report = await getAdministrativeReport(req.query.from, req.query.to); const { format } = req.params;
    const builders = { xlsx: createXlsx, docx: createDocx, pdf: createPdf };
    if (!builders[format]) return res.status(400).json({ message: 'Formato no válido.' });
    const types = { xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pdf:'application/pdf' };
    const buffer = await builders[format](report);
    res.set({ 'Content-Type':types[format], 'Content-Disposition':`attachment; filename="reporte-ftth-${report.range.from}-a-${report.range.to}.${format}"`, 'Content-Length':buffer.length, 'Cache-Control':'no-store, no-cache, must-revalidate, private', Pragma:'no-cache', Expires:'0', 'X-Report-Design':'entel-institucional-v2' });
    return res.send(buffer);
  } catch (error) { return next(error); }
};
module.exports = { show, download };
