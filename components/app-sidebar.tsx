"use client";

import { NavMain } from "~/components/nav-main";
import { Sidebar, SidebarHeader, SidebarRail } from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";

export function AppSidebar({ sheets }: { sheets: any[] }) {
	return (
		<Sidebar className="border-r-0">
			<SidebarHeader className="pl-0">
				<span className="pl-2 truncate font-bold text-xl">Plajta Lithos</span>

				<Separator />

				<NavMain />
			</SidebarHeader>

			<SidebarRail />
		</Sidebar>
	);
}
