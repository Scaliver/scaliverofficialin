import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <Helmet>
      <title>Privacy Policy | Scaliver Official</title>
      <meta
        name="description"
        content="How Scaliver Official collects, uses, and protects your data for game top-up orders and customer support."
      />
      <link rel="canonical" href="https://scaliverofficial.in/privacy-policy" />
      <meta property="og:title" content="Privacy Policy | Scaliver Official" />
      <meta property="og:description" content="How Scaliver Official collects, uses, and protects your data for game top-up orders and customer support in India." />
      <meta property="og:url" content="https://scaliverofficial.in/privacy-policy" />
    </Helmet>
    <Header />
    <main className="flex-1 container py-8 max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-gradient mb-6">Privacy Policy</h1>
      <div className="space-y-5 text-sm md:text-base text-muted-foreground leading-relaxed">
        <section>
          <h2 className="font-display text-lg font-bold text-foreground mb-2">Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Name</li>
            <li>Email</li>
            <li>User ID</li>
            <li>Order Information</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-foreground mb-2">How We Use It</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Processing orders</li>
            <li>Customer support</li>
            <li>Order tracking</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-foreground mb-2">Data Sharing</h2>
          <p>We do not sell or share customer data with third parties.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-foreground mb-2">Payment Security</h2>
          <p>All payment information is processed securely through trusted payment gateways. We never store card or bank credentials on our servers.</p>
        </section>
      </div>
    </main>
    <Footer />
    <WhatsAppButton />
  </div>
);

export default PrivacyPolicy;
