"use client";

import { createContext, Dispatch, SetStateAction, useContext, useEffect, useState } from "react";

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
		mode: (typeof MODE)[keyof typeof MODE];
		deviceName: string;
		gitCommitSha: string;
		version: string;
		buildDate: Date;
		blockCount: number;
		usedBlockCount: number;
		blockSize: number;
		usesEternity: boolean;
		loadedConfigurations: ConfigurationInfo[];
	};
	push: {
		filePath: string;
		bytesWritten: number;
	};
	ls: FileSystemItem[];
	rm: string;
	mv: string;
	play: string;
	pull: Blob;
}

interface ConfigurationInfo {
	colorCode: string;
	name: string;
	uploadedAt: Date;
	size: number;
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
	MV: "mv",
	PLAY: "play",
	PULL: "pull",
};

export const MODE = {
	PROD: "prod",
	DEBUG: "debug",
} as const;

type Response<T> = Promise<{ success: boolean; data: T | string }>;

interface ProtocolContextType {
	connect: () => Promise<void>;
	protocol: {
		connected: { info: CommandResponse["info"] } | null;
		commands: {
			info: () => Response<CommandResponse["info"]>;
			push: (
				fileBlob: Blob,
				dest: string,
				options:
					| {
							setBytesLeft?: Dispatch<SetStateAction<number>>;
					  }
					| undefined
			) => Response<CommandResponse["push"]>;
			ls: () => Response<CommandResponse["ls"]>;
			rm: (path: string) => Response<CommandResponse["rm"]>;
			mv: (path: string, dest: string) => Response<CommandResponse["mv"]>;
			play: (path: string) => Response<CommandResponse["play"]>;
			pull: (path: string) => Response<CommandResponse["pull"]>;
			refreshInfo: () => Promise<void>;
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
			const port = await navigator.serial.requestPort({
				filters: [
					{
						usbVendorId: 0xcafe,
						usbProductId: 0x6942,
					},
				],
			});

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
		/*
		const mode = await (async function () {
		    if (protocolInfo) {
		        return protocolInfo.mode;
		    }
		
		    const readPromise = readLine();
		
		    const timeoutPromise = new Promise<string | null>(resolve =>
		        setTimeout(() => resolve(null), 300)
		    );
		
		    const welcomeMessage = await Promise.race([readPromise, timeoutPromise]);
		
		    if (typeof welcomeMessage === "string" && welcomeMessage.includes("DEBUG")) {
		        return MODE.DEBUG;
		    }
		
		    return MODE.PROD;
		})();
		*/

		const mode = MODE.PROD;
		
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

		const { success, data } = await pull("conf_info");

		return {
			success: true,
			data: {
				type: type as ProtocolType,
				mode,
				deviceName,
				gitCommitSha,
				version,
				buildDate: new Date(buildDate),
				blockCount: +blockCount,
				usedBlockCount: +usedBlockCount,
				blockSize: +blockSize,
				usesEternity: !response[response.length],
				loadedConfigurations: success ? JSON.parse(await (data as Blob).text()) : [],
			},
		};
	}

	async function push(
		fileBlob: Blob,
		dest: string,
		options:
			| {
					setBytesLeft?: Dispatch<SetStateAction<number>>;
			  }
			| undefined
	): Response<CommandResponse["push"]> {
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
					return {
						success: false,
						data: `Device returned unxpected response. Error returned from the device: ${response}`,
					};
				}

				const chunk = buffer.slice(sent, sent + CHUNK_SIZE);
				await writer.write(chunk);
				sent += chunk.length;

				if (options && options.setBytesLeft) {
					options.setBytesLeft((prev) => prev - chunk.length);
				}
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
				data: `Writing data to device failed. Error returned from the device: ${finalResponse} ${dest} ${checksum}`,
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

	async function mv(source: string, dest: string) {
		await sendCommand(`${COMMANDS.MV} ${source} ${dest}`);

		const response = await readLine();

		if (!response) {
			return {
				success: false,
				data: "Device returned unxpected response. Mv failed.",
			};
		}

		return {
			success: response.startsWith(DEVICE_RESPONSE.ACK),
			data: response.startsWith(DEVICE_RESPONSE.ACK)
				? dest
				: `Moving data on the device failed. Error returned from the device: ${response}`,
		};
	}

	async function play(path: string) {
		await sendCommand(`${COMMANDS.PLAY} ${path}`);

		const response = await readLine();

		if (!response) {
			return {
				success: false,
				data: "Device returned unxpected response. Play failed.",
			};
		}

		return {
			success: response.startsWith(DEVICE_RESPONSE.ACK),
			data: response.startsWith(DEVICE_RESPONSE.ACK)
				? path
				: `Playing file failed. Error returned from the device: ${response}`,
		};
	}

	async function pull(dest: string): Response<CommandResponse["pull"]> {
		if (!writer) {
			return {
				success: false,
				data: "Writing data to device failed.",
			};
		}

		if (!reader) {
			return {
				success: false,
				data: "Reading data from device failed.",
			};
		}

		await sendCommand(`${COMMANDS.PULL} ${dest}`);

		const response = await readLine();

		if (!response || !response.startsWith(DEVICE_RESPONSE.ACK)) {
			return {
				success: false,
				data: `Device returned unexpected response. Pull failed. - ${response}`,
			};
		}

		const parsedResponse = response.split(" ");
		const size = parseInt(parsedResponse[1], 10);
		const expectedChecksum = parseInt(parsedResponse[2], 10);

		const fullData = new Uint8Array(size);
		let totalReceived = 0;

		while (totalReceived < size) {
			await sendCommand(DEVICE_RESPONSE.ACK);

			const bytesExpectedInThisChunk = Math.min(CHUNK_SIZE, size - totalReceived);

			let bytesReadForCurrentChunk = 0;

			while (bytesReadForCurrentChunk < bytesExpectedInThisChunk) {
				const buffer = new Uint8Array(CHUNK_SIZE);
				const { value, done } = await reader.read(buffer);

				if (done) {
					return {
						success: false,
						data: `Stream closed unexpectedly after ${totalReceived} bytes.`,
					};
				}

				if (value) {
					fullData.set(value, totalReceived + bytesReadForCurrentChunk);

					bytesReadForCurrentChunk += value.byteLength;
				}
			}

			totalReceived += bytesExpectedInThisChunk;
		}

		const actualChecksum = crc32(fullData);

		if (actualChecksum !== expectedChecksum) {
			return {
				success: false,
				data: `Checksum mismatch! Expected ${expectedChecksum}, got ${actualChecksum}`,
			};
		}

		const blob = new Blob([fullData]);

		if (blob.size === 0) {
			return {
				success: false,
				data: `File has 0 bytes`,
			};
		}

		return {
			success: true,
			data: blob,
		};
	}

	return (
		<ProtocolContext.Provider
			value={{
				connect,
				protocol: {
					connected: protocolInfo ? { info: protocolInfo } : null,
					commands: { info, push, ls, rm, mv, play, pull, refreshInfo },
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
