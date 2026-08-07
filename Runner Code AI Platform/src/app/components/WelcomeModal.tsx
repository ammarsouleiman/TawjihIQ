import { CheckCircle2, Globe, Loader2, Mail, Send, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "../../assets/3546325734eebbae935ba64a28db9c350a382fdd.png";
import { Button } from "./ui/button";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Bahrain", "Bangladesh",
  "Belgium", "Brazil", "Bulgaria", "Canada", "Chile", "China", "Colombia", "Croatia", "Czech Republic",
  "Denmark", "Egypt", "Finland", "France", "Germany", "Greece", "Hong Kong", "Hungary", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Italy", "Japan", "Jordan", "Kenya", "Kuwait",
  "Lebanon", "Malaysia", "Mexico", "Morocco", "Netherlands", "New Zealand", "Nigeria", "Norway",
  "Oman", "Pakistan", "Palestine", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
  "Saudi Arabia", "Singapore", "South Africa", "South Korea", "Spain", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Thailand", "Tunisia", "Turkey", "UAE", "UK", "Ukraine", "USA", "Yemen", "Other"
].sort();

const INPUT_CLASSES = "w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm sm:text-base text-foreground";
const LABEL_CLASSES = "flex items-center gap-2 text-sm sm:text-base font-semibold text-foreground";

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setName("");
      setCountry("");
      setEmail("");
      setIsSuccess(false);
      setError("");
    }
  }, [isOpen]);

  // Handle ESC key to close only after success
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && isSuccess) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, isSuccess, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!country) {
      setError("Country is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("https://formspree.io/f/mqeapeyd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          country,
          email: email.trim(),
          _replyto: "info@runner-code.com",
          _subject: `New User Registration - ${name.trim()}`,
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
        // Dispatch custom event to update sidebar immediately
        const userData = { name: name.trim(), email: email.trim() };
        window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: userData }));
        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error("Submission failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] animate-in fade-in duration-300"
        onClick={isSuccess ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto safe-area-inset overscroll-contain">
        <div
          className="bg-card border-2 border-primary/30 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl max-w-lg w-full my-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 max-h-[90dvh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-5 sm:p-6 pb-4 border-b border-border/50 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            {isSuccess && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-muted/80 transition-all group"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}

            <div className="flex flex-col items-center text-center pr-8">
              <div className="mb-4">
                <img
                  src={logo}
                  alt="Runner Code AI"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-lg border-2 border-primary/30"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-2 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Welcome to Runner Code AI
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Let's get to know you
              </p>
            </div>
          </div>

          {/* Content */}
          {isSuccess ? (
            <div className="p-6 sm:p-8 text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-500/20 rounded-full">
                  <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-green-500" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                Thank You!
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Your information has been submitted successfully. Welcome to Runner Code AI!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
              {/* Name Field */}
              <div className="space-y-2">
                <label htmlFor="name" className={LABEL_CLASSES}>
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span>Name</span>
                  <span className="text-destructive">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className={`${INPUT_CLASSES} placeholder:text-muted-foreground/60`}
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>

              {/* Country Field */}
              <div className="space-y-2">
                <label htmlFor="country" className={LABEL_CLASSES}>
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span>Country</span>
                  <span className="text-destructive">*</span>
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={`${INPUT_CLASSES} cursor-pointer`}
                  disabled={isSubmitting}
                >
                  <option value="">Select your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className={LABEL_CLASSES}>
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span>Email</span>
                  <span className="text-destructive">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className={`${INPUT_CLASSES} placeholder:text-muted-foreground/60`}
                  disabled={isSubmitting}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                  <p className="text-sm sm:text-base text-destructive font-medium text-center">
                    {error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-primary/30 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Submit</span>
                  </>
                )}
              </Button>

              {/* Privacy Note */}
              <p className="text-xs sm:text-sm text-muted-foreground text-center pt-2">
                Your information is protected and will not be shared with any third party
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

