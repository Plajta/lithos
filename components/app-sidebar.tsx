"use client";

import { NavMain } from "~/components/nav-main";
import { Sidebar, SidebarHeader, SidebarRail } from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import { useModeStore } from "~/store/use-mode-store";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "@radix-ui/react-label";

export function AppSidebar() {
	const { mode, setDebug, setProd } = useModeStore();

	return (
		<Sidebar className="border-r-0">
			<SidebarHeader className="pl-0">
				<div className="flex justify-between items-center">
					<span className="pl-2 truncate font-bold text-xl">Plajta Lithos</span>

					{process.env.NODE_ENV === "development" && (
						<div className="flex items-center gap-1">
							<Checkbox
								id="mode"
								checked={mode === "DEBUG"}
								onCheckedChange={(state) => (state ? setDebug() : setProd())}
							/>
							<Label htmlFor="mode" className="text-sm">
								Debug mode
							</Label>
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
