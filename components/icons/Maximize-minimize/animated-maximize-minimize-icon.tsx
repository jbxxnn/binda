"use client";

import { useEffect, useRef } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import maximizeMinimizeAnimation from "./maximizeMinimize.json";

interface AnimatedMaximizeMinimizeIconProps {
  className?: string;
  size?: number;
  isMaximized?: boolean;
  onClick?: () => void;
}

export function AnimatedMaximizeMinimizeIcon({ 
  className = "", 
  size = 24, 
  isMaximized = false,
  onClick 
}: AnimatedMaximizeMinimizeIconProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (lottieRef.current) {
      if (isMaximized) {
        // Play animation forward (to minimize state)
        lottieRef.current.playSegments([0, 10], true);
      } else {
        // Play animation backward (to maximize state)
        lottieRef.current.playSegments([10, 0], true);
      }
    }
  }, [isMaximized]);

  return (
    <div 
      className={`cursor-pointer ${className}`}
      onClick={onClick}
      // eslint-disable-next-line react/forbid-dom-props
      style={{ width: size, height: size }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={maximizeMinimizeAnimation}
        loop={false}
        autoplay={false}
        className="w-full h-full"
      />
    </div>
  );
}
