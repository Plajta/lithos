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
import { useProtocol } from "~/components/protocol-context";
import { ProtocolInfo } from "~/components/protocol-info";
import { CollapsibleTrigger, Collapsible, CollapsibleContent } from "~/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { Separator } from "~/components/ui/separator";
import { ColorDot } from "~/components/color-dot";

export function NavMain() {
	const { connect, protocol } = useProtocol();

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
						<Collapsible key={item.uploadedAt} asChild>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip={item.name}>
									<span>
										<ColorDot size={10} value={`#${item.colorCode}`} />

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
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					))}
				</SidebarMenu>
			)}
		</SidebarGroup>
	);
}
