import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProcessingModalProps {
  isOpen: boolean;
  amount: number;
  orderNumber?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function ProcessingModal({
  isOpen,
  amount,
  orderNumber,
  onConfirm,
  onCancel,
  isProcessing = false,
}: ProcessingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yoco Terminal Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please process the payment on your Yoco terminal device
            </AlertDescription>
          </Alert>

          <div className="space-y-3 p-4 rounded-lg bg-muted/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount to charge:</span>
              <span className="text-2xl font-bold">R {amount.toFixed(2)}</span>
            </div>
            {orderNumber && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Order #:</span>
                <span className="font-medium">{orderNumber}</span>
              </div>
            )}
          </div>

          <div className="space-y-3 text-sm">
            <h4 className="font-semibold">Instructions:</h4>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Open the Yoco app on your terminal device</li>
              <li>Enter the amount: R {amount.toFixed(2)}</li>
              <li>Have the customer tap/insert their card</li>
              <li>Wait for payment confirmation</li>
              <li>Once successful, click "Confirm Payment" below</li>
            </ol>
          </div>

          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Only confirm after the terminal shows "Payment Successful"
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel & Keep Cart
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : 'Confirm Payment Complete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
