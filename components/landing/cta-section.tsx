import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CTASection() {
  return (
    <section className="py-32 bg-brand-underworld">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-left md:text-center text-3xl md:text-4xl mb-6 text-brand-mint">
          See Binda in Action
        </h2>
        <p className="text-left md:text-center text-xl text-brand-snowman mb-8">
          Join thousands of businesses already using Binda to streamline their operations and grow faster.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg" className="bg-brand-mint text-brand-hunter hover:bg-brand-mint/90 rounded-sm px-8 py-3">
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" size="lg" className="border-white text-brand-hunter hover:bg-white hover:text-brand-hunter rounded-sm px-8 py-3">
              Contact Us
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
