import * as React from "react";
import {
  ClipboardListIcon,
  Key,
  Heart,
  SettingsIcon,
  UsersIcon,
  Newspaper,
  PlusCircleIcon,
} from "lucide-react";

import { NavDocuments } from "./nav-documents";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Atikx",
    email: "atikx@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Subriptions",
      url: "/subscriptions",
      icon: UsersIcon,
    },
    {
      title: "Liked Posts",
      url: "/likedPosts",
      icon: Heart,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: SettingsIcon,
    },
  ],
  admin: [
    {
      name: "New Post",
      url: "/newPost",
      icon: PlusCircleIcon,
    },
    {
      name: "Your Posts",
      url: "/yourPosts",
      icon: ClipboardListIcon,
    },
    {
      name: "Admin Requests",
      url: "/adminRequests",
      icon: Key,
    }
  ],
};

import { useAuthStore } from "@/lib/store";
import { defineAbilityFor } from "@/lib/ability";
import { Can } from "@casl/react";
import { Link } from "react-router-dom";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore((state) => state);
  if (!user) {
    return null; // or a loading state, or redirect to login, etc.
  }
  const ability = defineAbilityFor(user);
  ability.can("create", "Post");

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to="/">
                <Newspaper className="h-5 w-5" />
                <span className="text-base font-semibold">PINGORA</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain isadmin={ability.can("create", "post")} items={data.navMain} />

        {/* admin only starts */}
        <Can I="create" a="Post" ability={ability}>
          {() => <NavDocuments items={data.admin} />}
        </Can>
        {/* admin only ends */}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="cursor-pointer">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
