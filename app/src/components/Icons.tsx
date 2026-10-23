/**
 * The icon set.
 *
 * Drawn inline rather than loaded, so each one is a real component that takes the
 * colour of the text around it and stays sharp at any size. They share a 24 unit grid,
 * a 1.6 stroke, round ends and round joins, so a row of them reads as one family.
 *
 * Several carry a soft tinted shape behind the outline. That second tone is what keeps
 * them from looking like the flat line icons every interface already has.
 */

type IconProps = {
  size?: number;
  /** The tinted shape behind the outline. Defaults to the main colour. */
  tint?: string;
  className?: string;
  title?: string;
};

function Svg({ size = 20, title, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ flex: 'none', display: 'block' }}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function tintOf(tint?: string) {
  return { fill: tint ?? 'var(--main-fill)', fillOpacity: 0.5, stroke: 'none' };
}

export function BookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 7.4c1.7-1.4 4-2.1 7.2-2.1v12.9c-3.2 0-5.5.7-7.2 2.1z" {...tintOf(props.tint)} />
      <path
        d="M12 7.4C10.3 6 8 5.3 4.8 5.3v12.9c3.2 0 5.5.7 7.2 2.1 1.7-1.4 4-2.1 7.2-2.1V5.3c-3.2 0-5.5.7-7.2 2.1z"
        {...line}
      />
      <path d="M12 7.4v12.9" {...line} />
    </Svg>
  );
}

export function NoteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M5.2 4.4h8.1l5.5 5.5v9.7a1.2 1.2 0 0 1-1.2 1.2H5.2A1.2 1.2 0 0 1 4 19.6V5.6a1.2 1.2 0 0 1 1.2-1.2z"
        {...tintOf(props.tint)}
      />
      <path
        d="M5.2 4.4h8.1l5.5 5.5v9.7a1.2 1.2 0 0 1-1.2 1.2H5.2A1.2 1.2 0 0 1 4 19.6V5.6a1.2 1.2 0 0 1 1.2-1.2z"
        {...line}
      />
      <path d="M13.3 4.4v5.5h5.5" {...line} />
      <path d="M7.6 13.2h6.6M7.6 16.5h4.4" {...line} />
    </Svg>
  );
}

export function BookmarkIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...props}>
      {filled && (
        <path
          d="M7 3.8h10a1 1 0 0 1 1 1v15.4l-6-4.2-6 4.2V4.8a1 1 0 0 1 1-1z"
          {...tintOf(props.tint)}
        />
      )}
      <path d="M7 3.8h10a1 1 0 0 1 1 1v15.4l-6-4.2-6 4.2V4.8a1 1 0 0 1 1-1z" {...line} />
    </Svg>
  );
}

export function HighlightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.3 4.6 19.4 9.7l-7.8 7.8H6.5v-5.1z" {...tintOf(props.tint)} />
      <path d="M14.3 4.6 19.4 9.7l-7.8 7.8H6.5v-5.1z" {...line} />
      <path d="M12 6.9 17.1 12" {...line} />
      <path d="M4 21h16" {...line} />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.6" cy="10.6" r="6.3" {...tintOf(props.tint)} />
      <circle cx="10.6" cy="10.6" r="6.3" {...line} />
      <path d="m15.4 15.4 4.3 4.3" {...line} />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.4" {...tintOf(props.tint)} />
      <circle cx="12" cy="12" r="8.4" {...line} />
      <path d="M12 11v5.2" {...line} />
      <circle cx="12" cy="8" r="0.95" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="15.2" cy="7.4" r="2.4" {...tintOf(props.tint)} />
      <circle cx="8.8" cy="16.6" r="2.4" {...tintOf(props.tint)} />
      <path d="M4 7.4h8.8M17.6 7.4H20" {...line} />
      <path d="M4 16.6h2.4M11.2 16.6H20" {...line} />
      <circle cx="15.2" cy="7.4" r="2.4" {...line} />
      <circle cx="8.8" cy="16.6" r="2.4" {...line} />
    </Svg>
  );
}

