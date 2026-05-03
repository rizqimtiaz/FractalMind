import dynamic from "next/dynamic";

// React Flow needs the window object — render on the client only.
const Canvas = dynamic(() => import("@/components/Canvas"), { ssr: false });

export default function HomePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <Canvas />
    </main>
  );
}
