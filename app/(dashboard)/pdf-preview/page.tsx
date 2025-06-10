"use client";

import { PDFDocument, rgb, PageSizes, StandardFonts } from "pdf-lib";
import { useEffect, useState } from "react";
import fontkit from "@pdf-lib/fontkit";

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

const DebugFrames = false;

export default function Page() {
	const [url, setUrl] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			const pdfDoc = await PDFDocument.create();
			const page = pdfDoc.addPage(PageSizes.A4);

			const fontBytes = await fetch("https://pdf-lib.js.org/assets/ubuntu/Ubuntu-R.ttf").then((res) =>
				res.arrayBuffer()
			);

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

			page.drawText("Zakladní příkazy", {
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

			const pdfBytes = await pdfDoc.save();
			const blob = new Blob([pdfBytes], { type: "application/pdf" });
			const url = URL.createObjectURL(blob);
			setUrl(url + "#zoom=70%&navbar=0&toolbar=0");
		})();
	}, []);

	return <p className="p-4">{url && <iframe id="pdf-preview" width="100%" height="800px" src={url}></iframe>}</p>;
}
