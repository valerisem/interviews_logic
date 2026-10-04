import type { Metadata } from 'next';
// Fonts are bundled with the app so they always load, even where Google Fonts is blocked.
import '@fontsource-variable/inter';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/latin-800.css';
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
      </head>
      <body>{children}</body>
    </html>
  );
}
