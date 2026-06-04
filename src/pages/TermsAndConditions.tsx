import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

const TermsAndConditions = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <Helmet>
      <title>Terms & Conditions | Scaliver Official</title>
      <meta
        name="description"
        content="Terms and conditions for using Scaliver Official game top-up services in India."
      />
      <link rel="canonical" href="https://scaliverofficial.in/terms-and-conditions" />
      <meta property="og:title" content="Terms & Conditions | Scaliver Official" />
      <meta property="og:url" content="https://scaliverofficial.in/terms-and-conditions" />
    </Helmet>
    <Header />
    <main className="flex-1 container py-8 max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-gradient mb-6">Terms & Conditions</h1>
      <div className="space-y-5 text-sm md:text-base text-muted-foreground leading-relaxed">
        <p>By using Scaliver Official, you agree to:</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Provide correct account information.</li>
          <li>Not use fraudulent payment methods.</li>
          <li>Understand that digital products are delivered electronically.</li>
          <li>Accept that successful top-ups cannot be reversed.</li>
          <li>Follow all game publisher rules and regulations.</li>
        </ol>
        <p>Scaliver Official reserves the right to cancel suspicious orders.</p>
      </div>
    </main>
    <Footer />
    <WhatsAppButton />
  </div>
);

export default TermsAndConditions;
