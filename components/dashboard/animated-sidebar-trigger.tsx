"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { AnimatedMaximizeMinimizeIcon } from "@/components/icons/Maximize-minimize/animated-maximize-minimize-icon";

interface AnimatedSidebarTriggerProps {
  className?: string;
  size?: number;
}

export function AnimatedSidebarTrigger({ 
  className = "", 
  size = 24 
}: AnimatedSidebarTriggerProps) {
  const { toggleSidebar, state } = useSidebar();
  const isExpanded = state === "expanded";

  return (
    <AnimatedMaximizeMinimizeIcon
      className={className}
      size={size}
      isMaximized={isExpanded}
      onClick={toggleSidebar}
    />
  );
}
