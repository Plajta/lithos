"use client";

import { Button } from "~/components/ui/button";
import {
	FileSystemItem,
	LUT_FILE_NAME,
	normalizeFileName,
	useProtocol,
	VOLUME_SAMPLE_FILE_NAME,
} from "~/components/protocol-context";
import { useConfigurationStore } from "~/store/useConfigurationStore";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Progress } from "~/components/ui/progress";
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

	/** Uploads default system files (LUT, volume sample) that are missing on the device. */
	const ensureSystemFiles = async () => {
		const { success, data } = await protocol.commands.ls();

		if (!success) {
			toast.error(data as string);
			return false;
		}

		const existingFiles = (data as FileSystemItem[]).map((file) => normalizeFileName(file.name));

		const defaultFiles = [
			{ name: LUT_FILE_NAME, load: async () => new Blob([getColorLookupTable()]) },
			{
				name: VOLUME_SAMPLE_FILE_NAME,
				load: async () => {
					const response = await fetch(`/${VOLUME_SAMPLE_FILE_NAME}`);

					if (!response.ok) {
						throw new Error(`Načtení ${VOLUME_SAMPLE_FILE_NAME} selhalo (${response.status}).`);
					}

					return await response.blob();
				},
			},
		];

		for (const defaultFile of defaultFiles) {
			if (existingFiles.includes(defaultFile.name)) {
				continue;
			}

			let fileBlob: Blob;

			try {
				fileBlob = await defaultFile.load();
			} catch (error) {
				toast.error((error as Error).message);
				return false;
			}

			const response = await protocol.commands.push(fileBlob, defaultFile.name, {});

			if (!response.success) {
				toast.error(response.data as string);
				return false;
			}
		}

		return true;
	};

	const uploadConfiguration = async () => {
		if (configuration) {
			if (!(await ensureSystemFiles())) {
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

	const uploadProgress =
		currentItem !== null && totalItemsToUpload
			? (100 * (currentItem - 1 + (bytesTotal ? (bytesTotal - bytesLeft) / bytesTotal : 0))) / totalItemsToUpload
			: 0;

	const uploadButton = (
		<Button
			variant="outline"
			className={`relative overflow-hidden ${uploadInProgress ? "disabled:opacity-100" : ""}`}
			disabled={uploadInProgress || !protocol.connected || !configuration}
			onClick={duplicateConfiguration ? undefined : async () => await uploadConfiguration()}
		>
			{uploadInProgress ? `Nahrávání ${currentItem} / ${totalItemsToUpload}` : "Nahrát kartu do zařízení"}

			{uploadInProgress && (
				<Progress className="absolute bottom-0 left-0 rounded-none h-1" value={uploadProgress} />
			)}
		</Button>
	);

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

			{duplicateConfiguration ? (
				<ConfirmationButton
					disclaimer="Opravdu chcete přepsat aktuálně nahranou kartu?"
					action={async () => await uploadConfiguration()}
				>
					{uploadButton}
				</ConfirmationButton>
			) : (
				uploadButton
			)}

			<Button variant="outline" onClick={async () => await generateConfigurationPdf()} disabled={!configuration}>
				Uložit pdf
			</Button>
		</div>
	);
}
