import { TopBar } from '@/components/TopBar';

export default function Home() {
  return (
    <>
      <TopBar />
      <main className="page center">
        <h1 className="title-md">Candidate assessments</h1>
        <p className="body">Please open the personal assessment link your recruiter sent you.</p>
      </main>
    </>
  );
}
