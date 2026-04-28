const TARGET_DB = -6;
const TARGET_AMPLITUDE = Math.pow(10, TARGET_DB / 20); // ~0.501

export async function normalizeAudio(blob: Blob): Promise<Blob> {
	const audioContext = new AudioContext();
	const arrayBuffer = await blob.arrayBuffer();
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

	let peak = 0;
	for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
		const data = audioBuffer.getChannelData(ch);
		for (let i = 0; i < data.length; i++) {
			const abs = Math.abs(data[i]);
			if (abs > peak) peak = abs;
		}
	}

	if (peak > 0) {
		const gain = TARGET_AMPLITUDE / peak;
		for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
			const data = audioBuffer.getChannelData(ch);
			for (let i = 0; i < data.length; i++) {
				data[i] *= gain;
			}
		}
	}

	// Encode as 16-bit PCM WAV
	const numChannels = audioBuffer.numberOfChannels;
	const sampleRate = audioBuffer.sampleRate;
	const numSamples = audioBuffer.length;
	const bytesPerSample = 2;
	const dataSize = numChannels * numSamples * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);

	const writeString = (offset: number, str: string) => {
		for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
	};

	writeString(0, "RIFF");
	view.setUint32(4, 36 + dataSize, true);
	writeString(8, "WAVE");
	writeString(12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
	view.setUint16(32, numChannels * bytesPerSample, true);
	view.setUint16(34, 16, true);
	writeString(36, "data");
	view.setUint32(40, dataSize, true);

	let offset = 44;
	for (let i = 0; i < numSamples; i++) {
		for (let ch = 0; ch < numChannels; ch++) {
			const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(ch)[i]));
			view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
			offset += 2;
		}
	}

	await audioContext.close();
	return new Blob([buffer], { type: "audio/wav" });
}
