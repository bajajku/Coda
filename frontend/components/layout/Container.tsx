import { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}

export default function Container({ children, className = "", maxWidth = "max-w-7xl" }: ContainerProps) {
  return (
    <div className={`mx-auto ${maxWidth} px-6 w-full ${className}`}>
      {children}
    </div>
  );
}
