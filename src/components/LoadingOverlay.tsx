import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay = ({ message = 'Processing...' }: LoadingOverlayProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="bg-card p-8 rounded-lg shadow-lg flex flex-col items-center gap-4 max-w-sm mx-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-center">{message}</p>
      </div>
    </motion.div>
  );
};