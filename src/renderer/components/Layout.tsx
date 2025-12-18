import { ReactNode } from "react";
import { SideMenu } from "./SideMenu";

type LayoutProps = {
  children: ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <SideMenu />
      <main className="flex-1 p-8 overflow-auto">
        <div className=" mx-auto">{children}</div>
      </main>
    </div>
  );
}
