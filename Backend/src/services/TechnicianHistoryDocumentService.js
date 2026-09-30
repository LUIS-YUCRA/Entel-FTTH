const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun,
  PageNumber, PageOrientation, Packer, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} = require('docx');

const BLUE = '073B6F';
const MID_BLUE = '0B5CAD';
const CYAN = '00A9CE';
const LIGHT = 'F2F7FB';
const DARK = '173C7A';
const GOLD = 'F6A800';
const GREEN = '16865B';
const logoPath = path.resolve(__dirname, '../../../Frontend/src/assets/logo.jpg');
const logo = () => (fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null);
const dateTime = (value) => (value ? new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/La_Paz',
}).format(new Date(value)) : 'No registrada');
const generatedText = (report) => dateTime(report.generatedAt);
const statusText = (value) => String(value || '').replaceAll('_', ' ');
const durationText = (value) => (Number.isFinite(value) ? `${value} h` : 'No calculable');

const addExcelTitle = (sheet, report, title, columnCount) => {
  sheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Aptos Display', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BLUE}` } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 42;
  sheet.mergeCells(2, 1, 2, columnCount);
  const subtitle = sheet.getCell(2, 1);
  subtitle.value = `ENTEL Bolivia · ${report.technician.full_name} · ${report.range.from} al ${report.range.to}`;
  subtitle.font = { name: 'Aptos', size: 10, italic: true, color: { argb: 'FF526B82' } };
  subtitle.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 25;
};

const styleExcelHeader = (row) => {
  row.height = 29;
  row.eachCell((cell) => {
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${MID_BLUE}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: `FF${CYAN}` } } };
  });
};

const configureExcelSheet = (sheet, widths, headerRow = 4) => {
  sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: headerRow, zoomScale: 90 }];
  sheet.columns = widths.map((width) => ({ width }));
  sheet.autoFilter = `${sheet.getColumn(1).letter}${headerRow}:${sheet.getColumn(widths.length).letter}${headerRow}`;
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  sheet.properties.pageSetUpPr = { fitToPage: true };
  sheet.pageMargins = { left: 0.3, right: 0.3, top: 0.55, bottom: 0.55, header: 0.2, footer: 0.2 };
  sheet.headerFooter.oddFooter = '&LENTEL FTTH&CHistorial de trabajos&R&P de &N';
  sheet.pageSetup.printTitlesRow = `1:${headerRow}`;
};

