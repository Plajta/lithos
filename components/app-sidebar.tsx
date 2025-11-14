"use client";

import { NavMain } from "~/components/nav-main";
import { Sidebar, SidebarHeader, SidebarRail } from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import { MODE, useProtocol } from "~/components/protocol-context";

export function AppSidebar({ sheets }: { sheets: any[] }) {
	const { protocol } = useProtocol();

	return (
		<Sidebar className="border-r-0">
			<SidebarHeader className="pl-0">
				<div className="flex justify-between items-center">
					<span className="pl-2 truncate font-bold text-xl">Plajta Lithos</span>

					{protocol && protocol.connected && protocol.connected.info.mode === MODE.DEBUG && (
						<div className="flex justify-center items-center text-center font-bold rounded-sm bg-orange-600 text-xs px-4 h-6 text-white">
							DEBUG
						</div>
					)}
				</div>

				<Separator />

				<NavMain />
			</SidebarHeader>

			<SidebarRail />
		</Sidebar>
	);
}
