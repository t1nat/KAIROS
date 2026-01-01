import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { OrgDashboardClient } from "~/components/OrgDashboardClient";

export default async function OrgsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <main id="main-content" className="min-h-screen bg-bg-primary">
      <div className="max-w-5xl mx-auto px-6 md:px-8 py-8">
        <OrgDashboardClient />
      </div>
    </main>
  );
}
