import { AlertTriangle, X } from "lucide-react";
import { Button } from "./ui/button";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  conversationTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  conversationTitle,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <div 
          className="bg-card border-2 border-destructive/20 rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border">
            <button
              onClick={onCancel}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            </button>
            
            <div className="flex items-center gap-2 sm:gap-3 mb-2 pr-8">
              <div className="p-2 sm:p-2.5 bg-destructive/10 rounded-lg sm:rounded-xl">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                {conversationTitle.includes("Account") ? "Delete Account?" : "Delete Conversation?"}
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="p-3 sm:p-4 bg-muted/50 rounded-lg sm:rounded-xl border border-border">
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1">
                {conversationTitle.includes("Account") ? "Account:" : "Conversation:"}
              </p>
              <p className="text-sm sm:text-base font-medium text-foreground break-words line-clamp-2">
                "{conversationTitle}"
              </p>
            </div>

            <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-destructive/5 rounded-lg sm:rounded-xl border border-destructive/20">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-destructive mb-1">
                  Warning
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {conversationTitle.includes("Account") 
                    ? "This action cannot be undone. Your account, all conversations, and all data will be permanently deleted."
                    : "This action cannot be undone. All messages in this conversation will be permanently deleted."}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t border-border flex gap-2 sm:gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 h-10 sm:h-11 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 h-10 sm:h-11 text-sm sm:text-base font-bold rounded-lg sm:rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg hover:shadow-destructive/20 transition-all"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

