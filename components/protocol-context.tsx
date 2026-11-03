"use client";

import { createContext, Dispatch, SetStateAction, useContext, useEffect, useState } from "react";
import { useModeStore } from "~/store/use-mode-store";

const EOT = 0x04;
const CHUNK_SIZE = 1024;

const USB_VENDOR_ID = 0xcafe;
const APP_PRODUCT_ID = 0x6942;
const BOOTLOADER_PRODUCT_ID = 0x6940;

/** Eternity bootloader flash page size (`write` unit). */
export const FLASH_PAGE_SIZE = 256;
/** Eternity bootloader flash sector size (`erase` unit). */
export const FLASH_SECTOR_SIZE = 4096;

const DEVICE_RESPONSE = {
	ACK: "ack",
} as const;

type ProtocolType = "bootloader" | "sisyphus";

export interface FileSystemItem {
	name: string;
	type: "folder" | "directory";
	size: number | null;
}

export const LUT_FILE_NAME = "color_lookup_table";
export const VOLUME_SAMPLE_FILE_NAME = "volume_sample.wav";

/** System files that no action may remove or move. */
export const UNDELETABLE_FILES = [LUT_FILE_NAME, VOLUME_SAMPLE_FILE_NAME] as const;

export const PROTECTED_FILES = [...UNDELETABLE_FILES, "conf_info"] as const;

export function normalizeFileName(name: string): string {
	return name
		.replace(/[\x00-\x1f\x7f]/g, "")
		.trim()
		.replace(/^(\.?\/)+/, "");
}

export function isUndeletableFile(name: string): boolean {
	return (UNDELETABLE_FILES as readonly string[]).includes(normalizeFileName(name));
}

export function isProtectedFile(name: string): boolean {
	return (PROTECTED_FILES as readonly string[]).includes(normalizeFileName(name));
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
		/** Bootloader only: flash size in bytes. */
		flashSize: number | null;
		/** Bootloader only: bootloader size in bytes. */
		bootloaderSize: number | null;
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
	erase: number;
	write: number;
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
	ERASE: "erase",
	WRITE: "write",
	JUMP: "jump",
	RESET: "reset",
};

export const MODE = {
	PROD: "prod",
	DEBUG: "debug",
} as const;

type Response<T> = Promise<{ success: boolean; data: T | string }>;

