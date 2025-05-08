"use client";

import { Loader2, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "~/components/ui/button";

interface VoiceButtonProps {
	source?: string;
}

export function VoiceButton({ source }: VoiceButtonProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const playSound = () => {
		if (audioRef.current) {
			setIsPlaying(true);
			audioRef.current.play();
		}
	};

	const handleAudioEnded = () => {
		setIsPlaying(false);
	};

	return (
		<div className="flex items-center justify-center">
			<Button variant="outline" onClick={playSound} disabled={!source}>
				{isPlaying ? <Loader2 className="animate-spin" /> : <Volume2 />}
			</Button>

			<audio ref={audioRef} src={source} onEnded={handleAudioEnded} style={{ display: "none" }} />
		</div>
	);
}
