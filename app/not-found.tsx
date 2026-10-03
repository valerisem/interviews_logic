import { TopBar } from '@/components/TopBar';

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="page center">
        <h1 className="title-md">Link not found</h1>
        <p className="body">This assessment link is not valid. Please check the link or contact your recruiter.</p>
      </main>
    </>
  );
}
