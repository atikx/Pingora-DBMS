"use client";

import React, { useRef, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Menu } from "lucide-react";
import LoadingBar from "react-top-loading-bar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarTrigger } from "../ui/sidebar";

// Define types for LoadingBar ref
interface LoadingBarRef {
  continuousStart: (startingValue?: number, refreshRate?: number) => void;
  staticStart: (startingValue?: number) => void;
  complete: () => void;
  increase: (value: number) => void;
}

import { useAuthStore } from "@/lib/store";

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const loadingBarRef = useRef<LoadingBarRef | null>(null);
  const [search, setSearch] = useState("");
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // Array for categories
  const categories = [
    { name: "Technology", href: "/filter/Technology" },
    { name: "Business", href: "/filter/Business" },
    { name: "Sports", href: "/filter/Sports" },
    { name: "Entertainment", href: "/filter/Entertainment" },
    { name: "Science", href: "/filter/Science" },
    { name: "Health", href: "/filter/Health" },
    { name: "Current Affairs", href: "/filter/Current Affairs" },
  ];

  // Trigger loading bar on route changes
  useEffect(() => {
    if (loadingBarRef.current) {
      loadingBarRef.current.continuousStart();

      // Complete the loading after a short delay
      const timer = setTimeout(() => {
        if (loadingBarRef.current) {
          loadingBarRef.current.complete();
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [location]);

  const handleSearch = () => {
    if (search !== "") {
      navigate(`/search/${search}`);
    } else {
      toast.info("Please enter a search term");
    }
  };

  return (
    <>
      <LoadingBar
        className="text-primary"
        ref={loadingBarRef}
        height={3}
        shadow={true}
      />
      <nav className="sticky top-0 z-50 ">
        <div className="w-full max-w-full">
          <div className="flex h-16 px-4  pr-8 items-center justify-between bg-white/80 backdrop-blur-xs backdrop-filter border-b border-gray-200/20">
            
            {/* Left Section: Sidebar + Logo */}
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-12 min-w-0 flex-shrink-0">
              {user && <SidebarTrigger className="cursor-pointer flex-shrink-0" />}
              
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">
                  PINGORA
                </span>
              </Link>
            </div>

            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden lg:flex items-center space-x-1">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent hover:bg-white/10">
                      Categories
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="bg-white/80 backdrop-blur-md backdrop-filter  rounded-lg border border-gray-200/20">
                      <div className="grid gap-3 p-4 w-[200px]">
                        {categories.map((category, index) => (
                          <NavLink
                            key={index}
                            to={category.href}
                            className={({ isActive }) =>
                              isActive
                                ? "px-4 py-2 bg-white/30 rounded-md text-primary font-medium"
                                : "px-4 py-2 hover:bg-white/30 rounded-md"
                            }
                          >
                            {category.name}
                          </NavLink>
                        ))}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavLink
                      to="/"
                      className={({ isActive }) =>
                        isActive
                          ? "bg-white/10 px-4 py-2 rounded-md text-primary font-medium"
                          : "bg-transparent hover:bg-white/10 px-4 py-2 rounded-md"
                      }
                    >
                      Home
                    </NavLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavLink
                      to="https://github.com/atikx"
                      target="_blank"
                      className="bg-transparent hover:bg-white/10 px-4 py-2 rounded-md"
                    >
                      About Me
                    </NavLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            {/* Right Section: Search + User + Mobile Menu */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              
              {/* Search Box - Responsive */}
              <div className="relative hidden sm:flex items-center gap-2 lg:gap-4">
                <div className="relative">
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="w-[150px] md:w-[200px] lg:w-[250px] rounded-full bg-white/50 backdrop-blur-sm border-gray-200/20 pl-10 pr-4"
                    onChange={(e) => setSearch(e.target.value)}
                    value={search}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <Button 
                  onClick={handleSearch} 
                  className="cursor-pointer hidden md:inline-flex"
                  size="sm"
                >
                  Search
                </Button>
              </div>

              {/* User Profile - Responsive */}
              {user ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-gray-200/20">
                    <AvatarImage
                      src={
                        user?.avatar ||
                        "https://thumbs.dreamstime.com/b/generative-ai-young-smiling-man-avatar-man-brown-beard-mustache-hair-wearing-yellow-sweater-sweatshirt-d-vector-people-279560903.jpg"
                      }
                      alt="User"
                    />
                    <AvatarFallback>
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline-flex font-medium text-sm lg:text-base truncate max-w-[100px]">
                    {user?.name?.split(" ")[0] || "Guest"}
                  </span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => navigate("/auth")}
                >
                  Log in
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="lg:hidden flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10"
                  >
                    <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="bg-white/80 backdrop-blur-lg backdrop-filter p-6 w-[280px] sm:w-[300px] rounded-l-xl shadow-xl"
                >
                  <div className="space-y-6">
                    <div className="text-xl font-semibold text-primary border-b pb-2">
                      Menu
                    </div>

                    {/* Mobile Search */}
                    <div className="sm:hidden">
                      <div className="text-md font-medium text-gray-900 mb-2">
                        Search
                      </div>
                      <div className="relative flex gap-2">
                        <Input
                          type="search"
                          placeholder="Search Anything"
                          className="flex-1 rounded-full bg-white/50 backdrop-blur-sm border-gray-200/20 pl-10 pr-4"
                          onChange={(e) => setSearch(e.target.value)}
                          value={search}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Button onClick={handleSearch} size="sm">
                          Go
                        </Button>
                      </div>
                    </div>

                    {/* Mobile Login Button */}
                    {!user && (
                      <div className="sm:hidden">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            navigate("/auth");
                            setIsOpen(false);
                          }}
                        >
                          Log in
                        </Button>
                      </div>
                    )}

                    {/* Categories */}
                    <div>
                      <div className="text-md font-medium text-gray-900 mb-2">
                        Categories
                      </div>
                      <div className="space-y-2 pl-2">
                        {categories.map((category, index) => (
                          <NavLink
                            key={index}
                            to={category.href}
                            className={({ isActive }) =>
                              isActive
                                ? "block text-primary font-semibold"
                                : "block text-gray-800 hover:text-primary"
                            }
                            onClick={() => setIsOpen(false)}
                          >
                            {category.name}
                          </NavLink>
                        ))}
                      </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="space-y-2">
                      <NavLink
                        to="/"
                        className={({ isActive }) =>
                          isActive
                            ? "block text-primary font-semibold"
                            : "block text-gray-900 hover:text-primary"
                        }
                        onClick={() => setIsOpen(false)}
                      >
                        Home
                      </NavLink>
                      <NavLink
                        to="https://github.com/atikx"
                        target="_blank"
                        className="block text-gray-900 hover:text-primary"
                        onClick={() => setIsOpen(false)}
                      >
                        About Me
                      </NavLink>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
