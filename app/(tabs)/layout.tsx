import TabNav from "@/components/TabNav";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-black">
      <TabNav />
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-3 py-2 sm:px-4">
        {children}
      </div>
    </div>
  );
}
