"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type Transition,
  type Variant,
} from "framer-motion";
import { X } from "lucide-react";

interface MorphingDialogContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  uniqueId: string;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const MorphingDialogContext = createContext<MorphingDialogContextType | null>(
  null
);

export function useMorphingDialog() {
  const context = useContext(MorphingDialogContext);
  if (!context) {
    throw new Error("useMorphingDialog must be used within a MorphingDialog");
  }
  return context;
}

export interface MorphingDialogProviderProps {
  children: React.ReactNode;
  transition?: Transition;
}

function MorphingDialogProvider({
  children,
  transition,
}: MorphingDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const uniqueId = useId();
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const contextValue = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      uniqueId,
      triggerRef,
    }),
    [isOpen, uniqueId]
  );

  return (
    <MorphingDialogContext.Provider value={contextValue}>
      <MotionConfig transition={transition}>{children}</MotionConfig>
    </MorphingDialogContext.Provider>
  );
}

export interface MorphingDialogProps {
  children: React.ReactNode;
  transition?: Transition;
}

export function MorphingDialog({ children, transition }: MorphingDialogProps) {
  return (
    <MorphingDialogProvider
      transition={
        transition ?? {
          type: "spring",
          stiffness: 200,
          damping: 24,
        }
      }
    >
      {children}
    </MorphingDialogProvider>
  );
}

export interface MorphingDialogTriggerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MorphingDialogTrigger({
  children,
  className = "",
  style,
}: MorphingDialogTriggerProps) {
  const { setIsOpen, isOpen, uniqueId, triggerRef } = useMorphingDialog();

  const handleClick = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, [setIsOpen]);

  return (
    <motion.div
      ref={triggerRef}
      layoutId={`dialog-${uniqueId}`}
      style={style}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={`morphing-dialog-content-${uniqueId}`}
      className={`relative cursor-pointer ${className}`}
    >
      {children}
    </motion.div>
  );
}

export interface MorphingDialogContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MorphingDialogContent({
  children,
  className = "",
  style,
}: MorphingDialogContentProps) {
  const { setIsOpen, isOpen, uniqueId, triggerRef } = useMorphingDialog();
  const containerRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      document.body.classList.add("overflow-hidden");
      window.__potlyLenis?.stop();
      containerRef.current?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      document.body.classList.remove("overflow-hidden");
      window.__potlyLenis?.start();
      triggerRef.current?.focus();
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
      window.__potlyLenis?.start();
    };
  }, [isOpen, triggerRef]);

  return (
    <motion.div
      ref={containerRef}
      id={`morphing-dialog-content-${uniqueId}`}
      layoutId={`dialog-${uniqueId}`}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`morphing-dialog-title-${uniqueId}`}
      aria-describedby={`morphing-dialog-desc-${uniqueId}`}
      tabIndex={-1}
      className={`overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
}

export interface MorphingDialogContainerProps {
  children: React.ReactNode;
}

export function MorphingDialogContainer({
  children,
}: MorphingDialogContainerProps) {
  const { isOpen, setIsOpen, uniqueId } = useMorphingDialog();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence initial={false} mode="sync">
      {isOpen && (
        <>
          <motion.div
            key={`backdrop-${uniqueId}`}
            className="fixed inset-0 z-50 h-full w-full bg-[#14190f]/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <div
            data-lenis-prevent
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div onClick={(e) => e.stopPropagation()}>{children}</div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export interface MorphingDialogTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MorphingDialogTitle({
  children,
  className = "",
  style,
}: MorphingDialogTitleProps) {
  const { uniqueId } = useMorphingDialog();

  return (
    <motion.div
      layoutId={`dialog-title-${uniqueId}`}
      id={`morphing-dialog-title-${uniqueId}`}
      className={className}
      style={style}
      layout
    >
      {children}
    </motion.div>
  );
}

export interface MorphingDialogSubtitleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MorphingDialogSubtitle({
  children,
  className = "",
  style,
}: MorphingDialogSubtitleProps) {
  const { uniqueId } = useMorphingDialog();

  return (
    <motion.div
      layoutId={`dialog-subtitle-${uniqueId}`}
      className={className}
      style={style}
      layout
    >
      {children}
    </motion.div>
  );
}

export interface MorphingDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
  disableLayoutAnimation?: boolean;
  variants?: {
    initial: Variant;
    animate: Variant;
    exit: Variant;
  };
}

export function MorphingDialogDescription({
  children,
  className = "",
  disableLayoutAnimation,
  variants,
}: MorphingDialogDescriptionProps) {
  const { uniqueId } = useMorphingDialog();

  return (
    <motion.div
      id={`morphing-dialog-desc-${uniqueId}`}
      initial={variants ? "initial" : undefined}
      animate={variants ? "animate" : undefined}
      exit={variants ? "exit" : undefined}
      variants={variants}
      layout={!disableLayoutAnimation}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export interface MorphingDialogImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

export function MorphingDialogImage({
  src,
  alt,
  className = "",
  style,
  onError,
}: MorphingDialogImageProps) {
  const { uniqueId } = useMorphingDialog();

  return (
    <motion.img
      src={src}
      alt={alt}
      draggable={false}
      onError={onError}
      className={className}
      layoutId={`dialog-img-${uniqueId}`}
      style={style}
    />
  );
}

export interface MorphingDialogCloseProps {
  children?: React.ReactNode;
  className?: string;
  variants?: {
    initial: Variant;
    animate: Variant;
    exit: Variant;
  };
}

export function MorphingDialogClose({
  children,
  className = "",
  variants,
}: MorphingDialogCloseProps) {
  const { setIsOpen, uniqueId } = useMorphingDialog();

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  return (
    <motion.button
      onClick={handleClose}
      type="button"
      aria-label="Close dialog"
      key={`dialog-close-${uniqueId}`}
      className={`absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d3d4c8] bg-[#f1f3e6]/90 text-[#4d4c4c] transition-colors hover:border-[#3f6212] hover:text-[#1e1612] ${className}`}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
    >
      {children ?? <X className="h-4 w-4" />}
    </motion.button>
  );
}
