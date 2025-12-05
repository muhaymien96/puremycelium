import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportProcessingModalProps {
  open: boolean;
  status: 'processing' | 'success' | 'error';
  progress?: number;
  message?: string;
  onClose?: () => void;
}

export function ImportProcessingModal({
  open,
  status,
  progress = 0,
  message,
  onClose
}: ImportProcessingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === 'processing' && (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing Import
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Import Complete
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Import Failed
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {status === 'processing' && 'Please wait while we import your transactions...'}
            {status === 'success' && 'Your sales have been successfully imported.'}
            {status === 'error' && 'There was an error importing your sales.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === 'processing' && (
            <>
              <Progress value={progress} className="w-full" />
              <div className="text-center text-sm text-muted-foreground">
                {message || 'Importing transactions...'}
              </div>
            </>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-950/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                {message || 'All transactions have been imported successfully.'}
              </p>
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">
                {message || 'An error occurred during import. Please try again.'}
              </p>
              <Button onClick={onClose} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
