"use client";

// import { useState } from "react";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { 
  // Search, 
  Gift, 
  Bell, 
  ChevronDown,
  User,
  // Menu
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  // const [searchTerm, setSearchTerm] = useState("");

  return (
    <header className="h-[4.1rem] border-b bg-brand-lightning border-brand-tropical px-6 flex items-center justify-between">
      {/* Left Side - Mobile Menu & Logo */}
      <div className="flex items-center space-x-4">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-xl font-bold text-brand-hunter">Binda</h1>
      </div>

      {/* Center - Search Bar (hidden on mobile) */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        {/* <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-12 h-10 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
            ⌘K
          </div>
        </div> */}
      </div>

      {/* Right Side - User Actions & Profile */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Action Icons (hidden on mobile) */}
        <Button variant="ghost" size="sm" className="hidden md:flex h-8 w-8 p-0">
          <Gift className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="hidden md:flex h-8 w-8 p-0">
          <Bell className="h-4 w-4" />
        </Button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2 hover:bg-gray-50">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-teal-700" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">User Name</div>
                <div className="text-xs text-gray-500">ID: 1234567</div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

