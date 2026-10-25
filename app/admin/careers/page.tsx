import { redirect } from 'next/navigation';

/** The careers page has one address; signed-in admins see the admin tools on it. */
export default function AdminCareers() {
  redirect('/careers');
}
