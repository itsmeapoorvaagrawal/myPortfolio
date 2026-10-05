import Hero from "@/components/Hero";
import About from "@/components/About";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";

export const revalidate = 0;

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Projects />
      <Contact />
    </main>
  );
}
