import TabNav from "@/components/TabNav";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen-ios flex-col bg-black safe-pb">
      <TabNav />
      <div className="mx-auto w-full max-w-7xl flex-1 px-3 py-3 sm:px-4">
        {children}
      </div>
    </div>
  );
}
