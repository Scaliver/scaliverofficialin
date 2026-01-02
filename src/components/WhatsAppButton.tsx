import whatsappIcon from "@/assets/whatsapp-icon.jpeg";

const WhatsAppButton = () => {
  return (
    <a
      href="https://wa.me/917637851804"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 md:bottom-6 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 transition-all hover:scale-110 animate-pulse overflow-hidden"
      aria-label="Chat on WhatsApp"
    >
      <img src={whatsappIcon} alt="WhatsApp" className="w-full h-full object-cover" />
    </a>
  );
};

export default WhatsAppButton;
