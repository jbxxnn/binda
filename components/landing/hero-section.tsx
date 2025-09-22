"use client";

// import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
// import { ChevronDown } from "lucide-react";
// import Link from "next/link";
// import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Dark Overlay */}
      <div className="absolute inset-0 bg-gray-900">
        <div className="absolute inset-0 bg-black/60"></div>
        {/* Professional office background - you can replace this with an actual image */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900"></div>
        {/* <Image src="/placeholder.svg" alt="Hero Background" fill className="object-cover" /> */}
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
    <div className="flex flex-col items-center justify-between min-h-[110vh] py-20">

        <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-wrap gap-3 mb-8 justify-between mt-10">
            <div className="flex flow-row gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium">
                Since 2020
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium flex items-center">
                Your Partner in Business Growth
                <ArrowRight className="ml-2 w-4 h-4" />
              </div>
              </div>
             <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium flex items-center">
              Behind the Expertise
              <ArrowRight className="ml-2 w-4 h-4" />
             </div>
         </div>
        </div>

    <div className="flex flex-row w-full justify-between items-center">
          
          {/* Left Side - Main Content */}
        <div className="text-left mb-12 lg:mb-0">

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Your Business,
              <br />
              <span className="text-brand-tropical">Organized with</span>
              <br />
              Simplicity and Ease
            </h1>
            
            {/* Sub-headline */}
            <p className="text-xl text-gray-200 mb-8 max-w-lg">
              Smart, compliant, and stress-free business solutions tailored to your business&apos;s needs.
            </p>

            {/* Feature Badge */}
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 text-white text-sm font-medium inline-flex items-center mb-8">
              Professional
              <span className="mx-4">✖</span>
              Accurate
              <span className="mx-4">✖</span>
              On Time
            </div>
          </div>

          {/* Right Side - CTA */}
          <div className="items-center lg:items-end">

            {/* Main CTA */}
            {/* <div className="text-center lg:text-right">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-brand-tropical text-white hover:bg-brand-tropical/90 rounded-full px-12 py-4 text-lg font-semibold mb-4">
                  Get Started
                </Button>
              </Link>
              <div className="flex flex-col items-center lg:items-end">
                <ChevronDown className="w-8 h-8 text-white animate-bounce" />
              </div>
            </div> */}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
