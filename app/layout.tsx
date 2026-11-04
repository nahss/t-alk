import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Talk",
  description:
    "Paste text or drop a PDF, pick a voice, and Talk reads it aloud while each line lights up. Free, no sign-up.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
