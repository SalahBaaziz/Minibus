import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentCancelled = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="bg-orange-100 dark:bg-orange-900/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          <XCircle className="h-12 w-12 text-orange-600 dark:text-orange-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
        <p className="text-muted-foreground mb-6">
          Your payment was cancelled. Don't worry - your booking is still held. You can complete payment when you're ready.
        </p>
        <div className="bg-muted rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold mb-2">Need help?</h3>
          <p className="text-sm text-muted-foreground">
            If you have any questions or need to make changes to your booking, please reply to the WhatsApp message we sent you, or contact us directly.
          </p>
        </div>
        <Button asChild>
          <Link to="/">Return Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default PaymentCancelled;
