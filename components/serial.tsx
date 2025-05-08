"use client";

import { useEffect, useState } from "react";
// import { uploadSheet } from "~/actions/sheet/upload";
import { Button } from "~/components/ui/button";

const colors = {
	"#ff0000": "r",
	"#00ff00": "g",
	"#0000ff": "b",
	"#ffff00": "y",
	"#ff00ff": "m",
};

export function Serial() {
	const [serialSupported, setSerialSupported] = useState<boolean>(false);
	const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
	const [writer, setWriter] = useState<WritableStreamDefaultWriter<Buffer<ArrayBuffer>> | null>(null);

	useEffect(() => {
		setSerialSupported(typeof window !== "undefined" && navigator && "serial" in navigator);
	}, [setSerialSupported]);

	async function handleConnect() {
		if (serialSupported && "serial" in navigator && navigator.serial) {
			try {
				const filters: SerialPortRequestOptions["filters"] = [{ usbVendorId: 0x2e8a }];

				const port = await navigator.serial.requestPort({ filters });
				await port.open({ baudRate: 115200 });
				port.addEventListener;
				setSerialPort(port);

				const textDecoder = new TextDecoderStream();

				const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);

				const reader = textDecoder.readable.getReader();
				const newWriter = port.writable.getWriter();

				setWriter(newWriter);

				async function readData() {
					while (true) {
						const { value, done } = await reader.read();
						if (done) {
							reader.releaseLock();
							break;
						}

						console.log(value);
					}
				}

				readData().catch(console.error);
				await Promise.all([readableStreamClosed]);
			} catch (error) {
				console.error("Error connecting to serial device:", error);
			}
		}
	}

	async function handleSynchronization() {
		// if (writer) {
		// 	const resp = await uploadSheet();
		// 	if (!resp) {
		// 		return;
		// 	}
		// 	if (!resp.data) {
		// 		return;
		// 	}
		// 	for (const sheet of resp.data.data) {
		// 		for (const [rowIndex, row] of sheet.buttons.entries()) {
		// 			for (const [buttonIndex, button] of row.entries()) {
		// 				const voiceFile = button.files.find((file) => file.type === "VOICE");
		// 				if (voiceFile) {
		// 					const filename = `${
		// 						colors[sheet.colorCode as keyof typeof colors]
		// 					}${rowIndex}${buttonIndex}.wav`;
		// 					await writer.write(Buffer.from("send-data\n", "utf-8"));
		// 					await writer.write(Buffer.from("filename\n", "utf-8"));
		// 					await writer.write(Buffer.from(`${filename}\n`, "utf-8"));
		// 					const fileResponse = await fetch(`http://localhost:3000/api/file/${voiceFile.id}.wav`);
		// 					if (fileResponse.ok) {
		// 						const buffer = await fileResponse.bytes();
		// 						const chunkSize = 512;
		// 						const numOfChunks = Math.ceil(buffer.length / chunkSize);
		// 						for (let i = 0; i < numOfChunks; i++) {
		// 							console.log(i, numOfChunks);
		// 							const start = i * chunkSize;
		// 							const end = start + chunkSize;
		// 							const chunk = buffer.subarray(start, end);
		// 							const chunkWithNewline = Buffer.concat([chunk, Buffer.from("\n")]);
		// 							await writer.write(chunkWithNewline);
		// 						}
		// 						await writer.write(Buffer.from("end-data\n", "utf-8"));
		// 					}
		// 				}
		// 			}
		// 		}
		// 	}
		// }
	}

	return (
		<Button
			onClick={async () => (serialPort ? await handleSynchronization() : await handleConnect())}
			className="w-full"
			variant="outline"
		>
			{serialPort ? <p>Synchronizovat Komunikátor</p> : <p>Připojit Komunikátor</p>}
		</Button>
	);
}
