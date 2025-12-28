const MarqueeBanner = () => {
  const text = "~✦ Welcome To Scaliver Official ~✦ Welcome To Scaliver Official ~✦ Welcome To Scaliver Official ~✦ Welcome To Scaliver Official ";
  
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary via-accent to-primary py-3 border-y border-primary/30">
      <div className="animate-marquee whitespace-nowrap flex">
        <span className="font-display text-sm md:text-base font-semibold text-primary-foreground tracking-widest mx-4">
          {text}
        </span>
        <span className="font-display text-sm md:text-base font-semibold text-primary-foreground tracking-widest mx-4">
          {text}
        </span>
        <span className="font-display text-sm md:text-base font-semibold text-primary-foreground tracking-widest mx-4">
          {text}
        </span>
        <span className="font-display text-sm md:text-base font-semibold text-primary-foreground tracking-widest mx-4">
          {text}
        </span>
      </div>
    </div>
  );
};

export default MarqueeBanner;
