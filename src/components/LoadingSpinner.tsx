import loaderLogo from "@/assets/scaliver-loader-logo.png";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  text?: string;
}

const LoadingSpinner = ({
  size = "md",
  fullScreen = false,
  text = "Loading...",
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-24 h-24",
    lg: "w-36 h-36",
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-5">
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Soft pulsing glow halos */}
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl animate-pulse-ring" />
        <div
          className="absolute inset-0 rounded-full bg-accent/20 blur-3xl animate-pulse-ring"
          style={{ animationDelay: "0.6s" }}
        />

        {/* Rotating ring around logo */}
        <div
          className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary border-r-accent/60 animate-spin-glow"
          style={{ animationDuration: "1.8s" }}
        />

        {/* Floating logo */}
        <img
          src={loaderLogo}
          alt="Scaliver"
          className="absolute inset-0 m-auto w-[78%] h-[78%] object-contain animate-float drop-shadow-[0_0_18px_hsl(210_100%_50%/0.6)]"
          draggable={false}
        />
      </div>

      {text && (
        <span className="text-primary font-display tracking-[0.25em] text-xs uppercase animate-text-flicker">
          {text}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
