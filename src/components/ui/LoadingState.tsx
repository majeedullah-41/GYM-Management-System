import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 size={24} className="animate-spin text-primary" />
      <p className="mt-3 text-sm text-text-muted">{message}</p>
    </div>
  );
}
