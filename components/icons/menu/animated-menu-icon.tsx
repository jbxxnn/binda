"use client";

import { useEffect, useRef } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import menuAnimation from "./menuV4.json";

interface AnimatedMenuIconProps {
  className?: string;
  size?: number;
  isOpen?: boolean;
  onClick?: () => void;
}

export function AnimatedMenuIcon({ 
  className = "", 
  size = 24, 
  isOpen = false,
  onClick 
}: AnimatedMenuIconProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (lottieRef.current) {
      if (isOpen) {
        // Play animation forward (to X state)
        lottieRef.current.playSegments([0, 21], true);
      } else {
        // Play animation backward (to hamburger state)
        lottieRef.current.playSegments([21, 0], true);
      }
    }
  }, [isOpen]);

  return (
    <div 
      className={`cursor-pointer ${className}`}
      onClick={onClick}
      style={{ width: size, height: size }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={menuAnimation}
        loop={false}
        autoplay={false}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
