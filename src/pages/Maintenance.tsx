import { Wrench } from "lucide-react";

const Maintenance = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Wrench className="w-10 h-10 text-primary animate-pulse" />
        </div>
        <h1 className="text-3xl font-bold">We'll be right back</h1>
        <p className="text-muted-foreground">
          Scaliver Official is under scheduled maintenance. We're working hard
          to improve your experience. Please check back shortly.
        </p>
        <p className="text-xs text-muted-foreground">
          For urgent queries, contact us on WhatsApp.
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