export function ChevronIcon({
  dir = 'down',
  ...props
}: IconProps & { dir?: 'up' | 'down' | 'left' | 'right' }) {
  const d = {
    down: 'm7.5 10 4.5 4.5L16.5 10',
    up: 'm7.5 14 4.5-4.5 4.5 4.5',
    left: 'm14 7.5-4.5 4.5 4.5 4.5',
    right: 'm10 7.5 4.5 4.5-4.5 4.5',
  }[dir];
  return (
    <Svg {...props}>
      <path d={d} {...line} strokeWidth={2} />
    </Svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4.2" {...tintOf(props.tint)} />
      <circle cx="12" cy="12" r="4.2" {...line} />
      <path
        d="M12 2.9v2.1M12 19v2.1M2.9 12h2.1M19 12h2.1M5.5 5.5l1.5 1.5M17 17l1.5 1.5M18.5 5.5 17 7M7 17l-1.5 1.5"
        {...line}
      />
    </Svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.3 8.3 0 1 0 10.6 10.6z" {...tintOf(props.tint)} />
      <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.3 8.3 0 1 0 10.6 10.6z" {...line} />
    </Svg>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.4" {...tintOf(props.tint)} />
      <circle cx="12" cy="8" r="3.4" {...line} />
      <path d="M5.4 20a6.6 6.6 0 0 1 13.2 0" {...line} />
    </Svg>
  );
}

export function PlaceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 20.8s6.3-5.4 6.3-10.2a6.3 6.3 0 1 0-12.6 0C5.7 15.4 12 20.8 12 20.8z"
        {...tintOf(props.tint)}
      />
      <path
        d="M12 20.8s6.3-5.4 6.3-10.2a6.3 6.3 0 1 0-12.6 0C5.7 15.4 12 20.8 12 20.8z"
        {...line}
      />
      <circle cx="12" cy="10.3" r="2.4" {...line} />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.4" {...tintOf(props.tint)} />
      <circle cx="12" cy="12" r="8.4" {...line} />
      <path d="m8.3 12.2 2.6 2.6 4.8-5" {...line} strokeWidth={1.9} />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m7 7 10 10M17 7 7 17" {...line} strokeWidth={1.9} />
    </Svg>
  );
}

export function ScrollIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.5 4.5h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-9z" {...tintOf(props.tint)} />
      <path d="M7.5 4.5h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-9z" {...line} />
      <path d="M7.5 4.5a2 2 0 0 0 0 4h2.2M7.5 19.5a2 2 0 0 0 0-4h2.2" {...line} />
      <path d="M11.5 9.5h4M11.5 13h3" {...line} />
    </Svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.4 9.4h17.2v9.1a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2z" {...tintOf(props.tint)} />
      <rect x="3.4" y="5.1" width="17.2" height="15.4" rx="2.4" {...line} />
      <path d="M3.4 9.4h17.2" {...line} />
      <path d="M8.2 3.4v3.4M15.8 3.4v3.4" {...line} />
      <path d="M7.6 13.1h3M7.6 16.8h3M13.4 13.1h3" {...line} />
    </Svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 20.6c2.9 0 4.8-1.9 4.8-4.5 0-1.3-.6-2.4-1.4-3.4-.5 1-1.3 1.4-2 1.4 1-3.4-.6-6.1-2.6-7.4.3 2.4-.9 3.6-2.3 5-1 1-1.3 2.4-1.3 4.4 0 2.6 1.9 4.5 4.8 4.5z"
        {...tintOf(props.tint)}
      />
      <path
        d="M12 20.6c2.9 0 4.8-1.9 4.8-4.5 0-2-.9-3.3-2-4.5-1.4-1.6-2-3-1.7-5.2-2.6 1-5 4.4-3.7 8.5-.9 0-1.7-.6-2.2-1.7-.7 1-1 2-1 2.9 0 2.6 1.9 4.5 4.8 4.5z"
        {...line}
      />
    </Svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3.4" {...tintOf(props.tint)} />
      <circle cx="12" cy="12" r="8.6" {...line} />
      <circle cx="12" cy="12" r="3.4" {...line} />
      <path d="M12 1.8v2.4M12 19.8v2.4M1.8 12h2.4M19.8 12h2.4" {...line} />
    </Svg>
  );
}
