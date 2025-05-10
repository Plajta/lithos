"use client";

import { Button } from "~/components/ui/button";
import { useProtocol } from "~/components/protocol-context";
import { useConfigurationStore } from "~/store/useConfigurationStore";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Progress } from "~/components/ui/progress";

export function ConfigurationActions() {
	const [leftToUpload, setLeftToUpload] = useState<number | null>(null);

	const { configuration } = useConfigurationStore();
	const { protocol } = useProtocol();

	const progressStep = useMemo(() => (configuration ? 100 / configuration.buttons.length : null), [configuration]);

	const uploadInProgress = useMemo(
		() => (configuration && progressStep && leftToUpload ? true : false),
		[configuration, progressStep, leftToUpload]
	);

	const uploadAudioFiles = async () => {
		if (configuration) {
			for (const [index, button] of Object.entries(configuration.buttons)) {
				const audioBlob = await fetch(button.audioUrl).then((r) => r.blob());

				const response = await protocol.commands.push(audioBlob, `${configuration.colorCode}_${index}.wav`);

				if (response.success) {
					const leftStepCount = configuration.buttons.length - +index - 1;

					if (leftStepCount === 0) {
						toast.success("Konfigurace byla úspěšně nahrána!");
					}

					setLeftToUpload(leftStepCount === 0 ? null : leftStepCount);
				} else {
					toast.error(response.data as string);
					break;
				}
			}
		}
	};

	return (
		<div className="flex gap-2">
			<Button variant="outline" onClick={() => console.log("uložit")}>
				Uložit konfiguraci
			</Button>

			<Button variant="outline" disabled={uploadInProgress} onClick={async () => await uploadAudioFiles()}>
				<div className="flex flex-col">
					<p>Nahrát konfiguraci</p>

					{uploadInProgress && (
						<Progress className="rounded-sm h-1" value={100 - progressStep! * leftToUpload!} />
					)}
				</div>
			</Button>
		</div>
	);
}
