export interface PdfColumn {
  header: string;
  width: number;
  align?: "left" | "right" | "center";
}

// A minimal table renderer for pdfkit -- pdfkit itself has no table
// primitive, only text/rect/line drawing. This re-draws the header row on
// every page it spills onto, so a long report (hundreds of sales/events)
// never scrolls off into unlabeled columns partway through.
export function drawTable(
  doc: PDFKit.PDFDocument,
  columns: PdfColumn[],
  rows: string[][],
  startY: number,
): number {
  const startX = doc.page.margins.left;
  const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);
  const rowHeight = 20;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  const drawHeaderRow = (y: number): number => {
    doc.fillColor("#F5F5F4").rect(startX, y, tableWidth, rowHeight).fill();
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1C1C1A");
    let x = startX;
    for (const col of columns) {
      doc.text(col.header, x + 4, y + 6, {
        width: col.width - 8,
        align: col.align ?? "left",
      });
      x += col.width;
    }
    doc
      .moveTo(startX, y + rowHeight)
      .lineTo(startX + tableWidth, y + rowHeight)
      .strokeColor("#D6D3D1")
      .lineWidth(0.75)
      .stroke();
    return y + rowHeight;
  };

  let y = drawHeaderRow(startY);
  doc.font("Helvetica").fontSize(9);

  for (const row of rows) {
    if (y + rowHeight > bottomLimit) {
      doc.addPage();
      y = drawHeaderRow(doc.page.margins.top);
      doc.font("Helvetica").fontSize(9);
    }
    let x = startX;
    for (let i = 0; i < columns.length; i++) {
      doc.fillColor("#1C1C1A").text(row[i] ?? "", x + 4, y + 6, {
        width: columns[i].width - 8,
        align: columns[i].align ?? "left",
      });
      x += columns[i].width;
    }
    doc
      .moveTo(startX, y + rowHeight)
      .lineTo(startX + tableWidth, y + rowHeight)
      .strokeColor("#EDEBE9")
      .lineWidth(0.5)
      .stroke();
    y += rowHeight;
  }

  return y;
}