const createHistoryXlsx = async (report) => {
  const book = new ExcelJS.Workbook();
  book.creator = 'Sistema Inteligente de Reclamos FTTH';
  book.company = 'ENTEL Bolivia';
  book.title = `Historial de trabajos · ${report.technician.full_name}`;
  book.subject = 'Trabajos técnicos finalizados';
  book.category = 'Operaciones FTTH';
  book.keywords = 'ENTEL, FTTH, historial, trabajos técnicos';
  book.created = new Date(report.generatedAt);
  book.calcProperties.fullCalcOnLoad = true;

  const summary = book.addWorksheet('Resumen ejecutivo', { properties: { tabColor: { argb: `FF${CYAN}` } } });
  addExcelTitle(summary, report, 'HISTORIAL DE TRABAJOS FINALIZADOS', 8);
  summary.mergeCells('A4:H4');
  summary.getCell('A4').value = `Técnico: ${report.technician.full_name}  ·  Código: ${report.technician.employee_code}  ·  Zona: ${report.technician.zone}  ·  Cuadrilla: ${report.technician.crew}`;
  summary.getCell('A4').font = { name: 'Aptos', size: 10, bold: true, color: { argb: `FF${DARK}` } };
  summary.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF3FB' } };
  summary.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  summary.getRow(4).height = 31;
  const cards = [
    ['A6:B6', 'A7:B8', 'TRABAJOS FINALIZADOS', report.metrics.completed, MID_BLUE],
    ['C6:D6', 'C7:D8', 'CLIENTES ATENDIDOS', report.metrics.customers, CYAN],
    ['E6:F6', 'E7:F8', 'PRIORIDAD ALTA', report.metrics.high_priority, GOLD],
    ['G6:H6', 'G7:H8', 'PROMEDIO DE RESOLUCIÓN', `${report.metrics.average_resolution_hours} h`, GREEN],
  ];
  cards.forEach(([labelRange, valueRange, label, value, color]) => {
    summary.mergeCells(labelRange); summary.mergeCells(valueRange);
    const labelCell = summary.getCell(labelRange.split(':')[0]);
    const valueCell = summary.getCell(valueRange.split(':')[0]);
    labelCell.value = label; valueCell.value = value;
    labelCell.font = { name: 'Aptos', size: 9, bold: true, color: { argb: 'FF64798D' } };
    valueCell.font = { name: 'Aptos Display', size: 22, bold: true, color: { argb: `FF${BLUE}` } };
    [labelCell, valueCell].forEach((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F8FC' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { left: { style: 'medium', color: { argb: `FF${color}` } }, bottom: { style: 'thin', color: { argb: 'FFD8E3ED' } } };
    });
  });
  summary.getRow(6).height = 24; summary.getRow(7).height = 24; summary.getRow(8).height = 24;
  summary.addRow([]);
  summary.addRow(['Estado', 'Cantidad', 'Porcentaje', '', 'Prioridad', 'Cantidad', 'Porcentaje', '']);
  styleExcelHeader(summary.getRow(10));
  const distributionLength = Math.max(report.distributions.status.length, report.distributions.priority.length);
  for (let index = 0; index < distributionLength; index += 1) {
    const status = report.distributions.status[index];
    const priority = report.distributions.priority[index];
    summary.addRow([
      status?.label ? statusText(status.label) : '', status?.value || '', status ? status.value / report.metrics.completed : '', '',
      priority?.label || '', priority?.value || '', priority ? priority.value / report.metrics.completed : '', '',
    ]);
    summary.getCell(11 + index, 3).numFmt = '0%';
    summary.getCell(11 + index, 7).numFmt = '0%';
  }
  summary.columns = [20, 12, 14, 3, 20, 12, 14, 3].map((width) => ({ width }));
  summary.views = [{ showGridLines: false, state: 'frozen', ySplit: 4, zoomScale: 90 }];
  summary.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1, paperSize: 9 };
  summary.headerFooter.oddFooter = '&LENTEL FTTH&CResumen del historial&R&P de &N';
  const noteRow = 12 + distributionLength;
  summary.mergeCells(noteRow, 1, noteRow, 8);
  summary.getCell(noteRow, 1).value = `Documento generado el ${generatedText(report)} · Fuente: Sistema Inteligente de Reclamos FTTH`;
  summary.getCell(noteRow, 1).font = { name: 'Aptos', size: 9, italic: true, color: { argb: 'FF6B7D90' } };
  summary.getCell(noteRow, 1).alignment = { horizontal: 'center' };
  const image = logo();
  if (image) {
    const imageId = book.addImage({ buffer: image, extension: 'jpeg' });
    summary.addImage(imageId, { tl: { col: 0.15, row: 0.16 }, ext: { width: 60, height: 30 } });
  }

  const jobs = book.addWorksheet('Trabajos finalizados', { properties: { tabColor: { argb: `FF${MID_BLUE}` } } });
  addExcelTitle(jobs, report, 'DETALLE DE TRABAJOS FINALIZADOS', 9);
  jobs.addRow([]);
  jobs.addRow(['Ticket', 'Cliente', 'Trabajo realizado', 'Estado', 'Prioridad', 'Asignación', 'Finalización', 'Duración (h)', 'Solución aplicada']);
  styleExcelHeader(jobs.getRow(4));
  report.tickets.forEach((ticket, index) => {
    const row = jobs.addRow([
      ticket.ticket_code, ticket.customer_name, ticket.title, statusText(ticket.status), ticket.priority,
      ticket.assigned_at ? new Date(ticket.assigned_at) : null,
      ticket.completed_at ? new Date(ticket.completed_at) : null,
      ticket.duration_hours, ticket.solution,
    ]);
    row.height = 38;
    row.eachCell((cell) => {
      cell.font = { name: 'Aptos', size: 9, color: { argb: `FF${DARK}` } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5E1EC' } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F7FB' } };
    });
    const priorityColors = { ALTA: 'FFFFE3E6', MEDIA: 'FFFFF1D5', BAJA: 'FFE1F4EA' };
    row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: priorityColors[ticket.priority] || 'FFF1F4F7' } };
    row.getCell(5).font = { name: 'Aptos', size: 9, bold: true, color: { argb: `FF${DARK}` } };
  });
  configureExcelSheet(jobs, [13, 25, 34, 17, 13, 21, 21, 15, 48]);
  jobs.getColumn(6).numFmt = 'dd/mm/yyyy hh:mm'; jobs.getColumn(7).numFmt = 'dd/mm/yyyy hh:mm'; jobs.getColumn(8).numFmt = '0.00';
  if (report.tickets.length) jobs.addConditionalFormatting({ ref: `H5:H${4 + report.tickets.length}`, rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: `FF${CYAN}`, showValue: true }] });

  const solutions = book.addWorksheet('Soluciones registradas', { properties: { tabColor: { argb: `FF${GREEN}` } } });
  addExcelTitle(solutions, report, 'SOLUCIONES TÉCNICAS REGISTRADAS', 4);
  solutions.addRow([]); solutions.addRow(['Ticket', 'Cliente', 'Trabajo', 'Solución aplicada']);
  styleExcelHeader(solutions.getRow(4));
  report.tickets.forEach((ticket, index) => {
    const row = solutions.addRow([ticket.ticket_code, ticket.customer_name, ticket.title, ticket.solution]);
    row.height = 48;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.font = { name: 'Aptos', size: 10, color: { argb: `FF${DARK}` } };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFD5E1EC' } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F7FB' } };
    });
  });
  configureExcelSheet(solutions, [14, 26, 38, 72]);
  return Buffer.from(await book.xlsx.writeBuffer());
};

