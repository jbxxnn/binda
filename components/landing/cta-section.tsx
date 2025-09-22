import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-brand-hunter to-brand-underworld">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          See Binda in action
        </h2>
        <p className="text-xl text-gray-200 mb-8">
          Join thousands of businesses already using Binda to streamline their operations and grow faster.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg" className="bg-brand-tropical text-white hover:bg-brand-tropical/90 rounded-sm px-8 py-3">
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-brand-hunter rounded-sm px-8 py-3">
              Contact Sales
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
