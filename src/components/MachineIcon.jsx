import { machineIconKey } from "../utils/machines";

const ICONS = {
  "3d-printer": (
    <>
      <rect x="4" y="3" width="16" height="14" rx="1" />
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="12" y1="7" x2="12" y2="10" />
      <path d="M10 10h4l-2 3.5z" />
      <line x1="7" y1="17" x2="17" y2="17" />
      <line x1="2.5" y1="20.5" x2="21.5" y2="20.5" />
    </>
  ),
  "laser-cutter": (
    <>
      <rect x="3" y="8" width="18" height="11" rx="1" />
      <line x1="3" y1="12.5" x2="21" y2="12.5" />
      <line x1="7" y1="3" x2="13" y2="8" />
      <circle cx="13" cy="8" r="1" fill="currentColor" stroke="none" />
      <line x1="17" y1="15" x2="19" y2="15" />
    </>
  ),
  "cnc-mill": (
    <>
      <path d="M4 20V9h16v11" />
      <rect x="9.5" y="4.5" width="5" height="6" rx="0.5" />
      <line x1="12" y1="10.5" x2="12" y2="15" />
      <path d="M10.5 15h3l-1.5 2.5z" />
      <line x1="2.5" y1="20" x2="21.5" y2="20" />
    </>
  ),
  "vinyl-cutter": (
    <>
      <circle cx="5.5" cy="8" r="2.5" />
      <rect x="9" y="4" width="12" height="16" rx="1" />
      <line x1="9" y1="11" x2="21" y2="11" strokeDasharray="2 2" />
      <line x1="9" y1="16" x2="15" y2="16" />
    </>
  ),
  other: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" />
    </>
  ),
};

export default function MachineIcon({ type, size = 28 }) {
  return (
    <svg
      className="machine-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[machineIconKey(type)] ?? ICONS.other}
    </svg>
  );
}
