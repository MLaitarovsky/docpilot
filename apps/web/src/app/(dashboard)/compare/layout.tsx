import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare",
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
