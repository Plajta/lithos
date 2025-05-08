"use client";

import { useState } from "react";

const EOT = 0x04;

interface ProtocolInfo {
	type: "bootloader" | "sysiphus";
	deviceName: string;
	gitCommitSha: string;
	version: string;
	buildDate: Date;
	blockCount: number;
	freeBlockCount: number;
	blockSize: number;
	usesEternity: boolean;
}

const COMMANDS = {
	INFO: "info",
};

export function useProtocol() {
	const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
	const [writer, setWriter] = useState<WritableStreamDefaultWriter<string> | null>(null);
	const [reader, setReader] = useState<ReadableStreamDefaultReader<string> | null>(null);

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

	async function readLine() {
		if (!reader) {
			return null;
		}

		let line = "";

		while (true) {
			const { value, done }: ReadableStreamReadResult<string> = await reader.read();

			if (done || !value) {
				return line.trim();
			}

			line += value;

			if (line.includes("\n")) {
				return line.trim();
			}
		}
	}

	async function sendCommand(cmd: string) {
		if (!writer) {
			return null;
		}

		const text = typeof cmd === "string" ? cmd : new TextDecoder().decode(cmd);
		await writer.write(text + String.fromCharCode(EOT));
	}

	async function info() {
		await sendCommand(COMMANDS.INFO);
		const response = await readLine();

		if (response) {
			const [type, deviceName, gitCommitSha, version, buildDate, blockCount, freeBlockCount, blockSize] = response
				.slice(0, -2)
				.split(" ");

			console.log(response);

			return {
				type,
				deviceName,
				gitCommitSha,
				version,
				buildDate: new Date(buildDate),
				blockCount: +blockCount,
				freeBlockCount: +freeBlockCount,
				blockSize: +blockSize,
				usesEternity: !response[response.length],
			} as ProtocolInfo;
		}
	}

	return { connect, protocol: { info } };
}
