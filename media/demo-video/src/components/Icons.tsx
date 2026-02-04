import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
}

export const NetworkIcon: React.FC<IconProps> = ({ size = 80, color = '#4ade80' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="8" fill={color} />
    <circle cx="20" cy="30" r="6" fill={color} opacity="0.8" />
    <circle cx="80" cy="30" r="6" fill={color} opacity="0.8" />
    <circle cx="20" cy="70" r="6" fill={color} opacity="0.8" />
    <circle cx="80" cy="70" r="6" fill={color} opacity="0.8" />
    <line x1="50" y1="50" x2="20" y2="30" stroke={color} strokeWidth="2" opacity="0.6" />
    <line x1="50" y1="50" x2="80" y2="30" stroke={color} strokeWidth="2" opacity="0.6" />
    <line x1="50" y1="50" x2="20" y2="70" stroke={color} strokeWidth="2" opacity="0.6" />
    <line x1="50" y1="50" x2="80" y2="70" stroke={color} strokeWidth="2" opacity="0.6" />
  </svg>
);

export const BrainIcon: React.FC<IconProps> = ({ size = 80, color = '#fbbf24' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path
      d="M30 25C30 18 35 15 40 15C45 15 48 18 50 20C52 18 55 15 60 15C65 15 70 18 70 25C70 30 68 35 65 38C68 40 72 45 72 52C72 60 66 65 60 65C58 65 56 64 54 63C54 68 52 75 45 78C42 79 38 79 35 78C28 75 26 68 26 63C24 64 22 65 20 65C14 65 8 60 8 52C8 45 12 40 15 38C12 35 10 30 10 25C10 18 15 15 20 15C25 15 28 18 30 20V25Z"
      fill={color}
      opacity="0.9"
    />
    <circle cx="35" cy="35" r="3" fill="white" opacity="0.6" />
    <circle cx="45" cy="30" r="3" fill="white" opacity="0.6" />
    <circle cx="55" cy="30" r="3" fill="white" opacity="0.6" />
    <circle cx="65" cy="35" r="3" fill="white" opacity="0.6" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ size = 80, color = '#a78bfa' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect x="25" y="45" width="50" height="40" rx="5" fill={color} />
    <rect x="30" y="50" width="40" height="30" rx="3" fill="rgba(255,255,255,0.1)" />
    <path
      d="M35 45V30C35 21.7 41.7 15 50 15C58.3 15 65 21.7 65 30V45"
      stroke={color}
      strokeWidth="6"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="50" cy="65" r="6" fill="white" opacity="0.8" />
    <rect x="48" y="65" width="4" height="10" fill="white" opacity="0.8" />
  </svg>
);

export const HeartbeatIcon: React.FC<IconProps> = ({ size = 80, color = '#34d399' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path
      d="M50 85C50 85 15 60 15 35C15 20 25 15 32.5 15C40 15 47.5 22.5 50 27.5C52.5 22.5 60 15 67.5 15C75 15 85 20 85 35C85 60 50 85 50 85Z"
      fill={color}
    />
    <path
      d="M20 50H30L40 35L50 65L60 40L70 50H80"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity="0.8"
    />
  </svg>
);

export const LightningIcon: React.FC<IconProps> = ({ size = 80, color = '#38bdf8' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path
      d="M55 10L25 55H45L35 90L75 40H50L55 10Z"
      fill={color}
      stroke="white"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ size = 60, color = '#4ade80' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path d="M50 20V65" stroke={color} strokeWidth="6" strokeLinecap="round" />
    <path d="M30 50L50 70L70 50" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 75H80" stroke={color} strokeWidth="6" strokeLinecap="round" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 60, color = '#fbbf24' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="40" cy="40" r="20" stroke={color} strokeWidth="6" fill="none" />
    <path d="M55 55L75 75" stroke={color} strokeWidth="6" strokeLinecap="round" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = 60, color = '#a78bfa' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path d="M25 30H75" stroke={color} strokeWidth="6" strokeLinecap="round" />
    <path d="M35 30V20H65V30" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="30" y="35" width="40" height="45" rx="3" stroke={color} strokeWidth="6" fill="none" />
    <path d="M40 45V70" stroke={color} strokeWidth="4" strokeLinecap="round" />
    <path d="M50 45V70" stroke={color} strokeWidth="4" strokeLinecap="round" />
    <path d="M60 45V70" stroke={color} strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export const SaveIcon: React.FC<IconProps> = ({ size = 60, color = '#a78bfa' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect x="20" y="20" width="60" height="60" rx="5" stroke={color} strokeWidth="6" fill="none" />
    <path d="M30 20V40H55V20" stroke={color} strokeWidth="6" strokeLinejoin="round" />
    <rect x="35" y="55" width="30" height="25" rx="3" fill={color} />
  </svg>
);

export const DatabaseIcon: React.FC<IconProps> = ({ size = 80, color = '#fbbf24' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <ellipse cx="50" cy="25" rx="30" ry="12" fill={color} />
    <path d="M20 25V75C20 81.6 33.4 87 50 87C66.6 87 80 81.6 80 75V25" stroke={color} strokeWidth="5" fill="none" />
    <ellipse cx="50" cy="45" rx="30" ry="12" fill="none" stroke={color} strokeWidth="5" />
    <ellipse cx="50" cy="65" rx="30" ry="12" fill="none" stroke={color} strokeWidth="5" />
  </svg>
);

export const WorkflowIcon: React.FC<IconProps> = ({ size = 80, color = '#38bdf8' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="25" cy="50" r="15" fill={color} />
    <circle cx="75" cy="50" r="15" fill={color} />
    <circle cx="50" cy="25" r="12" fill={color} opacity="0.7" />
    <circle cx="50" cy="75" r="12" fill={color} opacity="0.7" />
    <path d="M40 50H60" stroke={color} strokeWidth="4" />
    <path d="M50 37L50 63" stroke={color} strokeWidth="4" />
  </svg>
);

export const GearIcon: React.FC<IconProps> = ({ size = 80, color = '#38bdf8' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="15" fill={color} />
    <g stroke={color} strokeWidth="8" strokeLinecap="round">
      <line x1="50" y1="10" x2="50" y2="25" />
      <line x1="50" y1="75" x2="50" y2="90" />
      <line x1="10" y1="50" x2="25" y2="50" />
      <line x1="75" y1="50" x2="90" y2="50" />
      <line x1="21" y1="21" x2="32" y2="32" />
      <line x1="68" y1="68" x2="79" y2="79" />
      <line x1="79" y1="21" x2="68" y2="32" />
      <line x1="32" y1="68" x2="21" y2="79" />
    </g>
  </svg>
);