const noBorders = {
  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
};
const wordCell = (value, width, { header = false, alternate = false, center = false } = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
  shading: header ? { type: ShadingType.CLEAR, fill: MID_BLUE } : alternate ? { type: ShadingType.CLEAR, fill: LIGHT } : undefined,
  borders: {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'D5E1EC' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D5E1EC' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'D5E1EC' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'D5E1EC' },
  },
  margins: { top: 75, bottom: 75, left: 95, right: 95 },
  children: [new Paragraph({ alignment: header || center ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 0, line: 220 }, children: [new TextRun({ text: String(value ?? ''), bold: header, color: header ? 'FFFFFF' : DARK, size: header ? 15 : 14 })] })],
});
const wordTable = (rows, widths) => new Table({
  width: { size: widths.reduce((sum, width) => sum + width, 0), type: WidthType.DXA }, columnWidths: widths,
  rows: rows.map((values, rowIndex) => new TableRow({ tableHeader: rowIndex === 0, cantSplit: true, children: values.map((value, columnIndex) => wordCell(value, widths[columnIndex], { header: rowIndex === 0, alternate: rowIndex > 0 && rowIndex % 2 === 0 })) })),
});
const wordMetric = (label, value, width, accent) => new TableCell({
  width: { size: width, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
  shading: { type: ShadingType.CLEAR, fill: 'F2F7FB' },
  borders: { ...noBorders, left: { style: BorderStyle.SINGLE, size: 18, color: accent } },
  margins: { top: 135, bottom: 135, left: 125, right: 110 },
  children: [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 }, children: [new TextRun({ text: label, bold: true, size: 14, color: '627A8E' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: String(value), bold: true, size: 26, color: BLUE })] }),
  ],
});
const wordHeading = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 250, after: 110 } });

