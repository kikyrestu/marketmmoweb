import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { SidebarNav } from "@/components/layouts/sidebar-nav"
import { DashboardHeader } from "@/components/layouts/dashboard-header"
import { DashboardShell } from "@/components/layouts/dashboard-shell"

const sidebarNavItems = [
	{ title: "Overview", href: "/dashboard/seller" },
	{ title: "Items", href: "/dashboard/seller/items" },
	{ title: "Orders", href: "/dashboard/seller/orders" },
	{ title: "Chat", href: "/conversations" },
	{ title: "Settings", href: "/dashboard/seller/settings" },
]

interface DashboardSellerLayoutProps {
	children?: React.ReactNode
}

export default async function DashboardSellerLayout({
	children,
}: DashboardSellerLayoutProps) {
	const session = await getServerSession(authOptions)

	if (!session) {
		redirect("/auth/signin")
	}

	if (session.user.role !== "SELLER") {
		redirect("/dashboard")
	}

	return (
		<DashboardShell>
			<DashboardHeader
				heading="Seller Dashboard"
				text="Manage your items and orders."
			/>
			<div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
				<aside className="-mx-4 lg:w-1/5">
					<SidebarNav items={sidebarNavItems} />
				</aside>
				<div className="flex-1 lg:max-w-2xl">{children}</div>
			</div>
		</DashboardShell>
	)
}
