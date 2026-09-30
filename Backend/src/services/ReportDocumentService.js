const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, PageBreak, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType } = require('docx');

const BLUE = '073B6F'; const MID_BLUE = '0B5CAD'; const CYAN = '00A9CE'; const LIGHT = 'EAF3FB'; const DARK = '173C7A'; const GOLD = 'F6A800';
const distributionNames = { status:'estado', priority:'prioridad', failure:'tipo de falla', zone:'zona', crew:'cuadrilla' };
const logoPath = path.resolve(__dirname, '../../../Frontend/src/assets/logo.jpg');
const logo = () => fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;
const summaryRows = (report) => [
  ['Tickets registrados', report.metrics.total], ['Tickets terminados', report.metrics.completed], ['Tasa de resolución', `${report.metrics.resolution_rate}%`],
  ['Cumplimiento SLA (24 h)', `${report.metrics.sla_compliance}%`], ['Tiempo medio de asignación', `${report.metrics.average_assignment_hours} h`],
  ['Tiempo medio de llegada', `${report.metrics.average_arrival_hours} h`], ['Tiempo medio de resolución', `${report.metrics.average_resolution_hours} h`],
];
const ticketRows = (report) => report.tickets.map((t) => [t.ticket_code,t.customer,t.title,t.status,t.priority,t.technician,new Date(t.created_at).toLocaleString('es-BO')]);

const styleSheet = (sheet, widths) => {
  sheet.views = [{ showGridLines:false, state:'frozen', ySplit:4, zoomScale:90 }];
  sheet.columns = widths.map((width) => ({ width }));
  sheet.pageSetup = { orientation:'landscape', fitToPage:true, fitToWidth:1, fitToHeight:0, paperSize:9 };
  sheet.properties.pageSetUpPr = { fitToPage:true };
  sheet.headerFooter.oddFooter = '&LENTEL FTTH&CReporte administrativo&R&P de &N';
  sheet.pageSetup.printTitlesRow = '1:4';
  sheet.pageMargins = { left:0.3, right:0.3, top:0.55, bottom:0.55, header:0.2, footer:0.2 };
  sheet.eachRow((row,index) => {
    row.height=index===1?42:index===2?28:index===4?30:24;
    row.eachCell((cell) => {
      if (![1,2,4].includes(index)) cell.alignment={vertical:'middle',wrapText:true};
      if (![1,2,4].includes(index)) cell.font={name:'Aptos',size:10,color:{argb:'FF173C7A'}};
      if (index > 4) {
        cell.border={bottom:{style:'hair',color:{argb:'FFD9E4F1'}}};
        if (index % 2 === 1) cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF5F8FC'}};
      }
    });
  });
};
const addTitle = (sheet, title, report, columns) => {
  sheet.mergeCells(1,1,1,columns); const titleCell=sheet.getCell(1,1); titleCell.value=title; titleCell.font={name:'Aptos Display',size:20,bold:true,color:{argb:'FFFFFFFF'}}; titleCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:`FF${BLUE}`}}; titleCell.alignment={vertical:'middle',horizontal:'center'};
  sheet.mergeCells(2,1,2,columns); const subtitle=sheet.getCell(2,1); subtitle.value=`ENTEL Bolivia · Red FTTH · Periodo ${report.range.from} al ${report.range.to} · Generado ${new Date(report.generatedAt).toLocaleString('es-BO')}`; subtitle.font={name:'Aptos',size:9,italic:true,color:{argb:'FF526B82'}}; subtitle.alignment={horizontal:'center',vertical:'middle'};
};
const styleHeader = (row) => row.eachCell((cell) => { cell.font={name:'Aptos',size:10,bold:true,color:{argb:'FFFFFFFF'}}; cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:`FF${MID_BLUE}`}}; cell.alignment={horizontal:'center',vertical:'middle',wrapText:true}; });

