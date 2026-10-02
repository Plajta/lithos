"use client";

import { Button } from "~/components/ui/button";

import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
} from "~/components/ui/sidebar";
import { FileSystemItem, isProtectedFile, isUndeletableFile, useProtocol } from "~/components/protocol-context";
import { ProtocolInfo } from "~/components/protocol-info";
import { CollapsibleTrigger, Collapsible, CollapsibleContent } from "~/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { Separator } from "~/components/ui/separator";
import { ColorDot } from "~/components/color-dot";
import { COLOR_LOOKUP_TABLE } from "~/store/useConfigurationStore";
import { toast } from "sonner";
import { ConfirmationButton } from "~/components/confirmation-button";
import { Progress } from "~/components/ui/progress";
import { useState } from "react";

export function NavMain() {
	const { connect, disconnect, protocol } = useProtocol();

	const [clearProgress, setClearProgress] = useState<{ done: number; total: number } | null>(null);

	async function clearCommunicator() {
		const { success, data } = await protocol.commands.ls();

		if (!success) {
			toast.error(data as string);
			return;
		}

		const filesToRemove = (data as FileSystemItem[]).filter((file) => !isUndeletableFile(file.name));
		const failedFiles: string[] = [];

		try {
			setClearProgress({ done: 0, total: filesToRemove.length });

			for (const [index, file] of filesToRemove.entries()) {
				const response = await protocol.commands.rm(file.name);

				if (!response.success) {
					failedFiles.push(file.name);
				}

				setClearProgress({ done: index + 1, total: filesToRemove.length });
			}
		} finally {
			setClearProgress(null);
		}

		if (failedFiles.length > 0) {
			toast.error(`Nepodařilo se smazat ${failedFiles.length} souborů: ${failedFiles.join(", ")}`);
			return;
		}

		toast.success("Komunikátor byl úspěšně vyčištěn.");
	}

	async function deleteConfiguration(color: string) {
		const { success, data } = await protocol.commands.ls();

		if (!success) {
			toast.error(data as string);
			return;
		}

		// Audio files are named `${colorInitial}_${row}_${col}.wav` — match the full prefix,
		// otherwise system files sharing the initial (e.g. CYAN vs. color_lookup_table / conf_info)
		// would be deleted too.
		const fileMask = `${color.toLowerCase().substring(0, 1)}_`;

		for (const file of data as FileSystemItem[]) {
			if (isProtectedFile(file.name)) {
				continue;
			}

			if (!file.name.startsWith(fileMask)) {
				continue;
			}

			await protocol.commands.rm(file.name);
		}

		const contents = [
			JSON.stringify([
				...protocol.connected!.info.loadedConfigurations.filter((conf) => conf.colorCode !== color),
			]),
		];

		await protocol.commands.push(new Blob(contents), "conf_info", {});

		toast.success("Konfigurace byla úspěšně smazána.");
	}

	return (
		<SidebarGroup>
			<div className="flex flex-col gap-2">
				{!protocol.connected && (
					<Button
						onClick={async () => {
							await connect();
						}}
						className="w-full"
						variant="outline"
					>
						<p>Připojit Komunikátor</p>
					</Button>
				)}

				<ProtocolInfo />
			</div>

			{protocol.connected && (
				<SidebarMenu>
					<Button variant="outline" className="w-full mt-2" onClick={async () => await disconnect()}>
						Odpojit komunikátor
					</Button>

					<ConfirmationButton
						disclaimer="POZOR! Tato akce je nevratná, opravdu chcete smazat všechny soubory?"
						side="right"
						destructive
						action={async () => await clearCommunicator()}
					>
						<Button
							variant="outline"
							className="w-full text-destructive hover:text-destructive"
							disabled={!!clearProgress}
						>
							{clearProgress ? "Mazání souborů..." : "Vyčistit komunikátor"}
						</Button>
					</ConfirmationButton>

					{clearProgress && (
						<div className="flex flex-col gap-1 mt-1">
							<p className="text-xs text-muted-foreground text-center">
								Smazáno {clearProgress.done} / {clearProgress.total}
							</p>

							<Progress
								className="rounded-sm h-1"
								value={clearProgress.total ? (100 * clearProgress.done) / clearProgress.total : 100}
							/>
						</div>
					)}

					<Separator className="my-2" />

					<p className="text-sm font-semibold">Nahrané konfigurace</p>

					{protocol.connected.info.loadedConfigurations.map((item) => (
						<Collapsible key={item.uploadedAt as any} asChild>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip={item.name}>
									<span>
										<ColorDot
											size={10}
											value={`#${
												COLOR_LOOKUP_TABLE[item.colorCode as keyof typeof COLOR_LOOKUP_TABLE]
											}`}
										/>

										{item.name}
									</span>
								</SidebarMenuButton>

								<CollapsibleTrigger asChild>
									<SidebarMenuAction className="data-[state=open]:rotate-90">
										<ChevronRight />
										<span className="sr-only">Toggle</span>
									</SidebarMenuAction>
								</CollapsibleTrigger>

								<CollapsibleContent>
									<SidebarMenuSub className="text-sm">
										<div>
											<p>Nahráno:</p>
											{new Date(item.uploadedAt as any).toLocaleString()}
										</div>
									</SidebarMenuSub>

									<SidebarMenuSub className="text-sm">
										<div className="flex justify-between">
											<p>Velikost:</p>
											{Math.round(item.size / 1000).toFixed(0)} Kb
										</div>
									</SidebarMenuSub>

									<SidebarMenuSub className="text-sm">
										<ConfirmationButton
											disclaimer="Opravdu chcete smazat konfiguraci?"
											side="right"
											destructive
											action={async () => await deleteConfiguration(item.colorCode)}
										>
											<Button size="sm" variant="outline" className="text-sm h-6">
												Smazat
											</Button>
										</ConfirmationButton>
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					))}
				</SidebarMenu>
			)}
		</SidebarGroup>
	);
}
