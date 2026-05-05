import { GridApp } from "@/components/GridApp";
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <GridApp />
    </main>
  );
}
