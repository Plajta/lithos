import { Loader2, Plus, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { VoiceRecorder } from "~/components/voice-recorder";

interface VoiceButtonProps {
	source: string | null;
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
			{source ? (
				<Button variant="outline" onClick={playSound} disabled={!source}>
					{isPlaying ? <Loader2 className="animate-spin" /> : <Volume2 />}
				</Button>
			) : (
				<Popover>
					<PopoverTrigger asChild>
						<Button variant="outline">
							<Plus />
						</Button>
					</PopoverTrigger>

					<PopoverContent className="p-2 w-[--radix-popover-trigger-width]">
						<VoiceRecorder />
					</PopoverContent>
				</Popover>
			)}

			{source && <audio ref={audioRef} src={source} onEnded={handleAudioEnded} style={{ display: "none" }} />}
		</div>
	);
}
