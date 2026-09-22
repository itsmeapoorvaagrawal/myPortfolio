import ContactForm from "@/components/ContactForm";

export default function Contact() {
  return (
    <section id="contact" className="section-container py-20">
      <h2 className="text-sm font-medium uppercase tracking-widest text-accent">
        Contact
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Have a project in mind or just want to say hi? Fill out the form
        below and I&apos;ll get back to you as soon as I can.
      </p>
      <div className="max-w-xl">
        <ContactForm />
      </div>
    </section>
  );
}
