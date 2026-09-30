const { getTechnicianHistoryReport } = require('../services/TechnicianHistoryReportService');
const {
  createHistoryDocx, createHistoryPdf, createHistoryXlsx,
} = require('../services/TechnicianHistoryDocumentService');

const builders = {
  pdf: { build: createHistoryPdf, type: 'application/pdf' },
  docx: { build: createHistoryDocx, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  xlsx: { build: createHistoryXlsx, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
};

const download = async (req, res, next) => {
  try {
    const selected = builders[req.params.format];
    if (!selected) return res.status(400).json({ message: 'Formato de historial no válido.' });
    const report = await getTechnicianHistoryReport(req.user.id, req.query.from, req.query.to);
    if (!report.tickets.length) {
      return res.status(404).json({ message: 'No existen trabajos finalizados en el periodo seleccionado.' });
    }
    const buffer = await selected.build(report);
    const filename = `historial-tecnico-${report.range.from}-a-${report.range.to}.${req.params.format}`;
    res.set({
      'Content-Type': selected.type,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache', Expires: '0',
      'X-Report-Design': 'entel-technician-history-v1',
    });
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
};

module.exports = { download };