const createXlsx = async (report) => {
  const book = new ExcelJS.Workbook(); book.creator='Sistema ENTEL FTTH'; book.company='ENTEL Bolivia'; book.subject='Reporte administrativo FTTH'; book.title='Reporte administrativo ENTEL FTTH'; book.category='Operaciones FTTH'; book.keywords='ENTEL, FTTH, tickets, gestión'; book.created=new Date();
  const summary=book.addWorksheet('Resumen'); addTitle(summary,'REPORTE ADMINISTRATIVO',report,4); summary.addRow([]); summary.addRow(['Indicador','Resultado','Comparación anterior','Interpretación']); styleHeader(summary.getRow(4));
  summaryRows(report).forEach(([label,value],index) => { const comparisons=[report.comparison.total,report.comparison.completed,null,null,null,null,report.comparison.resolutionHours]; const change=comparisons[index]; summary.addRow([label,value,change==null?'—':change/100,change==null?'Indicador del periodo':change>=0?'Incremento':'Reducción']); }); styleSheet(summary,[34,20,23,27]); summary.getColumn(3).numFmt='0.0%'; summary.autoFilter='A4:D4'; summary.getRow(4).height=32;
  summary.properties.tabColor={argb:`FF${CYAN}`};
  summary.getColumn(2).alignment={horizontal:'center',vertical:'middle'};
  const image=logo(); if(image){const id=book.addImage({buffer:image,extension:'jpeg'});summary.addImage(id,{tl:{col:0.18,row:0.16},ext:{width:58,height:28}});}
  Object.entries(report.distributions).forEach(([name,rows]) => { const label=distributionNames[name]||name;const sheet=book.addWorksheet(`Por ${label}`.slice(0,31)); addTitle(sheet,`TICKETS POR ${label.toUpperCase()}`,report,4); sheet.addRow([]); sheet.addRow(['Categoría','Cantidad','Porcentaje','Representación']); styleHeader(sheet.getRow(4)); const total=rows.reduce((sum,r)=>sum+r.value,0); rows.forEach((r)=>{const pct=total?r.value/total:0;sheet.addRow([r.label,r.value,pct,'█'.repeat(Math.max(1,Math.round(pct*20)))]);}); styleSheet(sheet,[38,14,16,28]); sheet.getColumn(3).numFmt='0%'; sheet.autoFilter='A4:D4'; });
  const tech=book.addWorksheet('Rendimiento técnicos'); addTitle(tech,'RENDIMIENTO POR TÉCNICO',report,8); tech.addRow([]); tech.addRow(['Técnico','Código','Zona','Cuadrilla','Asignados','Terminados','Incumplimientos','Eficiencia']); styleHeader(tech.getRow(4)); report.technicians.forEach(t=>tech.addRow([t.full_name,t.employee_code,t.zone,t.crew,t.assigned,t.completed,t.missed_visits||0,(t.efficiency||0)/100])); styleSheet(tech,[29,15,20,20,13,13,17,14]); tech.properties.tabColor={argb:`FF${GOLD}`}; tech.getColumn(8).numFmt='0%'; tech.getColumn(8).alignment={horizontal:'center',vertical:'middle'}; tech.autoFilter='A4:H4'; if(report.technicians.length) tech.addConditionalFormatting({ref:`H5:H${4+report.technicians.length}`,rules:[{type:'colorScale',cfvo:[{type:'min'},{type:'percentile',value:50},{type:'max'}],color:[{argb:'FFF8696B'},{argb:'FFFFEB84'},{argb:'FF63BE7B'}]}]});
  const tickets=book.addWorksheet('Detalle tickets'); addTitle(tickets,'DETALLE DE TICKETS',report,7); tickets.addRow([]); tickets.addRow(['Ticket','Cliente','Falla','Estado','Prioridad','Técnico','Registro']); styleHeader(tickets.getRow(4)); ticketRows(report).forEach(row=>tickets.addRow(row)); styleSheet(tickets,[13,25,38,20,13,25,23]); tickets.autoFilter='A4:G4'; tickets.getColumn(7).numFmt='dd/mm/yyyy hh:mm';
  return Buffer.from(await book.xlsx.writeBuffer());
};

