"use client";

import { Collapsible } from "@radix-ui/react-collapsible";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { useMemo } from "react";
import { Button } from "~/components/ui/button";

import { CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { Input } from "~/components/ui/input";

import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "~/components/ui/sidebar";
import { useProtocol } from "~/hooks/useProtocol";
import { useConfigurationStore } from "~/store/useConfigurationStore";

export interface NavItem {
	title: string;
	url: string;
	description: string;
	icon: LucideIcon;
	subItems: { title: string; url: string }[];
}

export function NavMain({ items }: { items: NavItem[] }) {
	const pathname = usePathname();
	const params = useParams();

	const { loadConfiguration } = useConfigurationStore();

	const { connect, protocol } = useProtocol();

	const usedTotal = useMemo(
		() =>
			protocol.connected
				? (
						(100 / (protocol.connected.info.blockSize * protocol.connected.info.blockCount)) *
						protocol.connected.info.usedBlockCount *
						protocol.connected.info.blockSize
				  ).toFixed(2)
				: null,
		[protocol]
	);

	return (
		<SidebarGroup>
			<div className="flex flex-col gap-2">
				{!protocol.connected && (
					<Button onClick={async () => await connect()} className="w-full" variant="outline">
						<p>Připojit Komunikátor</p>
					</Button>
				)}

				{protocol.connected && (
					<div>
						<div className="flex justify-center gap-3 border rounded-lg bg-white p-3 text-sm">
							<div className="flex flex-col justify-center">
								<div className="animate-pulse bg-green-500 w-2 h-2 rounded-2xl"></div>
							</div>

							<div className="flex flex-col align-top">
								<p>Připojeno zařízení: {protocol.connected.info.deviceName}</p>
								<p>
									Verze zařízení: {protocol.connected.info.version} (
									{protocol.connected.info.gitCommitSha})
								</p>
								<p>
									Využito: {usedTotal}% z{" "}
									{Math.round(
										(protocol.connected.info.blockSize * protocol.connected.info.blockCount) /
											1000000
									).toFixed(1)}{" "}
									MB
								</p>
							</div>
						</div>
					</div>
				)}

				<Button asChild className="w-full" variant="outline">
					<Input
						type="file"
						onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
							const file = event.target.files?.[0];
							if (!file) return;

							await loadConfiguration(file);
						}}
					/>
				</Button>
			</div>

			{protocol.connected && (
				<SidebarMenu>
					{items.map((item) => (
						<Collapsible
							key={item.title}
							asChild
							defaultOpen={item.url === pathname.replace(`/${params.sheetId}`, "")}
						>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip={item.title}>
									<a href={item.url}>
										<item.icon />
										<span>{item.title}</span>
									</a>
								</SidebarMenuButton>
								{item.subItems?.length ? (
									<>
										<CollapsibleTrigger asChild>
											<SidebarMenuAction className="data-[state=open]:rotate-90">
												<ChevronRight />
												<span className="sr-only">Toggle</span>
											</SidebarMenuAction>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub>
												{item.subItems?.map((subItem) => (
													<SidebarMenuSubItem key={subItem.title}>
														<SidebarMenuSubButton
															asChild
															isActive={pathname === subItem.url}
														>
															<a href={subItem.url}>
																<span>{subItem.title}</span>
															</a>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												))}
											</SidebarMenuSub>
										</CollapsibleContent>
									</>
								) : null}
							</SidebarMenuItem>
						</Collapsible>
					))}
				</SidebarMenu>
			)}
		</SidebarGroup>
	);
}
