import TabNav from "@/components/TabNav";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen-ios flex-col bg-black safe-pt safe-pb">
      <TabNav />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-touch px-3 py-2 sm:px-4">
        {children}
      </div>
    </div>
  );
}
