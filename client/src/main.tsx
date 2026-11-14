import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/custom/sidebar/AppSidebar.tsx";
import { Navbar } from "./components/custom/Navbar.tsx";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "./lib/store.ts";
import api from "./lib/axiosinstance.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "./components/custom/ErrorBoundary.tsx";

const init = async () => {
  // const user: UserInterface | null = {
  //   id: "1",
  //   name: "Atiksh gupta",
  //   email: "atiksh@example.com",
  //   isadmin: true,
  //   avatar:
  //     "https://thumbs.dreamstime.com/b/generative-ai-young-smiling-man-avatar-man-brown-beard-mustache-hair-wearing-yellow-sweater-sweatshirt-d-vector-people-279560903.jpg",
  // };

  // fetching the user from the server
  try {
    const res = await api.get("/user/getuser");
    const user = res.data.user;
    if (user) {
      useAuthStore.getState().setUser(user);
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }

  const Root = () => {
    const user = useAuthStore((state) => state.user);
    const queryClient = new QueryClient();

    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Toaster position="bottom-right" closeButton={true} />
            <SidebarProvider defaultOpen={false}>
              {user && <AppSidebar collapsible="icon" />}
              <div className="flex min-h-screen relative w-screen overflow-x-clip flex-col ">
                <ErrorBoundary>
                  <Navbar />
                </ErrorBoundary>
                <ErrorBoundary>
                  <App />
                </ErrorBoundary>
              </div>
            </SidebarProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  };

  createRoot(document.getElementById("root")!).render(<Root />);
};

init();
