"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FLASH_PAGE_SIZE, FLASH_SECTOR_SIZE, useProtocol } from "~/components/protocol-context";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Progress } from "~/components/ui/progress";

interface FlashProgress {
	phase: "erase" | "write";
	done: number;
	total: number;
}

/** Firmware update via Eternity bootloader. Mirrors eternity/protocol/flasher.py. */
export function FirmwareUpdate({ onLog }: { onLog: (line: string) => void }) {
	const [firmware, setFirmware] = useState<File | null>(null);
	const [progress, setProgress] = useState<FlashProgress | null>(null);

	const { connect, protocol } = useProtocol();

	const info = protocol.connected?.info;
	const isBootloader = info?.type === "bootloader";

	async function flashFirmware() {
		if (!firmware || !info) {
			return;
		}

		const data = new Uint8Array(await firmware.arrayBuffer());
		const size = data.length;

		if (size === 0) {
			toast.error("Soubor s firmwarem je prázdný!");
			return;
		}

		if (info.flashSize !== null && info.bootloaderSize !== null && size > info.flashSize - info.bootloaderSize) {
			toast.error("Firmware je větší než dostupná flash paměť!");
			return;
		}

		const sectorCount = Math.ceil(size / FLASH_SECTOR_SIZE);
		const pageCount = Math.ceil(size / FLASH_PAGE_SIZE);

		try {
			onLog(`Mazání ${sectorCount} sektorů...`);
			setProgress({ phase: "erase", done: 0, total: sectorCount });

			for (let sector = 0; sector < sectorCount; sector++) {
				const response = await protocol.commands.erase(sector * FLASH_SECTOR_SIZE);

				if (!response.success) {
					onLog(`Chyba na sektoru ${sector}: ${response.data}`);
					toast.error(`Mazání flash selhalo na sektoru ${sector}.`);
					return;
				}

				setProgress({ phase: "erase", done: sector + 1, total: sectorCount });
			}

			onLog(`Nahrávání ${firmware.name} (${size} B, ${pageCount} stránek)...`);
			setProgress({ phase: "write", done: 0, total: pageCount });

			for (let page = 0; page < pageCount; page++) {
				// Pad the last page with 0xFF (erased flash value).
				const pageData = new Uint8Array(FLASH_PAGE_SIZE).fill(0xff);
				pageData.set(data.subarray(page * FLASH_PAGE_SIZE, (page + 1) * FLASH_PAGE_SIZE));

				const response = await protocol.commands.write(page * FLASH_PAGE_SIZE, pageData);

				if (!response.success) {
					onLog(`Chyba na stránce ${page}: ${response.data}`);
					toast.error(`Zápis flash selhal na stránce ${page}.`);
					return;
				}

				setProgress({ phase: "write", done: page + 1, total: pageCount });
			}

			onLog(`Firmware ${firmware.name} nahrán, spouštím aplikaci.`);
			await protocol.commands.jump();

			toast.success("Firmware byl úspěšně aktualizován. Připojte Komunikátor znovu.");
		} finally {
			setProgress(null);
		}
	}

	return (
		<div className="flex flex-col gap-2">
			<p className="text-sm">Aktualizace firmwaru</p>

			{!protocol.connected && (
				<Button variant="outline" size="sm" onClick={async () => await connect("bootloader")}>
					Připojit bootloader
				</Button>
			)}

			{protocol.connected && !isBootloader && (
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={!info?.usesEternity}
						onClick={async () => {
							onLog("Restartuji do bootloaderu...");
							await protocol.commands.reset();
						}}
					>
						Restartovat do bootloaderu
					</Button>

					<p className="text-xs text-muted-foreground">
						{info?.usesEternity
							? "Po restartu klikněte na „Připojit bootloader“."
							: "Firmware nepoužívá Eternity bootloader."}
					</p>
				</div>
			)}

			{isBootloader && (
				<div className="grid grid-cols-3 gap-2">
					<Input
						type="file"
						accept=".bin"
						className="h-8 col-span-2"
						disabled={!!progress}
						onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
							setFirmware(event.target.files?.[0] ?? null)
						}
					/>

					<Button
						variant="outline"
						size="sm"
						disabled={!firmware || !!progress}
						onClick={async () => await flashFirmware()}
					>
						Nahrát firmware
					</Button>

					<Button
						variant="outline"
						size="sm"
						disabled={!!progress}
						onClick={async () => await protocol.commands.jump()}
					>
						Spustit aplikaci (jump)
					</Button>
				</div>
			)}

			{progress && (
				<div className="flex flex-col gap-1">
					<p className="text-xs text-muted-foreground">
						{progress.phase === "erase" ? "Mazání" : "Zápis"}: {progress.done} / {progress.total}
					</p>

					<Progress className="rounded-sm h-1" value={(100 * progress.done) / progress.total} />
				</div>
			)}
		</div>
	);
}
