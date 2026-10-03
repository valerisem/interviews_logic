import { TopBar } from '@/components/TopBar';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <TopBar />
      <main className="login">
        <div className="stack-sm">
          <h1 className="title-md">Recruiter sign in</h1>
          <p className="body">Access candidate assessment results.</p>
        </div>
        <form method="post" action="/api/admin/login" className="stack">
          <label className="field">
            Password
            <input className="input" type="password" name="password" autoComplete="current-password" required autoFocus />
          </label>
          {error && <p className="error" role="alert">That password is not correct.</p>}
          <button type="submit" className="btn btn-primary">Sign in</button>
        </form>
      </main>
    </>
  );
}
