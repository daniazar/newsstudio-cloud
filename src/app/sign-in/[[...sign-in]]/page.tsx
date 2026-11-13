import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <SignIn fallbackRedirectUrl="/newsroom" appearance={{ elements: { formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700' } }} />
    </div>
  );
}
