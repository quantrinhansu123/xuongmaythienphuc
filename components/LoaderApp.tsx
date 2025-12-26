import { cn } from "@/utils/cn";
import { Compass } from "lucide-react";

interface LoaderAppProps {
  className?: string;
  style?: React.CSSProperties;
  full?: boolean;
  space?: string;
}

const LoaderApp = ({ className, style, full, space }: LoaderAppProps) => {
  const fullClass = full
    ? "absolute inset-0 flex items-center justify-center"
    : "";
  const spacePixel = space ? space : "124px";
  const fullStyle = {
    backdropFilter: "blur(50px)",
    opacity: 0.9,
    height: `calc(100vh - ${spacePixel})`,
  };
  return (
    <div className={full ? "relative" : ""}>
      <div
        style={{
          ...(full ? fullStyle : {}),
          ...style,
        }}
        className={cn(fullClass, className)}
      >
        <Compass
          className="text-primary animate-spin"
          style={{ animationDuration: "0.7s" }}
        />
      </div>
    </div>
  );
};

export default LoaderApp;
