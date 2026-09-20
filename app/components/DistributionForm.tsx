"use client";

import { useState } from "react";
import { updateDistributionSettings } from "@/app/actions/workspace-settings";

interface ProductData {
  id: string;
  organizationId: string;
  publishTimes: unknown; // typed in schema as json, expected string[]
  platforms: string[] | null;
  autoPublish: boolean | null;
  frequencyMin: number | null;
  frequencyMax: number | null;
}

interface DistributionFormProps {
  product: ProductData;
}

export function DistributionForm({ product }: DistributionFormProps) {
  // 🕒 Parse publish times safely out of your JSON field
  const initialTimes = Array.isArray(product.publishTimes) 
    ? (product.publishTimes as string[]) 
    : ['09:00', '13:00', '17:00'];

  const [publishTimes, setPublishTimes] = useState<string[]>(initialTimes);
  const [newTime, setNewTime] = useState("");
  const [frequencyMin, setFrequencyMin] = useState(product.frequencyMin ?? 3);
  const [frequencyMax, setFrequencyMax] = useState(product.frequencyMax ?? 5);
  const [autoPublish, setAutoPublish] = useState(product.autoPublish ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ➕ Add a new time chip
  const handleAddTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime) return;
    
    // Avoid duplicates and sort them chronologically
    if (!publishTimes.includes(newTime)) {
      const updated = [...publishTimes, newTime].sort();
      setPublishTimes(updated);
    }
    setNewTime("");
  };

  // ❌ Remove a time chip
  const handleRemoveTime = (timeToRemove: string) => {
    setPublishTimes(publishTimes.filter((t) => t !== timeToRemove));
  };

  // 💾 Submit entire form payload to the Server Action
  const handleSubmit = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    const result = await updateDistributionSettings({
      productId: product.id,
      organizationId: product.organizationId,
      publishTimes,
      platforms: product.platforms || [],
      autoPublish,
      frequencyMin,
      frequencyMax,
    });

    setIsSaving(false);
    if (result.success) {
      setStatusMessage({ type: "success", text: "Distribution parameters updated successfully!" });
    } else {
      setStatusMessage({ type: "error", text: result.error || "An error occurred." });
    }
  };

  return (
    <div className="space-y-6 rounded-2xl bg-white p-6 ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      
      {/* 🤖 MASTER AUTOMATION TOGGLE */}
      <div className="flex items-center justify-between border-b border-black/5 pb-4">
        <div>
          <label className="text-sm font-semibold block text-foreground">Autonomous Publishing Mode</label>
          <span className="text-xs text-muted-foreground block mt-0.5">
            When active, the GTM worker pushes ready posts to live channels on schedule without manually clicking "Fire".
          </span>
        </div>
        <button
          onClick={() => setAutoPublish(!autoPublish)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            autoPublish ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
              autoPublish ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* ⏰ POSTING TIMES CHIPS WRAPPER */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-foreground">Target Delivery Slots</label>
          <span className="text-xs text-muted-foreground block mt-0.5">
            Exact times during the day when queued content engine outputs look to drop.
          </span>
        </div>

        {/* Render Active Chips */}
        <div className="flex flex-wrap gap-2 items-center">
          {publishTimes.map((time) => (
            <span
              key={time}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary ring-1 ring-inset ring-primary/20"
            >
              {time}
              <button
                type="button"
                onClick={() => handleRemoveTime(time)}
                className="text-xs hover:text-destructive transition font-bold"
              >
                ×
              </button>
            </span>
          ))}

          {/* Inline Input to add more times */}
          <form onSubmit={handleAddTime} className="flex items-center gap-1.5">
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="h-8 rounded-lg border border-black/10 bg-background px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="h-8 rounded-lg border border-dashed border-black/10 px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              + Add
            </button>
          </form>
        </div>
      </div>

      {/* 📊 GENERATION BOUNDARIES (FREQUENCY RATIOS) */}
      <div className="grid grid-cols-2 gap-6 pt-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold block text-foreground">Min Weekly Frequency</label>
          <span className="text-xs text-muted-foreground block -mt-1">
            Floor baseline for automatic queue generations.
          </span>
          <input
            type="number"
            min={1}
            max={frequencyMax}
            value={frequencyMin}
            onChange={(e) => setFrequencyMin(parseInt(e.target.value) || 1)}
            className="w-full rounded-xl border border-black/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold block text-foreground">Max Weekly Frequency</label>
          <span className="text-xs text-muted-foreground block -mt-1">
            Ceiling limit to prevent platform over-saturation.
          </span>
          <input
            type="number"
            min={frequencyMin}
            max={30}
            value={frequencyMax}
            onChange={(e) => setFrequencyMax(parseInt(e.target.value) || 5)}
            className="w-full rounded-xl border border-black/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* 🛎️ NOTIFICATION FEEDBACK BAR */}
      {statusMessage && (
        <div
          className={`rounded-xl p-3 text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* 🚀 SAVE COMMAND ACTION BUTTON */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? "Saving Configuration..." : "Save Delivery Configuration"}
        </button>
      </div>

    </div>
  );
}
