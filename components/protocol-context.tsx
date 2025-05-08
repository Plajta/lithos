"use client";

import { createContext, useContext, useEffect, useState } from "react";

const EOT = 0x04;

type ProtocolType = "bootloader" | "sisyphus";

interface ProtocolInfo {
	type: ProtocolType;
	deviceName: string;
	gitCommitSha: string;
	version: string;
	buildDate: Date;
	blockCount: number;
	usedBlockCount: number;
	blockSize: number;
	usesEternity: boolean;
}

const COMMANDS = {
	INFO: "info",
};

interface ProtocolContextType {
	connect: () => Promise<void>;
	protocol: {
		connected: { info: ProtocolInfo } | null;
		commands: {
			info: () => Promise<ProtocolInfo | undefined>;
		};
	};
}

const ProtocolContext = createContext<ProtocolContextType | undefined>(undefined);

export function ProtocolProvider({ children }: { children: React.ReactNode }) {
	const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
	const [writer, setWriter] = useState<WritableStreamDefaultWriter<string> | null>(null);
	const [reader, setReader] = useState<ReadableStreamDefaultReader<string> | null>(null);
	const [protocolInfo, setProtocolInfo] = useState<ProtocolInfo | null>(null);

	async function connect() {
		if ("serial" in navigator) {
			const port = await navigator.serial.requestPort();
			await port.open({ baudRate: 115200 });

			const encoder = new TextEncoderStream();
			encoder.readable.pipeTo(port.writable);
			const writer = encoder.writable.getWriter();

			const decoder = new TextDecoderStream();
			port.readable.pipeTo(decoder.writable);
			const reader = decoder.readable.getReader();

			setWriter(writer);
			setReader(reader);
			setSerialPort(port);
		}
	}

	useEffect(() => {
		async function readInfo() {
			if (writer && reader) {
				const infoData = await info();
				if (infoData) {
					setProtocolInfo(infoData);
				}
			}
		}
		readInfo();
	}, [writer, reader]);

	async function readLine() {
		if (!reader) return null;
		let line = "";
		while (true) {
			const { value, done }: ReadableStreamReadResult<string> = await reader.read();
			if (done || !value) return line.trim();
			line += value;
			if (line.includes("\n")) return line.trim();
		}
	}

	async function sendCommand(cmd: string) {
		if (!writer) return;
		const text = typeof cmd === "string" ? cmd : new TextDecoder().decode(cmd);
		await writer.write(text + String.fromCharCode(EOT));
	}

	async function info(): Promise<ProtocolInfo | undefined> {
		await sendCommand(COMMANDS.INFO);
		const response = await readLine();
		if (response) {
			const [type, deviceName, gitCommitSha, version, buildDate, blockCount, usedBlockCount, blockSize] = response
				.slice(0, -2)
				.split(" ");

			return {
				type: type as ProtocolType,
				deviceName,
				gitCommitSha,
				version,
				buildDate: new Date(buildDate),
				blockCount: +blockCount,
				usedBlockCount: +usedBlockCount,
				blockSize: +blockSize,
				usesEternity: !response[response.length],
			};
		}
	}

	return (
		<ProtocolContext.Provider
			value={{
				connect,
				protocol: {
					connected: protocolInfo ? { info: protocolInfo } : null,
					commands: { info },
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
