import { Pencil, PlusCircleIcon, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface props {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[];
  isadmin?: boolean;
}
import { Link, useNavigate } from "react-router-dom";

export function NavMain({ items, isadmin }: props) {
  const navigate = useNavigate();
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {isadmin && (
            <SidebarMenuItem
              className="flex cursor-pointer items-center gap-2"
              onClick={() => {
                navigate("/newPost");
              }}
            >
              <SidebarMenuButton
                tooltip="Create Post"
                className="min-w-8 cursor-pointer bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              >
                <PlusCircleIcon />
                <span>Create Post</span>
              </SidebarMenuButton>
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 group-data-[collapsible=icon]:opacity-0"
                variant="outline"
              >
                <Pencil />
                <span className="sr-only">Inbox</span>
              </Button>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Link to={item.url} >
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  {item.title}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
