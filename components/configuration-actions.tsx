"use client";

import { Button } from "~/components/ui/button";
import { useProtocol } from "~/components/protocol-context";
import { useConfigurationStore } from "~/store/useConfigurationStore";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Progress } from "~/components/ui/progress";
import { Popover, PopoverContent, PopoverAnchor } from "~/components/ui/popover";
import { NewConfigurationPopover } from "~/components/new-configuration-popover";

export function ConfigurationActions() {
	const [leftToUpload, setLeftToUpload] = useState<number | null>(null);

	const [bytesLeft, setBytesLeft] = useState<number>(0);
	const [progressStep, setProgressStep] = useState<number>(0);

	const { configuration, getColorLookupTable, saveConfiguration, generateConfigurationPdf, loadConfiguration } =
		useConfigurationStore();
	const { protocol } = useProtocol();

	const uploadInProgress = useMemo(
		() => (configuration && progressStep && leftToUpload ? true : false),
		[configuration, progressStep, leftToUpload]
	);

	const totalItemsToUpload = useMemo(
		() => (configuration ? configuration.buttons.filter((button) => !!button.audioUrl).length : 0),
		[configuration]
	);

	const uploadConfiguration = async () => {
		if (configuration) {
			{
				const colorLookupTable = getColorLookupTable();

				const response = await protocol.commands.push(new Blob([colorLookupTable]), "color_lookup_table");

				if (!response.success) {
					toast.error(response.data as string);
					return;
				}
			}

			{
				await protocol.commands.push(
					new Blob([
						JSON.stringify([
							...protocol.connected!.info.loadedConfigurations,
							{
								colorCode: configuration.colorCode,
								name: configuration.name,
								uploadedAt: new Date().toISOString(),
								size: configuration.size,
							},
						]),
					]),
					"conf_info"
				);
			}

			if (configuration.buttons.length === 0) {
				return;
			}

			setLeftToUpload(totalItemsToUpload);

			for (const [index, button] of Object.entries(configuration.buttons)) {
				if (!button.audioUrl) {
					continue;
				}

				const audioBlob = await fetch(button.audioUrl).then((r) => r.blob());

				setBytesLeft(audioBlob.size);
				setProgressStep(100 / audioBlob.size);

				const response = await protocol.commands.push(
					audioBlob,
					`${configuration.colorCode}_${index}.wav`,
					setBytesLeft
				);

				if (response.success) {
					const leftStepCount = configuration.buttons.length - +index - 1;

					setBytesLeft(0);
					setProgressStep(0);

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
			<NewConfigurationPopover />

			<Button variant="outline" asChild>
				<label htmlFor="load-configuration-file">
					Nahrát kartu z disku
					<input
						id="load-configuration-file"
						accept=".zip"
						type="file"
						className="hidden cursor-pointer"
						onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
							const file = event.target.files?.[0];
							if (!file) return;

							loadConfiguration(file);
						}}
					/>
				</label>
			</Button>

			<Button variant="outline" onClick={async () => await saveConfiguration()} disabled={!configuration}>
				Uložit kartu na disk
			</Button>

			<Popover open={uploadInProgress}>
				<PopoverAnchor>
					<Button
						variant="outline"
						disabled={uploadInProgress || !configuration}
						onClick={async () => await uploadConfiguration()}
					>
						<p>Nahrát kartu do zařízení</p>
					</Button>
				</PopoverAnchor>

				<PopoverContent className="p-2 w-[250px] flex flex-col justify-between items-center gap-1">
					<p className="text-xs text-muted-foreground">
						{leftToUpload ?? 0} / {totalItemsToUpload}
					</p>

					<Progress className="rounded-sm h-1" value={100 - progressStep! * bytesLeft!} />
				</PopoverContent>
			</Popover>

			<Button variant="outline" onClick={async () => await generateConfigurationPdf()} disabled={!configuration}>
				Uložit pdf
			</Button>
		</div>
	);
}
