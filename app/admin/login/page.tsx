import { TopBar } from '@/components/TopBar';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <TopBar />
      <main className="login">
        <h1 className="title-md">Recruiter <span className="accent">Sign In</span></h1>
        <form method="post" action="/api/admin/login" className="stack">
          <label className="field">
            Password
            <input className="input" type="password" name="password" autoComplete="current-password" required autoFocus />
          </label>
          {error && <p className="error" role="alert">That password is not correct.</p>}
          <button type="submit" className="btn btn-primary">Sign In</button>
        </form>
      </main>
    </>
  );
}
