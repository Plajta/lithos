const TARGET_DB = -6;
const TARGET_AMPLITUDE = Math.pow(10, TARGET_DB / 20); // ~0.501

/** Sample rate expected by the device (22 kHz, mono, 16-bit PCM). */
export const TARGET_SAMPLE_RATE = 22000;

export async function normalizeAudio(blob: Blob): Promise<Blob> {
	const audioContext = new AudioContext();
	const arrayBuffer = await blob.arrayBuffer();
	const decoded = await audioContext.decodeAudioData(arrayBuffer);
	await audioContext.close();

	// Resample to the device sample rate and downmix to mono
	const offlineCtx = new OfflineAudioContext(
		1,
		Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE)),
		TARGET_SAMPLE_RATE,
	);
	const source = offlineCtx.createBufferSource();
	source.buffer = decoded;
	source.connect(offlineCtx.destination);
	source.start(0);

	const audioBuffer = await offlineCtx.startRendering();
	const samples = audioBuffer.getChannelData(0);

	let peak = 0;
	for (let i = 0; i < samples.length; i++) {
		const abs = Math.abs(samples[i]);
		if (abs > peak) peak = abs;
	}

	if (peak > 0) {
		const gain = TARGET_AMPLITUDE / peak;
		for (let i = 0; i < samples.length; i++) {
			samples[i] *= gain;
		}
	}

	// Encode as 16-bit PCM WAV
	const numChannels = 1;
	const sampleRate = TARGET_SAMPLE_RATE;
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
		const sample = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
		offset += 2;
	}

	return new Blob([buffer], { type: "audio/wav" });
}