interface ProtocolContextType {
	connect: (target?: "app" | "bootloader") => Promise<void>;
	disconnect: () => Promise<void>;
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
					| undefined,
			) => Response<CommandResponse["push"]>;
			ls: () => Response<CommandResponse["ls"]>;
			rm: (path: string, options?: { force?: boolean }) => Response<CommandResponse["rm"]>;
			mv: (path: string, dest: string) => Response<CommandResponse["mv"]>;
			play: (path: string) => Response<CommandResponse["play"]>;
			pull: (path: string) => Response<CommandResponse["pull"]>;
			erase: (address: number) => Response<CommandResponse["erase"]>;
			write: (address: number, page: Uint8Array) => Response<CommandResponse["write"]>;
			jump: () => Promise<void>;
			reset: () => Promise<void>;
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

	const { mode } = useModeStore();

	async function disconnect() {
		try {
			writer?.releaseLock();
			reader?.releaseLock();
			await serialPort?.close();
		} catch {
			// ignore errors during disconnect
		} finally {
			setWriter(null);
			setReader(null);
			setSerialPort(null);
			setProtocolInfo(null);
		}
	}

	async function connect(target: "app" | "bootloader" = "app") {
		if ("serial" in navigator) {
			const port = await navigator.serial.requestPort({
				filters: [
					{
						usbVendorId: USB_VENDOR_ID,
						usbProductId: target === "bootloader" ? BOOTLOADER_PRODUCT_ID : APP_PRODUCT_ID,
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
		const isBootloader = serialPort?.getInfo().usbProductId === BOOTLOADER_PRODUCT_ID;

		if (!protocolInfo && mode === "DEBUG" && !isBootloader) {
			const line = await readLine();

			console.log(line);
		}

		await sendCommand(COMMANDS.INFO);
		const response = await readLine();

		if (!response) {
			return {
				success: false,
				data: "Reading response from device failed.",
			};
		}

		if (response.startsWith("bootloader")) {
			const [type, deviceName, gitCommitSha, version, buildDate, flashSize, bootloaderSize] = response.split(" ");

			return {
				success: true,
				data: {
					type: type as ProtocolType,
					deviceName,
					gitCommitSha,
					version,
					buildDate: new Date(buildDate),
					blockCount: 0,
					usedBlockCount: 0,
					blockSize: 0,
					usesEternity: true,
					flashSize: +flashSize,
					bootloaderSize: +bootloaderSize,
					loadedConfigurations: [],
				},
			};
		}

		const [
			type,
			deviceName,
			gitCommitSha,
			version,
			buildDate,
			blockCount,
			usedBlockCount,
			blockSize,
			usesEternity,
		] = response.split(" ");

		const { success, data } = await pull("conf_info");

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
				usesEternity: usesEternity === "1",
				flashSize: null,
				bootloaderSize: null,
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
			| undefined,
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

	/** `force` bypasses the system file guard — only for the developer menu. */
	async function rm(path: string, options?: { force?: boolean }) {
		if (!options?.force && isUndeletableFile(path)) {
			return {
				success: false,
				data: `Removing ${normalizeFileName(path)} is not allowed.`,
			};
		}

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
		if (isUndeletableFile(source) || isUndeletableFile(dest)) {
			return {
				success: false,
				data: `Moving ${UNDELETABLE_FILES.join(", ")} is not allowed.`,
			};
		}

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
				? `${source} -> ${dest}`
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

	/** Bootloader: erase one flash sector. `address` must be sector aligned. */
	async function erase(address: number): Response<CommandResponse["erase"]> {
		if (address % FLASH_SECTOR_SIZE !== 0) {
			return { success: false, data: "Address must be sector aligned." };
		}

		await sendCommand(`${COMMANDS.ERASE} 0x${address.toString(16)}`);

		const response = await readLine();

		if (!response || !response.startsWith(DEVICE_RESPONSE.ACK)) {
			return {
				success: false,
				data: `Erasing flash failed. Error returned from the device: ${response}`,
			};
		}

		return { success: true, data: address };
	}

	/** Bootloader: write one flash page. `address` must be page aligned, `page` exactly one page long. */
	async function write(address: number, page: Uint8Array): Response<CommandResponse["write"]> {
		if (!writer) {
			return { success: false, data: "Writing data to device failed." };
		}

		if (address % FLASH_PAGE_SIZE !== 0) {
			return { success: false, data: "Address must be page aligned." };
		}

		if (page.length !== FLASH_PAGE_SIZE) {
			return { success: false, data: "Data must be exactly one page." };
		}

		await sendCommand(`${COMMANDS.WRITE} 0x${address.toString(16)}`);

		const response = await readLine();

		if (!response || !response.startsWith(DEVICE_RESPONSE.ACK)) {
			return {
				success: false,
				data: `Writing flash failed. Error returned from the device: ${response}`,
			};
		}

		// The device sends no confirmation after receiving the page.
		await writer.write(page);

		return { success: true, data: address };
	}

	/** Bootloader: jump to the main program. Breaks the connection. */
	async function jump() {
		await sendCommand(COMMANDS.JUMP);
		await disconnect();
	}

	/** App: reset into Eternity bootloader (or bootrom). Breaks the connection. */
	async function reset() {
		await sendCommand(COMMANDS.RESET);
		await disconnect();
	}

	return (
		<ProtocolContext.Provider
			value={{
				connect,
				disconnect,
				protocol: {
					connected: protocolInfo ? { info: protocolInfo } : null,
					commands: { info, push, ls, rm, mv, play, pull, erase, write, jump, reset, refreshInfo },
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
