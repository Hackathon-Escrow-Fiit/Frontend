import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";

export const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full overflow-hidden bg-base-200">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <AppHeader />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  </div>
);
