"use client";

import { createContext, useContext, useEffect, useState } from "react";

const EOT = 0x04;
const CHUNK_SIZE = 1024;

const DEVICE_RESPONSE = {
	ACK: "ack",
} as const;

type ProtocolType = "bootloader" | "sisyphus";

interface FileSystemItem {
	name: string;
	type: "folder" | "directory";
	size: number | null;
}

interface CommandResponse {
	info: {
		type: ProtocolType;
		deviceName: string;
		gitCommitSha: string;
		version: string;
		buildDate: Date;
		blockCount: number;
		usedBlockCount: number;
		blockSize: number;
		usesEternity: boolean;
	};
	push: {
		filePath: string;
		bytesWritten: number;
	};
	ls: FileSystemItem[];
	rm: string;
}

function crc32(buf: Uint8Array) {
	const table = new Uint32Array(256).map((_, i) => {
		let c = i;
		for (let j = 0; j < 8; j++) {
			c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
		}
		return c >>> 0;
	});

	let crc = 0 ^ -1;
	for (let i = 0; i < buf.length; i++) {
		crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
	}
	return (crc ^ -1) >>> 0;
}

const COMMANDS = {
	INFO: "info",
	PUSH: "push",
	LS: "ls",
	RM: "rm",
};

type Response<T> = Promise<{ success: boolean; data: T | string }>;

interface ProtocolContextType {
	connect: () => Promise<void>;
	protocol: {
		connected: { info: CommandResponse["info"] } | null;
		commands: {
			info: () => Response<CommandResponse["info"]>;
			push: (fileBlob: Blob, dest: string) => Response<CommandResponse["push"]>;
			ls: () => Response<CommandResponse["ls"]>;
			rm: (path: string) => Response<CommandResponse["rm"]>;
		};
	};
}

const decoder = new TextDecoder();
const encoder = new TextEncoder();

const ProtocolContext = createContext<ProtocolContextType | undefined>(undefined);

export function ProtocolProvider({ children }: { children: React.ReactNode }) {
	const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
	const [writer, setWriter] = useState<WritableStreamDefaultWriter<Uint8Array> | null>(null);
	const [reader, setReader] = useState<ReadableStreamBYOBReader | null>(null);
	const [protocolInfo, setProtocolInfo] = useState<CommandResponse["info"] | null>(null);

	async function connect() {
		if ("serial" in navigator) {
			const port = await navigator.serial.requestPort();
			await port.open({ baudRate: 115200 });

			const writer = port.writable!.getWriter();
			const reader = port.readable!.getReader({ mode: "byob" });

			setWriter(writer);
			setReader(reader);
			setSerialPort(port);
		}
	}

	useEffect(() => {
		(async () => await refreshInfo())();
	}, [writer, reader]);

	async function readLine(waitForEot = false): Promise<string | null> {
		if (!reader) return null;

		let line = "";

		while (true) {
			const buffer = new Uint8Array(CHUNK_SIZE);
			const { value, done } = await reader.read(buffer);
			if (done) break;
			if (value && value.byteLength > 0) {
				line += decoder.decode(value, { stream: true });
				if (line.includes(waitForEot ? String.fromCharCode(EOT) : "\n")) break;
			}
		}

		if (waitForEot) {
			line = line.replace(String.fromCharCode(EOT), "");
		}

		return line.trim();
	}

	async function sendCommand(cmd: string) {
		if (!writer) return;
		const text = typeof cmd === "string" ? cmd : new TextDecoder().decode(cmd);
		const encoded = encoder.encode(text + String.fromCharCode(EOT));
		await writer.write(encoded);
	}

	async function refreshInfo() {
		if (writer && reader) {
			const response = await info();

			if (response.success) {
				setProtocolInfo(response.data as CommandResponse["info"]);
			}
		}
	}

	async function info(): Response<CommandResponse["info"]> {
		await sendCommand(COMMANDS.INFO);
		const response = await readLine();

		if (!response) {
			return {
				success: false,
				data: "Reading response from device failed.",
			};
		}

		const [type, deviceName, gitCommitSha, version, buildDate, blockCount, usedBlockCount, blockSize] = response
			.slice(0, -2)
			.split(" ");

		return {
			success: true,
			data: {
				type: type as ProtocolType,
				deviceName,
				gitCommitSha,
				version,
				buildDate: new Date(buildDate),
				blockCount: +blockCount,
				usedBlockCount: +usedBlockCount,
				blockSize: +blockSize,
				usesEternity: !response[response.length],
			},
		};
	}

	async function push(fileBlob: Blob, dest: string): Response<CommandResponse["push"]> {
		if (!writer) {
			return {
				success: false,
				data: "Writing data to device failed.",
			};
		}

		const arrayBuffer = await fileBlob.arrayBuffer();
		const buffer = new Uint8Array(arrayBuffer);
		const size = buffer.length;
		const checksum = crc32(buffer);

		await sendCommand(`${COMMANDS.PUSH} ${dest} ${size} ${checksum}`);
		let sent = 0;

		while (sent < size) {
			const response = await readLine();

			if (response) {
				if (!response.startsWith(DEVICE_RESPONSE.ACK)) {
					console.log(response);

					return {
						success: false,
						data: `Device returned unxpected response. Error returned from the device: ${response}`,
					};
				}

				const chunk = buffer.slice(sent, sent + CHUNK_SIZE);
				await writer.write(chunk);
				sent += chunk.length;
			}
		}

		const finalResponse = await readLine();

		if (!finalResponse) {
			return {
				success: false,
				data: "Device returned unxpected response. Push failed.",
			};
		}

		if (!finalResponse.startsWith(DEVICE_RESPONSE.ACK)) {
			return {
				success: false,
				data: `Writing data to device failed. Error returned from the device: ${finalResponse}`,
			};
		}

		await refreshInfo();

		return {
			success: true,
			data: {
				filePath: dest,
				bytesWritten: sent,
			},
		};
	}

	async function ls(): Response<CommandResponse["ls"]> {
		await sendCommand(COMMANDS.LS);

		const data = await readLine(true);

		if (!data) {
			return {
				success: false,
				data: "Device returned unxpected response. Ls failed.",
			};
		}

		const items: FileSystemItem[] = [];

		const lines = data.split("\n");

		for (const line of lines) {
			const parts = line.split(" ");

			// ukazatele current & parent slozek - asi pak rozlisovat i slozky??
			if (parts.length === 2) {
				continue;
			}

			const [itemName, itemType, itemSize] = parts;

			items.push({
				name: itemName,
				type: itemType === "f" ? "folder" : "directory",
				size: itemSize ? +itemSize : null,
			});
		}

		return { success: true, data: items };
	}

	async function rm(path: string) {
		await sendCommand(`${COMMANDS.RM} ${path}`);

		const response = await readLine();

		if (!response) {
			return {
				success: false,
				data: "Device returned unxpected response. Rm failed.",
			};
		}

		await refreshInfo();

		return {
			success: response.startsWith(DEVICE_RESPONSE.ACK),
			data: response.startsWith(DEVICE_RESPONSE.ACK)
				? path
				: `Removing data from device failed. Error returned from the device: ${response}`,
		};
	}

	return (
		<ProtocolContext.Provider
			value={{
				connect,
				protocol: {
					connected: protocolInfo ? { info: protocolInfo } : null,
					commands: { info, push, ls, rm },
				},
			}}
		>
			{children}
		</ProtocolContext.Provider>
	);
}

export function useProtocol() {
	const context = useContext(ProtocolContext);
	if (!context) throw new Error("useProtocol must be used within a ProtocolProvider");
	return context;
}
