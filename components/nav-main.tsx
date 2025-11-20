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
import { FileSystemItem, useProtocol } from "~/components/protocol-context";
import { ProtocolInfo } from "~/components/protocol-info";
import { CollapsibleTrigger, Collapsible, CollapsibleContent } from "~/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { Separator } from "~/components/ui/separator";
import { ColorDot } from "~/components/color-dot";
import { COLOR_LOOKUP_TABLE } from "~/store/useConfigurationStore";
import { toast } from "sonner";
import { ConfirmationButton } from "~/components/confirmation-button";

export function NavMain() {
	const { connect, protocol } = useProtocol();

	async function deleteConfiguration(color: string) {
		const { success, data } = await protocol.commands.ls();

		if (!success) {
			toast.error(data as string);
			return;
		}

		const fileMask = color.toLowerCase().substring(0, 1);

		for (const file of data as FileSystemItem[]) {
			if (fileMask !== file.name.substring(0, 1)) {
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
