"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { spring } from "@/lib/motion";
import { useStudio } from "@/lib/store";
import type { ToolMode } from "@/lib/types";
import { DropZone } from "./DropZone";
import { FileCard } from "./FileCard";
import { SettingsPanel } from "./SettingsPanel";
import { CompareSlider } from "./CompareSlider";
import { CropEditor } from "./CropEditor";
import { EngineBanner } from "./EngineBanner";
import { BatchBar } from "./BatchBar";
import { ProcessingOverlay } from "./ProcessingOverlay";
import { CheckIcon, ShieldIcon } from "@/components/icons";

export function Studio({ mode }: { mode: ToolMode }) {
  const t = useTranslations("studio");

  const files = useStudio((s) => s.files);
  const setMode = useStudio((s) => s.setMode);
  const addFiles = useStudio((s) => s.addFiles);
  const selectedId = useStudio((s) => s.selectedId);

  const [rejected, setRejected] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  const handleAdd = useCallback(
    (list: File[]) => {
      if (list.length === 0) return;
      const { rejected } = addFiles(list);
      if (rejected > 0) {
        setRejected(rejected);
        setTimeout(() => setRejected(0), 5000);
      }
    },
    [addFiles],
  );

  // Global drag & drop + clipboard paste
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      dragDepth.current++;
      setDragging(true);
    };
    const onDragLeave = () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      handleAdd(Array.from(e.dataTransfer?.files ?? []));
    };
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (items.length > 0) handleAdd(items);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, [handleAdd]);

  const selected =
    files.find((f) => f.id === selectedId) ?? (files.length > 0 ? files[0] : null);

  return (
    <div className="relative">
      {/* full-screen drag overlay */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              transition={spring}
              className="rounded-[32px] border-2 border-dashed border-white bg-white/10 px-16 py-12 text-center"
            >
              <p className="text-2xl font-semibold tracking-tight text-white">
                {t("dropOverlay")}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* processing lock — blocks the page while jobs run */}
      <ProcessingOverlay />

      {files.length === 0 ? (
        <DropZone onFiles={handleAdd} />
      ) : (
        <div className="space-y-3">
          {mode === "remove-bg" && <EngineBanner />}
          <SettingsPanel mode={mode} />

          {/* viewer + file rail, side by side so input and results share the screen */}
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
            {selected && (
              <motion.div
                layout
                transition={spring}
                className="overflow-hidden rounded-2xl border border-hairline bg-white"
              >
                <div className="relative h-[380px] w-full sm:h-[460px]">
                  {mode === "crop" &&
                  !(selected.status === "done" && selected.result) &&
                  selected.status !== "processing" &&
                  selected.status !== "queued" ? (
                    <CropEditor key={selected.id} sf={selected} />
                  ) : mode !== "strip-exif" &&
                    selected.status === "done" &&
                    selected.result &&
                    selected.previewUrl ? (
                    <>
                      <CompareSlider
                        beforeUrl={selected.previewUrl}
                        afterUrl={selected.result.url}
                      />
                      {mode === "crop" && <RecropButton id={selected.id} />}
                    </>
                  ) : (
                    <div className="checkerboard relative h-full w-full">
                      {selected.previewUrl && (
                        <img
                          src={selected.previewUrl}
                          alt={selected.name}
                          draggable={false}
                          className="absolute inset-0 h-full w-full object-contain"
                        />
                      )}
                      {mode === "strip-exif" && selected.status === "done" && (
                        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-[12px] font-medium text-white">
                          <ShieldIcon size={13} />
                          {t("done")}
                          <CheckIcon size={12} />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* rail: add-more + results */}
            <div className="flex max-h-[460px] min-h-0 flex-col gap-3">
              <DropZone compact onFiles={handleAdd} />
              <div className="grid flex-1 auto-rows-min grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 lg:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {files.map((sf) => (
                    <FileCard key={sf.id} sf={sf} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {rejected > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center text-[12.5px] font-medium text-black/60"
          >
            {t("rejectedNote", { count: rejected })}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>{files.length > 0 && <BatchBar />}</AnimatePresence>
    </div>
  );
}

function RecropButton({ id }: { id: string }) {
  const t = useTranslations("crop");
  const resetCrop = useStudio((s) => s.resetCrop);
  return (
    <motion.button
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => resetCrop(id)}
      className="absolute bottom-3 right-3 z-20 rounded-full bg-black px-3.5 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-80"
    >
      {t("recrop")}
    </motion.button>
  );
}
