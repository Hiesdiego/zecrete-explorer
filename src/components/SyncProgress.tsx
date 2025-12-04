// zecrete/src/components/SyncProgress.tsx

"use client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { fakeSync } from "@/lib/zcash";

export function SyncProgress({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!navigator.onLine) {
      toast({ title: "Offline Mode", description: "Using cached data.", variant: "destructive" });
      onDone();
    }
  }, [onDone, toast]);

  const startSync = async () => {
    setSyncing(true);
    setProgress(0);
    try {
      await fakeSync((p: number) => setProgress(p));
    } catch (e) {
      toast({ title: "Sync Failed", description: "Check network.", variant: "destructive" });
      setSyncing(false);
      return;
    }
    setSyncing(false);
    onDone();
  };

  return (
    <div className="space-y-4">
      <Button onClick={startSync} disabled={syncing} className="w-full">
        {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {syncing ? "Syncing..." : "Sync Latest Blocks (mock)"}
      </Button>
      {syncing && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground">{Math.round(progress)}% complete</p>
        </div>
      )}
    </div>
  );
}
