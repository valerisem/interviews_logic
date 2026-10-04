import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Candidate Assessment · House of Marketers',
  robots: { index: false, follow: false },
};

// Applies the saved theme before first paint so the page never flashes the wrong colours.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
