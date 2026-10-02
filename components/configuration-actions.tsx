"use client";

import { Button } from "~/components/ui/button";
import { FileSystemItem, isLutFile, LUT_FILE_NAME, useProtocol } from "~/components/protocol-context";
import { useConfigurationStore } from "~/store/useConfigurationStore";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Progress } from "~/components/ui/progress";
import { Popover, PopoverContent, PopoverAnchor } from "~/components/ui/popover";
import { NewConfigurationPopover } from "~/components/new-configuration-popover";
import { ConfirmationButton } from "~/components/confirmation-button";
import { normalizeAudio } from "~/lib/normalize-audio";

export function ConfigurationActions() {
	const [currentItem, setCurrentItem] = useState<number | null>(null);

	const [bytesLeft, setBytesLeft] = useState<number>(0);
	const [bytesTotal, setBytesTotal] = useState<number>(0);

	const { configuration, saveConfiguration, generateConfigurationPdf, loadConfiguration, getColorLookupTable } =
		useConfigurationStore();
	const { protocol } = useProtocol();

	const uploadInProgress = !!configuration && currentItem !== null;

	const totalItemsToUpload = useMemo(
		() => (configuration ? configuration.buttons.filter((button) => !!button.audioUrl).length : 0),
		[configuration],
	);

	const duplicateConfiguration = useMemo(
		() =>
			!!configuration &&
			!!protocol.connected &&
			protocol.connected.info.loadedConfigurations.some((item) => item.colorCode === configuration.colorCode),
		[protocol, configuration],
	);

	const ensureColorLookupTable = async () => {
		const { success, data } = await protocol.commands.ls();

		if (!success) {
			toast.error(data as string);
			return false;
		}

		if ((data as FileSystemItem[]).some((file) => isLutFile(file.name))) {
			return true;
		}

		const response = await protocol.commands.push(new Blob([getColorLookupTable()]), LUT_FILE_NAME, {});

		if (!response.success) {
			toast.error(response.data as string);
			return false;
		}

		return true;
	};

	const uploadConfiguration = async () => {
		if (configuration) {
			if (!(await ensureColorLookupTable())) {
				return;
			}

			const contents = [
				JSON.stringify([
					...protocol.connected!.info.loadedConfigurations.filter(
						(conf) => conf.colorCode !== configuration.colorCode,
					),
					{
						colorCode: configuration.colorCode,
						name: configuration.name,
						uploadedAt: new Date().toISOString(),
						size: configuration.size,
					},
				]),
			];

			await protocol.commands.push(new Blob(contents), "conf_info", {});

			if (configuration.buttons.length === 0) {
				return;
			}

			try {
				let uploadedCount = 0;

				for (const [indexStr, button] of Object.entries(configuration.buttons)) {
					const i = Number(indexStr);

					if (!button.audioUrl) {
						continue;
					}

					setCurrentItem(uploadedCount + 1);
					setBytesTotal(0);
					setBytesLeft(0);

					const rawAudioBlob = await fetch(button.audioUrl).then((r) => r.blob());
					const audioBlob = await normalizeAudio(rawAudioBlob);

					setBytesTotal(audioBlob.size);
					setBytesLeft(audioBlob.size);

					const row = Math.floor(i / 4);

					const col = i % 4;

					const color = configuration.colorCode.toLowerCase().substring(0, 1);

					const fileName = `${color}_${row}_${col}.wav`;

					console.log(fileName);

					const response = await protocol.commands.push(audioBlob, fileName, {
						setBytesLeft,
					});

					if (response.success) {
						uploadedCount++;

						if (uploadedCount === totalItemsToUpload) {
							toast.success("Konfigurace byla úspěšně nahrána!");
						}
					} else {
						toast.error(response.data as string);
						break;
					}
				}
			} finally {
				setCurrentItem(null);
				setBytesTotal(0);
				setBytesLeft(0);
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
					{duplicateConfiguration ? (
						<ConfirmationButton
							disclaimer="Opravdu chcete přepsat aktuálně nahranou kartu?"
							action={async () => await uploadConfiguration()}
						>
							<Button
								variant="outline"
								disabled={uploadInProgress || !protocol.connected || !configuration}
							>
								<p>Nahrát kartu do zařízení</p>
							</Button>
						</ConfirmationButton>
					) : (
						<Button
							variant="outline"
							disabled={uploadInProgress || !protocol.connected || !configuration}
							onClick={async () => await uploadConfiguration()}
						>
							<p>Nahrát kartu do zařízení</p>
						</Button>
					)}
				</PopoverAnchor>

				<PopoverContent className="p-2 w-[250px] flex flex-col justify-between items-center gap-1">
					<p className="text-xs text-muted-foreground">
						{currentItem ?? 0} / {totalItemsToUpload}
					</p>

					<Progress
						className="rounded-sm h-1"
						value={bytesTotal ? (100 * (bytesTotal - bytesLeft)) / bytesTotal : 0}
					/>
				</PopoverContent>
			</Popover>

			<Button variant="outline" onClick={async () => await generateConfigurationPdf()} disabled={!configuration}>
				Uložit pdf
			</Button>
		</div>
	);
}