const createHistoryDocx = async (report) => {
  const image = logo();
  const pageWidth = 15000;
  const header = new Header({ children: [new Table({
    width: { size: pageWidth, type: WidthType.DXA }, columnWidths: [1700, 13300],
    borders: { ...noBorders, bottom: { style: BorderStyle.SINGLE, size: 10, color: CYAN } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 1700, type: WidthType.DXA }, borders: noBorders, children: [image ? new Paragraph({ children: [new ImageRun({ data: image, transformation: { width: 74, height: 38 }, type: 'jpg' })] }) : new Paragraph('ENTEL')] }),
      new TableCell({ width: { size: 13300, type: WidthType.DXA }, borders: noBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'ENTEL BOLIVIA · OPERACIONES FTTH', bold: true, size: 17, color: BLUE })] })] }),
    ] })],
  })] });
  const footer = new Footer({ children: [new Paragraph({
    border: { top: { color: 'D9E3EC', space: 5, style: BorderStyle.SINGLE, size: 6 } }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Historial institucional de trabajos técnicos · Página ', color: '6B7D90', size: 14 }), new TextRun({ children: [PageNumber.CURRENT], color: '6B7D90', size: 14 }), new TextRun({ text: ' de ', color: '6B7D90', size: 14 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], color: '6B7D90', size: 14 })],
  })] });
  const children = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 130, after: 60 }, children: [new TextRun({ text: 'INFORME INSTITUCIONAL', bold: true, size: 15, color: CYAN, characterSpacing: 40 })] }),
    new Paragraph({ text: 'HISTORIAL DE TRABAJOS FINALIZADOS', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 35 }, children: [new TextRun({ text: `Periodo: ${report.range.from} al ${report.range.to}`, bold: true, size: 19, color: '405A70' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 230 }, children: [new TextRun({ text: `Generado el ${generatedText(report)} · Fuente: Sistema Inteligente de Reclamos FTTH`, size: 15, color: '6B7D90' })] }),
    new Table({ width: { size: pageWidth, type: WidthType.DXA }, columnWidths: [3750, 3750, 3750, 3750], rows: [new TableRow({ cantSplit: true, children: [
      wordMetric('TRABAJOS FINALIZADOS', report.metrics.completed, 3750, MID_BLUE),
      wordMetric('CLIENTES ATENDIDOS', report.metrics.customers, 3750, CYAN),
      wordMetric('PRIORIDAD ALTA', report.metrics.high_priority, 3750, GOLD),
      wordMetric('PROMEDIO RESOLUCIÓN', `${report.metrics.average_resolution_hours} h`, 3750, GREEN),
    ] })] }),
    wordHeading('Identificación del técnico'),
    wordTable([
      ['Dato', 'Información', 'Dato', 'Información'],
      ['Nombre completo', report.technician.full_name, 'Código', report.technician.employee_code],
      ['Especialidad', report.technician.specialty, 'Área', report.technician.area],
      ['Zona', report.technician.zone, 'Cuadrilla', report.technician.crew],
    ], [2500, 5000, 2500, 5000]),
    wordHeading('Detalle de trabajos finalizados'),
    wordTable([
      ['Ticket', 'Cliente', 'Trabajo realizado', 'Prioridad', 'Asignación', 'Finalización', 'Duración'],
      ...report.tickets.map((ticket) => [ticket.ticket_code, ticket.customer_name, ticket.title, ticket.priority, dateTime(ticket.assigned_at), dateTime(ticket.completed_at), durationText(ticket.duration_hours)]),
    ], [1150, 2450, 3500, 1250, 2450, 2450, 1750]),
    wordHeading('Soluciones técnicas registradas'),
    ...report.tickets.flatMap((ticket, index) => [
      new Paragraph({ keepNext: true, spacing: { before: index ? 170 : 0, after: 50 }, children: [new TextRun({ text: `${ticket.ticket_code} · ${ticket.customer_name}`, bold: true, size: 19, color: BLUE }), new TextRun({ text: `  |  ${ticket.title}`, size: 17, color: '526B82' })] }),
      new Paragraph({ border: { left: { color: CYAN, size: 12, style: BorderStyle.SINGLE, space: 8 } }, shading: { type: ShadingType.CLEAR, fill: LIGHT }, spacing: { after: 90, line: 240 }, children: [new TextRun({ text: ticket.solution, size: 16, color: DARK })] }),
    ]),
  ];
  const document = new Document({
    styles: { default: { document: { run: { font: 'Aptos', size: 18, color: DARK }, paragraph: { spacing: { after: 90, line: 250 } } } }, paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', run: { font: 'Aptos Display', bold: true, size: 32, color: BLUE } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { font: 'Aptos Display', bold: true, size: 22, color: BLUE }, paragraph: { spacing: { before: 250, after: 110 }, keepNext: true } },
    ] },
    sections: [{ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 750, right: 700, bottom: 720, left: 700 }, pageNumbers: { start: 1 } } }, headers: { default: header }, footers: { default: footer }, children }],
  });
  return Packer.toBuffer(document);
};

const pdfHeader = (doc, report, section = 'Historial de trabajos') => {
  doc.fillColor('#073B6F').rect(0, 0, 842, 78).fill();
  doc.fillColor('#00A9CE').rect(0, 78, 842, 4).fill();
  const image = logo();
  if (image) doc.image(image, 36, 14, { fit: [82, 48] });
  doc.fillColor('white').font('Helvetica-Bold').fontSize(17).text('HISTORIAL DE TRABAJOS FINALIZADOS', 136, 19, { width: 650 });
  doc.font('Helvetica').fontSize(8.5).text(`ENTEL Bolivia  |  ${report.range.from} al ${report.range.to}  |  ${section}`, 136, 47, { width: 650 });
};

