// Icons used in the Talk design. All are 24×24 line icons drawn with the .i class.
import type { CSSProperties, ReactNode } from "react";

type IconProps = { size?: number; style?: CSSProperties; className?: string };

function Icon({ size = 20, style, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className ? `i ${className}` : "i"}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ width: size, height: size, ...style }}
    >
      {children}
    </svg>
  );
}

/** Talk logo bars */
export const LogoBars = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 10v4M9 7v10M13 4v16M17 8v8M21 11v2" />
  </Icon>
);
/** Voice / accent bars */
export const VoiceBars = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
  </Icon>
);
export const Translate = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 5h8M8 3v2M10 5c0 4-3 7-6 8M6 9c1 2 3 3.5 5 4M13 21l4-9 4 9M14.5 18h5" />
  </Icon>
);
export const FileIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Icon>
);
export const FileX = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9.5 13.5l5 5M14.5 13.5l-5 5" />
  </Icon>
);
export const Lock = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);
export const Upload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
  </Icon>
);
export const Close = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const Check = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);
export const ChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
export const ArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);
export const Alert = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </Icon>
);
export const Info = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.5h.01" />
  </Icon>
);
export const Spinner = (p: IconProps) => (
  <Icon {...p} className="spin">
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Icon>
);
export const WifiOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.4M12 8a10 10 0 0 1 7 4.5M2 8.5a15 15 0 0 1 4.5-2.8M12 20h.01" />
  </Icon>
);
export const Retry = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4.5h-4.5" />
  </Icon>
);
export const BackLine = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 6l-8 6 8 6V6zM6 6v12" />
  </Icon>
);
export const SkipLine = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l8 6-8 6V6zM18 6v12" />
  </Icon>
);

/** Filled play triangle */
export const PlayIcon = ({ size = 18, style }: IconProps) => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden="true" style={{ width: size, height: size, fill: "currentColor", ...style }}>
    <path d="M8 5.5v13l10.5-6.5z" />
  </svg>
);
/** Filled pause bars */
export const PauseIcon = ({ size = 24, style }: IconProps) => (
  <svg
    className="i"
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={{ width: size, height: size, fill: "currentColor", stroke: "none", ...style }}
  >
    <rect x="6.5" y="5" width="4" height="14" rx="1.5" />
    <rect x="13.5" y="5" width="4" height="14" rx="1.5" />
  </svg>
);
