import TabNav from "@/components/TabNav";
import SiteFooter from "@/components/SiteFooter";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <TabNav />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</div>
      <SiteFooter />
    </div>
  );
}
