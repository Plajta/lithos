"use client";

import { AppSidebar } from "~/components/app-sidebar";

import { PageBreadcrumb } from "~/components/page-breadcrumb";
import { Separator } from "~/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider>
			<AppSidebar sheets={[]} />
			<SidebarInset>
				<header className="flex h-14 shrink-0 items-center gap-2">
					<div className="flex flex-1 items-center gap-2 px-3">
						<SidebarTrigger />
						<Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
						<PageBreadcrumb />
					</div>
				</header>
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
