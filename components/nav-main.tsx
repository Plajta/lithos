"use client";

import { Collapsible } from "@radix-ui/react-collapsible";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { Serial } from "~/components/serial";
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
import { useEternityClient } from "~/hooks/useEternityClient";
import { useConfigurationStore } from "~/store/useConfigurationStore";
import { useDeviceStore } from "~/store/useDeviceStore";

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

	const { connected } = useDeviceStore();
	const { loadConfiguration } = useConfigurationStore();

	const { connect, client } = useEternityClient();

	return (
		<SidebarGroup>
			<div className="flex flex-col gap-2">
				<Button onClick={async () => await connect()} className="w-full" variant="outline">
					<p>Připojit Komunikátor</p>
				</Button>

				<Button
					onClick={async () => {
						const response = await client.info();

						console.log(response);
					}}
					className="w-full"
					variant="outline"
				>
					<p>poslat command</p>
				</Button>

				<Button asChild className="w-full" variant="outline">
					<Input
						type="file"
						onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
							const file = event.target.files?.[0];
							if (!file) return;

							const a = await client.push(file, "test");

							console.log(a);
						}}
					/>
				</Button>
			</div>

			{connected && (
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
