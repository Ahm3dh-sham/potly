"use client";

import React from "react";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "auto" | "always" | "scroll" | "hover";
  children: React.ReactNode;
}

export function ScrollArea({
  children,
  className = "",
  type = "scroll",
  ...props
}: ScrollAreaProps) {
  const overflowClass =
    type === "always" ? "overflow-y-scroll" : "overflow-y-auto";

  return (
    <div
      data-lenis-prevent
      className={`relative ${overflowClass} overscroll-contain [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#d3d4c8] hover:[&::-webkit-scrollbar-thumb]:bg-[#3f6212]/60 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
