import type { Metadata } from "next";
import TestBoard from "./test-board";

export const metadata: Metadata = {
  title: "Talk · Voice test",
  robots: { index: false, follow: false },
};

export default function TestPage() {
  return <TestBoard />;
}