const docCell = (value, header=false, width, alternate=false) => new TableCell({ width:width?{size:width,type:WidthType.DXA}:undefined, verticalAlign:VerticalAlign.CENTER, shading:header?{type:ShadingType.CLEAR,fill:MID_BLUE}:alternate?{type:ShadingType.CLEAR,fill:'F3F7FB'}:undefined, borders:{top:{style:BorderStyle.SINGLE,size:4,color:'D8E3ED'},bottom:{style:BorderStyle.SINGLE,size:4,color:'D8E3ED'},left:{style:BorderStyle.SINGLE,size:4,color:'D8E3ED'},right:{style:BorderStyle.SINGLE,size:4,color:'D8E3ED'}}, margins:{top:80,bottom:80,left:110,right:110}, children:[new Paragraph({children:[new TextRun({text:String(value??''),bold:header,color:header?'FFFFFF':DARK,size:header?17:16})],alignment:header?AlignmentType.CENTER:AlignmentType.LEFT,spacing:{after:0,line:230}})] });
const docTable = (rows, widths) => new Table({ width:{size:widths.reduce((sum,value)=>sum+value,0),type:WidthType.DXA}, columnWidths:widths, rows:rows.map((values,index)=>new TableRow({tableHeader:index===0,cantSplit:true,children:values.map((value,column)=>docCell(value,index===0,widths[column],index>0&&index%2===0))})) });
const metricCell = (label,value,width) => new TableCell({width:{size:width,type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,shading:{type:ShadingType.CLEAR,fill:'F1F7FC'},borders:{top:{style:BorderStyle.SINGLE,size:7,color:'CFE0EE'},bottom:{style:BorderStyle.SINGLE,size:7,color:'CFE0EE'},left:{style:BorderStyle.SINGLE,size:7,color:'CFE0EE'},right:{style:BorderStyle.SINGLE,size:7,color:'CFE0EE'}},margins:{top:150,bottom:150,left:120,right:120},children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:60},children:[new TextRun({text:label.toUpperCase(),bold:true,size:15,color:'627A8E'})]}),new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:0},children:[new TextRun({text:String(value),bold:true,size:27,color:BLUE})]})]});
const docHeading = (text) => new Paragraph({text,heading:HeadingLevel.HEADING_1,spacing:{before:280,after:120}});
const createDocx = async (report) => {
  const image=logo(); const children=[];
  children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:180,after:80},children:[new TextRun({text:'INFORME INSTITUCIONAL',bold:true,size:16,color:CYAN,characterSpacing:35})]}),new Paragraph({text:'REPORTE ADMINISTRATIVO ENTEL FTTH',heading:HeadingLevel.TITLE,alignment:AlignmentType.CENTER,spacing:{after:90}}),new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:40},children:[new TextRun({text:`Periodo de análisis: ${report.range.from} al ${report.range.to}`,bold:true,size:20,color:'405A70'})]}),new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:300},children:[new TextRun({text:`Generado el ${new Date(report.generatedAt).toLocaleString('es-BO')} · Fuente: Sistema Inteligente de Reclamos FTTH`,size:17,color:'6B7D90'})]}),new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[2340,2340,2340,2340],rows:[new TableRow({cantSplit:true,children:[metricCell('Registrados',report.metrics.total,2340),metricCell('Terminados',report.metrics.completed,2340),metricCell('Resolución',`${report.metrics.resolution_rate}%`,2340),metricCell('SLA 24 h',`${report.metrics.sla_compliance}%`,2340)]})]}),docHeading('Resumen ejecutivo'),docTable([['Indicador','Resultado'],...summaryRows(report)],[6500,2860]),docHeading('Comparación con el periodo anterior'),docTable([['Indicador','Variación'],['Tickets registrados',`${report.comparison.total}%`],['Tickets terminados',`${report.comparison.completed}%`],['Tiempo de resolución',`${report.comparison.resolutionHours}%`]],[6500,2860]));
  Object.entries(report.distributions).forEach(([name,rows])=>{const total=rows.reduce((sum,r)=>sum+r.value,0);children.push(docHeading(`Tickets por ${distributionNames[name]||name}`),docTable([['Categoría','Cantidad','Porcentaje'],...rows.map(r=>[r.label,r.value,`${total?Math.round(r.value*100/total):0}%`])],[6000,1500,1860]));});
  children.push(new Paragraph({children:[new PageBreak()]}),docHeading('Rendimiento por técnico'),docTable([['Técnico','Asignados','Terminados','Incumplimientos','Eficiencia'],...report.technicians.map(t=>[t.full_name,t.assigned,t.completed,t.missed_visits||0,`${t.efficiency}%`])],[4300,1200,1200,1500,1160]),docHeading('Detalle de tickets'),docTable([['Ticket','Cliente','Falla','Estado','Prioridad','Técnico','Registro'],...ticketRows(report)],[900,1450,2100,1300,900,1500,1210]));
  const header = new Header({children:[new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[1500,7860],borders:{top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.SINGLE,size:10,color:CYAN},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE},insideHorizontal:{style:BorderStyle.NONE},insideVertical:{style:BorderStyle.NONE}},rows:[new TableRow({children:[new TableCell({width:{size:1500,type:WidthType.DXA},borders:{top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE}},children:[image?new Paragraph({children:[new ImageRun({data:image,transformation:{width:74,height:38},type:'jpg'})]}):new Paragraph('ENTEL')]}),new TableCell({width:{size:7860,type:WidthType.DXA},borders:{top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE}},children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:'ENTEL BOLIVIA · GESTIÓN DE SERVICIOS FTTH',bold:true,size:17,color:BLUE})]})]})]})]})]});
  const footer = new Footer({children:[new Paragraph({border:{top:{color:'D9E3EC',space:5,style:BorderStyle.SINGLE,size:6}},alignment:AlignmentType.CENTER,children:[new TextRun({text:'Documento institucional generado por el Sistema Inteligente de Reclamos FTTH · Página ',color:'6B7D90',size:15}),new TextRun({children:[PageNumber.CURRENT],color:'6B7D90',size:15}),new TextRun({text:' de ',color:'6B7D90',size:15}),new TextRun({children:[PageNumber.TOTAL_PAGES],color:'6B7D90',size:15})]})]});
  return Packer.toBuffer(new Document({styles:{default:{document:{run:{font:'Aptos',size:20,color:DARK},paragraph:{spacing:{after:100,line:276}}}},paragraphStyles:[{id:'Title',name:'Title',basedOn:'Normal',run:{font:'Aptos Display',bold:true,size:36,color:BLUE}},{id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',run:{font:'Aptos Display',bold:true,size:24,color:BLUE},paragraph:{spacing:{before:280,after:120},keepNext:true}}]},sections:[{properties:{page:{margin:{top:850,right:720,bottom:760,left:720},pageNumbers:{start:1}}},headers:{default:header},footers:{default:footer},children}]}));
};

const pdfHeader = (doc, report, section = 'Informe ejecutivo') => {
  doc.fillColor('#073B6F').rect(0, 0, 842, 78).fill();
  doc.fillColor('#00A9CE').rect(0, 78, 842, 4).fill();
  const image = logo();
  if (image) doc.image(image, 36, 14, { fit:[82,48] });
  doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text('REPORTE ADMINISTRATIVO FTTH', 136, 20);
  doc.font('Helvetica').fontSize(8.5).text(`ENTEL Bolivia  |  ${report.range.from} al ${report.range.to}  |  ${section}`, 136, 48);
  doc.x = 34; doc.y = 96;
};

const pdfMetricCards = (doc, report) => {
  const cards = [
    ['TICKETS REGISTRADOS', report.metrics.total, '#0B5CAD'],
    ['TICKETS TERMINADOS', report.metrics.completed, '#087F9B'],
    ['TASA DE RESOLUCIÓN', `${report.metrics.resolution_rate}%`, '#0E8A61'],
    ['CUMPLIMIENTO SLA', `${report.metrics.sla_compliance}%`, '#F6A800'],
  ];
  cards.forEach(([label,value,color],index) => {
    const x=34+(index*195); const y=100;
    doc.fillColor('#F4F8FC').roundedRect(x,y,181,62,8).fill();
    doc.fillColor(color).rect(x,y,5,62).fill();
    doc.fillColor('#587086').font('Helvetica-Bold').fontSize(7.2).text(label,x+16,y+12,{width:150});
    doc.fillColor('#073B6F').fontSize(20).text(String(value),x+16,y+29,{width:150});
  });
};

const pdfDistributionCard = (doc, title, rows, x, y, width=374, height=166) => {
  const total=rows.reduce((sum,row)=>sum+row.value,0); const max=Math.max(...rows.map(row=>row.value),1);
  doc.lineWidth(.7).strokeColor('#D5E1EC').fillColor('#FFFFFF').roundedRect(x,y,width,height,9).fillAndStroke();
  doc.fillColor('#073B6F').font('Helvetica-Bold').fontSize(10.5).text(title,x+16,y+13,{width:width-32});
  doc.fillColor('#6C8295').font('Helvetica').fontSize(7).text(`Total: ${total}`,x+width-70,y+15,{width:54,align:'right'});
  const visible=rows.slice(0,6); const rowHeight=18;
  visible.forEach((row,index)=>{
    const rowY=y+42+(index*rowHeight); const pct=total?Math.round(row.value*100/total):0;
    doc.fillColor('#334E65').fontSize(7.2).text(String(row.label).replaceAll('_',' '),x+16,rowY,{width:115,height:10,ellipsis:true});
    doc.fillColor('#E5EDF5').roundedRect(x+137,rowY+1,width-215,7,3).fill();
    doc.fillColor(index===0?'#0B5CAD':'#00A9CE').roundedRect(x+137,rowY+1,Math.max(3,(width-215)*row.value/max),7,3).fill();
    doc.fillColor('#073B6F').font('Helvetica-Bold').text(`${row.value} · ${pct}%`,x+width-70,rowY,{width:54,align:'right'}).font('Helvetica');
  });
  if(rows.length>6) doc.fillColor('#6C8295').fontSize(6.8).text(`+ ${rows.length-6} categorías adicionales`,x+16,y+height-15);
};

const pdfDataTable = (doc, report, title, headers, rows, widths, startY=120) => {
  const x=34; const tableWidth=widths.reduce((sum,width)=>sum+width,0); let y=startY; let continuation=false;
  const drawTitleAndHeader=()=>{
    doc.fillColor('#073B6F').font('Helvetica-Bold').fontSize(13).text(continuation?`${title} · continuación`:title,x,y,{width:tableWidth}); y+=24;
    doc.fillColor('#0B5CAD').rect(x,y,tableWidth,25).fill(); let cx=x;
    headers.forEach((header,index)=>{doc.fillColor('white').fontSize(7.4).text(header,cx+5,y+8,{width:widths[index]-10,height:10,ellipsis:true});cx+=widths[index];}); y+=25;
  };
  drawTitleAndHeader();
  rows.forEach((row,index)=>{
    if(y>512){doc.addPage();pdfHeader(doc,report,title);y=112;continuation=true;drawTitleAndHeader();}
    if(index%2===0)doc.fillColor('#F2F7FB').rect(x,y,tableWidth,23).fill();
    let cx=x; row.forEach((value,column)=>{doc.fillColor('#284A64').font('Helvetica').fontSize(7).text(String(value??''),cx+5,y+7,{width:widths[column]-10,height:11,ellipsis:true});cx+=widths[column];}); y+=23;
  });
};

const createPdf = (report) => new Promise((resolve) => {
  const doc=new PDFDocument({size:'A4',layout:'landscape',margin:34,bufferPages:true,autoFirstPage:true}); const chunks=[];
  doc.on('data',chunk=>chunks.push(chunk)); doc.on('end',()=>resolve(Buffer.concat(chunks)));
  pdfHeader(doc,report); pdfMetricCards(doc,report);
  doc.fillColor('#073B6F').font('Helvetica-Bold').fontSize(13).text('Panorama operativo',34,179);
  pdfDistributionCard(doc,'Tickets por estado',report.distributions.status,34,207);
  pdfDistributionCard(doc,'Tickets por tipo de falla',report.distributions.failure,434,207);
  pdfDistributionCard(doc,'Tickets por prioridad',report.distributions.priority,34,388,374,145);
  pdfDistributionCard(doc,'Tickets por zona',report.distributions.zone,434,388,374,145);

  doc.addPage(); pdfHeader(doc,report,'Rendimiento técnico');
  pdfDistributionCard(doc,'Tickets por cuadrilla',report.distributions.crew,34,108,374,166);
  pdfDataTable(doc,report,'Rendimiento por técnico',['Técnico','Código','Zona / cuadrilla','Asignados','Terminados','Incumpl.','Eficiencia'],report.technicians.map(t=>[t.full_name,t.employee_code,`${t.zone} / ${t.crew}`,t.assigned,t.completed,t.missed_visits||0,`${t.efficiency}%`]),[175,85,150,75,75,75,85],300);

  doc.addPage(); pdfHeader(doc,report,'Detalle de tickets');
  pdfDataTable(doc,report,'Detalle de tickets',['Ticket','Cliente','Falla','Estado','Prioridad','Técnico','Registro'],ticketRows(report),[65,115,185,105,65,120,115],112);

  const pages=doc.bufferedPageRange();
  for(let index=0;index<pages.count;index++){
    doc.switchToPage(index);
    doc.strokeColor('#D9E3EC').moveTo(34,545).lineTo(808,545).stroke();
    doc.fillColor('#6B7D90').font('Helvetica').fontSize(7).text(`Sistema Inteligente de Reclamos FTTH  |  Documento generado automáticamente  |  Página ${index+1} de ${pages.count}`,34,552,{width:774,height:8,align:'center',lineBreak:false});
  }
  doc.end();
});

module.exports={createXlsx,createDocx,createPdf};
