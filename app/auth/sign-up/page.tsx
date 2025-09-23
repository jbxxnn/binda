import { SignUpForm } from "@/components/sign-up-form";
import Image from "next/image";
import Link from "next/link";

export default function Page() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
    <div className="flex flex-col gap-4 p-6 md:p-10 bg-brand-lightning">
      <div className="flex justify-center gap-2 md:justify-start">
        <Link href="/" className="flex items-center">
          <Image
            src="/BINDA.png"
            alt="Binda Logo"
            width={120}
            height={40}
            className="h-8 w-auto"
          />
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm">
        <SignUpForm />
        </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/sign-up.jpg"
          alt="Image"
          width={500}
          height={500}
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
