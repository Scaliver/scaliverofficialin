import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

const RefundPolicy = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <Helmet>
      <title>Refund Policy | Scaliver Official</title>
      <meta
        name="description"
        content="Refund policy for Scaliver Official game top-up orders. Learn when refunds are issued and review time."
      />
      <link rel="canonical" href="https://scaliverofficial.in/refund-policy" />
      <meta property="og:title" content="Refund Policy | Scaliver Official" />
      <meta property="og:description" content="Refund policy for Scaliver Official game top-up orders, including eligibility, review times, and wallet refund handling." />
      <meta property="og:url" content="https://scaliverofficial.in/refund-policy" />
    </Helmet>
    <Header />
    <main className="flex-1 container py-8 max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-gradient mb-6">Refund Policy</h1>
      <div className="space-y-5 text-sm md:text-base text-muted-foreground leading-relaxed">
        <p>Refunds are only available in the following cases:</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Payment completed but order remains pending for an extended period.</li>
          <li>Recharge/top-up could not be delivered to the provided account.</li>
          <li>Duplicate payment due to system error.</li>
        </ol>
        <h2 className="font-display text-lg font-bold text-foreground mt-4">No refund will be provided if:</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Wrong User ID or Server ID was entered.</li>
          <li>Recharge was successfully delivered.</li>
          <li>Customer changes their mind after successful delivery.</li>
        </ul>
        <p className="pt-2">Refund requests are reviewed within <strong className="text-foreground">24-72 hours</strong>.</p>
      </div>
    </main>
    <Footer />
    <WhatsAppButton />
  </div>
);

export default RefundPolicy;
