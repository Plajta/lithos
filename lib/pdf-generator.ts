"use client";

import type PDFDocument from "pdfkit";
// @ts-ignore - pdfkit/js/pdfkit.standalone lacks type declarations
import StandalonePDFDocument from "pdfkit/js/pdfkit.standalone";

import BlobStream from "blob-stream";
import { COLOR_LOOKUP_TABLE, Configuration } from "~/store/useConfigurationStore";

function convertUnits(mm: number) {
	return mm * 2.83465;
}

function baseOffset(mm: number) {
	return convertUnits(mm) + convertUnits(5);
}

function arrayToMatrix<T>(data: T[], rows: number, cols: number): (T | null)[][] {
	const matrix: (T | null)[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

	let dataIndex = 0;

	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			if (dataIndex < data.length) {
				matrix[r][c] = data[dataIndex];
				dataIndex++;
			} else {
				return matrix;
			}
		}
	}

	return matrix;
}

export async function generatePdf({ configuration }: { configuration: Configuration }) {
	const doc = new StandalonePDFDocument() as typeof PDFDocument;
	const stream = doc.pipe(BlobStream());

	const matrix = arrayToMatrix(configuration.buttons, 4, 4);

	const fontBytes = await fetch("/fonts/Roboto-Regular.ttf");

	doc.registerFont("Roboto-Regular", await fontBytes.arrayBuffer());

	for (const [rowIndex, row] of matrix.entries()) {
		for (const [colIndex, col] of row.entries()) {
			doc.roundedRect(
				baseOffset(10) + convertUnits(46) * colIndex,
				baseOffset(10) + convertUnits(46) * rowIndex,
				convertUnits(43),
				convertUnits(43),
				10
			).stroke();

			if (!col || !col.label || !col.imageUrl) {
				continue;
			}

			const cellX = baseOffset(10) + convertUnits(46) * colIndex;
			const cellY = baseOffset(10) + convertUnits(46) * rowIndex;
			const cellW = convertUnits(43);
			const cellH = convertUnits(43);
			const padding = convertUnits(2);
			const labelHeight = convertUnits(10);

			const imageBytes = await fetch(col.imageUrl!).then((res) => res.arrayBuffer());

			const imgW = cellW - padding * 2;
			const imgH = cellH - labelHeight - padding * 2;

			doc.image(
				imageBytes,
				cellX + padding,
				cellY + padding,
				{
					fit: [imgW, imgH],
					align: "center",
					valign: "center",
				}
			);

			doc.font("Roboto-Regular").text(
				col.label,
				cellX,
				cellY + cellH - labelHeight / 2.5,
				{
					width: cellW,
					align: "center",
					baseline: "bottom",
				}
			);
		}
	}

	doc.rect(baseOffset(6), baseOffset(6), convertUnits(189), convertUnits(205)).stroke();

	doc.rect(baseOffset(6), baseOffset(201), convertUnits(189), convertUnits(10)).stroke();

	doc.fontSize(20);

	doc.font("Roboto-Regular").text(configuration.name, baseOffset(6), baseOffset(202), {
		width: convertUnits(99),
		height: convertUnits(10),
		align: "center",
	});

	doc.rect(baseOffset(105), baseOffset(201), convertUnits(90), convertUnits(10)).fill(
		`#${COLOR_LOOKUP_TABLE[configuration.colorCode as keyof typeof COLOR_LOOKUP_TABLE]}`
	);

	doc.end();

	stream.on("finish", function () {
		const url = stream.toBlobURL("application/pdf");

		const a = document.createElement("a");

		a.href = url;
		a.download = `${configuration.name}_lithos.pdf`;
		document.body.appendChild(a);

		a.click();

		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	});
}
