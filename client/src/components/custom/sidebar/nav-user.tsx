import { ChevronsUpDown, LogOut, Sparkles } from "lucide-react";
import { useState } from "react"; // Add this import

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { type UserInterface } from "@/lib/ability";

import api from "@/lib/axiosinstance";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { useAuthStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";

export function NavUser({ user }: { user: UserInterface }) {
  const { isMobile } = useSidebar();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    try {
      const res = await api.post("/user/logout");

      if (res.status === 200) {
        useAuthStore.setState({ user: null });
        toast.success(res.data.message);
      }
      console.log("Logout response:", res);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const navigate = useNavigate();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem className="cursor-pointer">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <div className="flex items-center gap-2 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={
                      user.avatar ||
                      "https://thumbs.dreamstime.com/b/generative-ai-young-smiling-man-avatar-man-brown-beard-mustache-hair-wearing-yellow-sweater-sweatshirt-d-vector-people-279560903.jpg"
                    }
                    alt={user.name}
                  />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={ user.avatar ||
                        "https://thumbs.dreamstime.com/b/generative-ai-young-smiling-man-avatar-man-brown-beard-mustache-hair-wearing-yellow-sweater-sweatshirt-d-vector-people-279560903.jpg"
                      }
                      alt={user.name}
                    />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  navigate("/profile");
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  setShowLogoutDialog(true);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to log out?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will end your current session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLogoutDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleLogout();
                setShowLogoutDialog(false);
              }}
            >
              Yes, log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
