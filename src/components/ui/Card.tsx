"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  hover = false,
  glass = false,
  onClick,
}) => {
  return (
    <div
      className={`rounded-2xl border ${
        glass
          ? "glass-panel"
          : "border-border/80 bg-surface-raised/80 backdrop-blur-md"
      } p-5 transition-all duration-200 ${
        hover
          ? "hover:border-border-hover hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5 cursor-pointer"
          : ""
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`mb-3 ${className}`}>{children}</div>
);

export const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);

export const CardFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`mt-4 pt-4 border-t border-border/60 flex gap-2 ${className}`}>
    {children}
  </div>
);