const pdfCards = (doc, report) => {
  const cards = [
    ['TRABAJOS FINALIZADOS', report.metrics.completed, '#0B5CAD'],
    ['CLIENTES ATENDIDOS', report.metrics.customers, '#00A9CE'],
    ['PRIORIDAD ALTA', report.metrics.high_priority, '#F6A800'],
    ['PROMEDIO RESOLUCIÓN', `${report.metrics.average_resolution_hours} h`, '#16865B'],
  ];
  cards.forEach(([label, value, color], index) => {
    const x = 34 + (index * 195);
    doc.fillColor('#F3F7FB').roundedRect(x, 98, 181, 59, 7).fill();
    doc.fillColor(color).rect(x, 98, 5, 59).fill();
    doc.fillColor('#60778A').font('Helvetica-Bold').fontSize(7).text(label, x + 15, 109, { width: 150 });
    doc.fillColor('#073B6F').fontSize(18).text(String(value), x + 15, 126, { width: 150 });
  });
};

const drawPdfTableHeader = (doc, y, headers, widths) => {
  let x = 34;
  doc.fillColor('#0B5CAD').rect(34, y, widths.reduce((sum, width) => sum + width, 0), 27).fill();
  headers.forEach((header, index) => {
    doc.fillColor('white').font('Helvetica-Bold').fontSize(6.8).text(header, x + 4, y + 8, { width: widths[index] - 8, height: 13, align: 'center', ellipsis: true });
    x += widths[index];
  });
  return y + 27;
};

const createHistoryPdf = (report) => new Promise((resolve) => {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 34, bufferPages: true });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  pdfHeader(doc, report); pdfCards(doc, report);
  doc.fillColor('#073B6F').font('Helvetica-Bold').fontSize(11.5).text('Identificación del técnico', 34, 178);
  doc.fillColor('#EAF3FB').roundedRect(34, 198, 774, 34, 6).fill();
  doc.fillColor('#294D6D').font('Helvetica').fontSize(7.5).text(`Técnico: ${report.technician.full_name}  ·  Código: ${report.technician.employee_code}  ·  Especialidad: ${report.technician.specialty}`, 48, 207, { width: 746 });
  doc.text(`Zona: ${report.technician.zone}  ·  Cuadrilla: ${report.technician.crew}  ·  Área: ${report.technician.area}`, 48, 219, { width: 746 });

  const headers = ['Ticket', 'Cliente', 'Trabajo', 'Estado', 'Prioridad', 'Asignación', 'Finalización', 'Duración', 'Solución aplicada'];
  const widths = [55, 90, 120, 65, 55, 88, 88, 54, 159];
  let y = 264;
  doc.fillColor('#073B6F').font('Helvetica-Bold').fontSize(12).text('Detalle de trabajos finalizados', 34, 244);
  y = drawPdfTableHeader(doc, y, headers, widths);
  report.tickets.forEach((ticket, rowIndex) => {
    const values = [ticket.ticket_code, ticket.customer_name, ticket.title, statusText(ticket.status), ticket.priority, dateTime(ticket.assigned_at), dateTime(ticket.completed_at), durationText(ticket.duration_hours), ticket.solution];
    doc.font('Helvetica').fontSize(6.6);
    const rowHeight = Math.min(52, Math.max(27, ...values.map((value, index) => doc.heightOfString(String(value), { width: widths[index] - 8 }) + 10)));
    if (y + rowHeight > 538) {
      doc.addPage(); pdfHeader(doc, report, 'Detalle de trabajos · continuación');
      y = drawPdfTableHeader(doc, 106, headers, widths);
    }
    if (rowIndex % 2 === 0) doc.fillColor('#F2F7FB').rect(34, y, 774, rowHeight).fill();
    let x = 34;
    values.forEach((value, index) => {
      doc.fillColor('#294D6D').font('Helvetica').fontSize(6.6).text(String(value), x + 4, y + 6, { width: widths[index] - 8, height: rowHeight - 10, ellipsis: true, align: index === 0 || index === 4 || index === 7 ? 'center' : 'left' });
      x += widths[index];
    });
    doc.strokeColor('#D7E2EC').lineWidth(0.35).moveTo(34, y + rowHeight).lineTo(808, y + rowHeight).stroke();
    y += rowHeight;
  });
  const pages = doc.bufferedPageRange();
  for (let index = 0; index < pages.count; index += 1) {
    doc.switchToPage(index);
    doc.strokeColor('#D9E3EC').lineWidth(0.5).moveTo(34, 551).lineTo(808, 551).stroke();
    doc.fillColor('#6B7D90').font('Helvetica').fontSize(7).text(`Sistema Inteligente de Reclamos FTTH  |  Generado ${generatedText(report)}  |  Página ${index + 1} de ${pages.count}`, 34, 558, { width: 774, height: 8, align: 'center', lineBreak: false });
  }
  doc.end();
});

module.exports = { createHistoryXlsx, createHistoryDocx, createHistoryPdf };
