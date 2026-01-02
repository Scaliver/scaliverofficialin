interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  text?: string;
}

const LoadingSpinner = ({ 
  size = "md", 
  fullScreen = false,
  text = "Loading..."
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const borderClasses = {
    sm: "border-2",
    md: "border-4",
    lg: "border-[6px]",
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Outer container for the ring */}
      <div className="relative">
        {/* Glow effect behind the ring */}
        <div 
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-primary/30 blur-xl animate-pulse-ring`}
        />
        
        {/* Secondary glow layer */}
        <div 
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-accent/20 blur-2xl animate-pulse-ring`}
          style={{ animationDelay: "0.5s" }}
        />
        
        {/* Main rotating ring */}
        <div 
          className={`relative ${sizeClasses[size]} ${borderClasses[size]} rounded-full border-primary/30 border-t-primary border-r-primary/60 animate-spin-glow`}
          style={{
            boxShadow: "0 0 20px hsl(210, 100%, 50%, 0.5), inset 0 0 20px hsl(210, 100%, 50%, 0.1)"
          }}
        />
        
        {/* Inner accent ring */}
        <div 
          className={`absolute inset-2 rounded-full border-2 border-accent/40 animate-spin-glow`}
          style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
        />
      </div>
      
      {/* Loading text */}
      {text && (
        <span className="text-primary font-display tracking-wider animate-text-flicker">
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
