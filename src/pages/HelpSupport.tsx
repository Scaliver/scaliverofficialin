import { Helmet } from "react-helmet-async";
import { MessageCircle, Phone, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

const HelpSupport = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <Helmet>
      <title>Help & Support | Scaliver Official</title>
      <meta
        name="description"
        content="Get help for your Scaliver Official orders. WhatsApp support 10 AM - 10 PM IST, average 5-30 min response."
      />
      <link rel="canonical" href="https://scaliverofficial.in/help-support" />
      <meta property="og:title" content="Help & Support | Scaliver Official" />
      <meta property="og:url" content="https://scaliverofficial.in/help-support" />
    </Helmet>
    <Header />
    <main className="flex-1 container py-8 max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-gradient mb-6">Need Help?</h1>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2 text-primary"><Phone className="w-5 h-5" /><span className="font-display font-bold">WhatsApp Support</span></div>
          <p className="text-lg font-bold text-foreground">+91 7637851804</p>
          <Button asChild size="sm" className="mt-3" variant="gaming">
            <a href="https://wa.me/917637851804" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
          </Button>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2 text-primary"><Clock className="w-5 h-5" /><span className="font-display font-bold">Support Hours</span></div>
          <p className="text-base text-foreground">10:00 AM - 10:00 PM IST</p>
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground"><Zap className="w-4 h-4 text-primary" /> Avg response: 5 - 30 minutes</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary" />For order issues, please provide:</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground">
          <li>Order ID</li>
          <li>User ID</li>
          <li>Payment Screenshot (if applicable)</li>
        </ul>
      </div>
    </main>
    <Footer />
    <WhatsAppButton />
  </div>
);

export default HelpSupport;
