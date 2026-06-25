import { loginAction } from "@/app/login/actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="shell" style={{ paddingTop: 56 }}>
      <section className="panel" style={{ maxWidth: 520, margin: "0 auto" }}>
        <span className="pill">Vendor and admin login</span>
        <h1 style={{ marginTop: 16 }}>Sign in to Binda</h1>
        <p className="muted">
          Vendors only see their own business records. Admins can oversee all businesses, enquiries,
          and approvals.
        </p>
        <form action={loginAction}>
          <label>
            Email
            <input name="email" type="email" placeholder="owner@example.com" required />
          </label>
          <label>
            Password
            <input name="password" type="password" placeholder="Your password" required />
          </label>
          <button type="submit">Login</button>
        </form>
        {params.error ? (
          <p style={{ color: "var(--danger)", marginTop: 14 }}>{decodeURIComponent(params.error)}</p>
        ) : null}
      </section>
    </main>
  );
}
