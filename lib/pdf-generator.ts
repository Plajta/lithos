"use client";

import { PDFDocument, rgb, PageSizes, StandardFonts } from "pdf-lib";
import { useEffect, useState } from "react";
import fontkit from "@pdf-lib/fontkit";
import { Configuration } from "~/store/useConfigurationStore";

const template = {
	container: {
		width: 138,
		height: 160,
	},
	header: {
		height: 20,
	},
};

function mmsToPoints(mms: number) {
	return mms * 2.83465;
}

function offsetPoints(points: number) {
	return mmsToPoints(points) + mmsToPoints(10);
}

function create2DArrayFromArray<T>(arr: T[], rows: number): T[][] {
	const validLengths = [9, 12];

	if (!validLengths.includes(arr.length)) {
		throw new Error("Input array must contain exactly 9 or 12 elements.");
	}

	const elementsPerRow = 3;

	if (arr.length / elementsPerRow !== rows) {
		throw new Error(`The number of rows must be ${arr.length / elementsPerRow}.`);
	}

	const result: T[][] = [];
	for (let i = 0; i < rows; i++) {
		result.push(arr.slice(i * elementsPerRow, (i + 1) * elementsPerRow));
	}

	return result.reverse();
}

const DebugFrames = true;

export async function generatePdf({ configuration }: { configuration: Configuration }) {
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage(PageSizes.A4);

	const fontBytes = await fetch("https://pdf-lib.js.org/assets/ubuntu/Ubuntu-R.ttf").then((res) => res.arrayBuffer());

	pdfDoc.registerFontkit(fontkit);

	const font = await pdfDoc.embedFont(fontBytes);

	page.drawRectangle({
		x: offsetPoints(0),
		y: offsetPoints(0),
		width: mmsToPoints(template.container.width),
		height: mmsToPoints(template.container.height),
		borderWidth: 1,
		borderColor: rgb(0, 0, 0),
	});

	page.drawLine({
		start: { x: offsetPoints(0), y: offsetPoints(template.container.height - template.header.height) },
		end: {
			x: offsetPoints(template.container.width),
			y: offsetPoints(template.container.height - template.header.height),
		},
		thickness: 1,
		color: rgb(0, 0, 0),
	});

	page.drawLine({
		start: { x: offsetPoints(0), y: offsetPoints(template.container.height - template.header.height / 2) },
		end: {
			x: offsetPoints(template.container.width),
			y: offsetPoints(template.container.height - template.header.height / 2),
		},
		thickness: 1,
		color: rgb(0, 0, 0),
	});

	// nahore leva
	if (DebugFrames) {
		page.drawRectangle({
			x: offsetPoints(0),
			y: offsetPoints(template.container.height - template.header.height / 2),
			width: mmsToPoints(template.container.width / 3),
			height: mmsToPoints(template.header.height / 2),
			borderWidth: 1,
			borderColor: rgb(1, 0, 0),
		});
	}

	page.drawText("-- Tudle vohnout --", {
		x: offsetPoints(0) + 4,
		y: offsetPoints(template.container.height - template.header.height / 2) + 9,
		size: 15,
		font: font,
		color: rgb(0, 0, 0),
	});

	// nahore uprostred
	if (DebugFrames) {
		page.drawRectangle({
			x: offsetPoints(template.container.width / 3),
			y: offsetPoints(template.container.height - template.header.height / 2),
			width: mmsToPoints(template.container.width / 3),
			height: mmsToPoints(template.header.height / 2),
			borderWidth: 1,
			borderColor: rgb(1, 0, 0),
		});
	}

	page.drawRectangle({
		x: offsetPoints(template.container.width / 3),
		y: offsetPoints(template.container.height - template.header.height / 2),
		width: mmsToPoints(template.container.width / 3),
		height: mmsToPoints(template.header.height / 2),
		color: rgb(0, 1, 0),
	});

	// nahore prava
	if (DebugFrames) {
		page.drawRectangle({
			x: offsetPoints(2 * (template.container.width / 3)),
			y: offsetPoints(template.container.height - template.header.height / 2),
			width: mmsToPoints(template.container.width / 3),
			height: mmsToPoints(template.header.height / 2),
			borderWidth: 1,
			borderColor: rgb(1, 0, 0),
		});
	}

	page.drawText("-- Tudle vohnout --", {
		x: offsetPoints(2 * (template.container.width / 3)) + 4,
		y: offsetPoints(template.container.height - template.header.height / 2) + 9,
		size: 15,
		font: font,
		color: rgb(0, 0, 0),
	});

	// dole leva + uprostred
	if (DebugFrames) {
		page.drawRectangle({
			x: offsetPoints(0),
			y: offsetPoints(template.container.height - template.header.height),
			width: mmsToPoints(template.container.width / 3) + mmsToPoints(template.container.width / 3),
			height: mmsToPoints(template.header.height / 2),
			borderWidth: 1,
			borderColor: rgb(1, 0, 0),
		});
	}

	page.drawText(configuration.name, {
		x: offsetPoints(0) + 6,
		y: offsetPoints(template.container.height - template.header.height) + 9,
		size: 15,
		font: font,
		color: rgb(0, 0, 0),
		maxWidth: mmsToPoints(template.container.width / 3) + mmsToPoints(template.container.width / 3),
	});

	// dole prava
	if (DebugFrames) {
		page.drawRectangle({
			x: offsetPoints(2 * (template.container.width / 3)),
			y: offsetPoints(template.container.height - template.header.height),
			width: mmsToPoints(template.container.width / 3),
			height: mmsToPoints(template.header.height / 2),
			borderWidth: 1,
			borderColor: rgb(1, 0, 0),
		});
	}

	page.drawText("Plajta-Lithos 2025", {
		x: offsetPoints(2 * (template.container.width / 3)) + 4,
		y: offsetPoints(template.container.height - template.header.height) + 9,
		size: 15,
		font: font,
		color: rgb(0, 0, 0),
	});

	const button2DArray = create2DArrayFromArray(configuration.buttons, 3);

	for (const [rowIndex, row] of button2DArray.entries()) {
		for (const [buttonIndex, button] of row.entries()) {
			if (!button.label || !button.imageUrl) {
				continue;
			}

			// grid
			if (DebugFrames) {
				page.drawRectangle({
					x: offsetPoints(buttonIndex * (template.container.width / 3)),
					y: offsetPoints(
						template.container.height -
							template.header.height -
							((rowIndex + 1) * (template.container.height - template.header.height)) / 3
					),
					width: mmsToPoints(template.container.width / 3),
					height: mmsToPoints((template.container.height - template.header.height) / 3),
					borderWidth: 1,
					borderColor: rgb(0, 0, 0),
				});
			}

			// text
			if (DebugFrames) {
				page.drawRectangle({
					x: offsetPoints(buttonIndex * (template.container.width / 3)),
					y: offsetPoints(
						template.container.height -
							template.header.height -
							((rowIndex + 1) * (template.container.height - template.header.height)) / 3
					),
					width: mmsToPoints(template.container.width / 3),
					height: mmsToPoints(template.header.height / 2),
					color: rgb(0, 1, 0),
				});
			}

			const textWidth = font.widthOfTextAtSize(button.label, 15);

			page.drawText(button.label, {
				x: offsetPoints(buttonIndex * (template.container.width / 3)) + textWidth / 2,
				y:
					offsetPoints(
						template.container.height -
							template.header.height -
							((rowIndex + 1) * (template.container.height - template.header.height)) / 3
					) + 9,
				size: 15,
				font: font,
				color: rgb(0, 0, 0),
			});

			// obrazek
			if (DebugFrames) {
				page.drawRectangle({
					x: offsetPoints(buttonIndex * (template.container.width / 3)),
					y: offsetPoints(
						template.container.height -
							template.header.height -
							((rowIndex + 1) * (template.container.height - template.header.height)) / 3 +
							10
					),
					width: mmsToPoints(template.container.width / 3),
					height: mmsToPoints(
						(template.container.height - template.header.height) / 3 - template.header.height / 2
					),
					color: rgb(0, 0, 1),
				});
			}

			const imageBytes = await fetch(button.imageUrl).then((res) => res.arrayBuffer());

			const image = await pdfDoc.embedPng(imageBytes);

			page.drawImage(image, {
				x: offsetPoints(buttonIndex * (template.container.width / 3) + 1),
				y: offsetPoints(
					template.container.height -
						template.header.height -
						((rowIndex + 1) * (template.container.height - template.header.height)) / 3 +
						10
				),
				width: mmsToPoints(template.container.width / 3 - 2),
				height: mmsToPoints(
					(template.container.height - template.header.height) / 3 - template.header.height / 2 - 1
				),
			});
		}
	}

	const pdfBytes = await pdfDoc.save();
	const blob = new Blob([pdfBytes], { type: "application/pdf" });
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");

	a.href = url;
	a.download = `${configuration.name}_lithos.pdf`;
	document.body.appendChild(a);

	a.click();

	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
