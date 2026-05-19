import React from 'react'

const iconClass = "w-10 h-10"

export const RouterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || iconClass} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="20" width="32" height="16" rx="3" fill="currentColor" opacity="0.15" />
    <rect x="8" y="20" width="32" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
    <circle cx="24" cy="28" r="3" fill="currentColor" opacity="0.6" />
    <path d="M16 20V14M24 20V12M32 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="12" r="2" fill="currentColor" />
    <circle cx="24" cy="10" r="2" fill="currentColor" />
    <circle cx="32" cy="12" r="2" fill="currentColor" />
  </svg>
)

export const SwitchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || iconClass} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="18" width="36" height="18" rx="2" fill="currentColor" opacity="0.15" />
    <rect x="6" y="18" width="36" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
    <circle cx="14" cy="27" r="2.5" fill="currentColor" opacity="0.5" />
    <circle cx="24" cy="27" r="2.5" fill="currentColor" opacity="0.5" />
    <circle cx="34" cy="27" r="2.5" fill="currentColor" opacity="0.5" />
    <path d="M14 18V14M24 18V14M34 18V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const FirewallIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || iconClass} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="8" width="28" height="32" rx="2" fill="currentColor" opacity="0.15" />
    <rect x="10" y="8" width="28" height="32" rx="2" stroke="currentColor" strokeWidth="2" />
    <rect x="14" y="14" width="20" height="4" rx="1" fill="currentColor" opacity="0.3" />
    <rect x="14" y="22" width="20" height="4" rx="1" fill="currentColor" opacity="0.3" />
    <rect x="14" y="30" width="20" height="4" rx="1" fill="currentColor" opacity="0.3" />
    <path d="M18 16H22M18 24H22M18 32H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const PCIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || iconClass} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="8" width="28" height="22" rx="2" fill="currentColor" opacity="0.15" />
    <rect x="10" y="8" width="28" height="22" rx="2" stroke="currentColor" strokeWidth="2" />
    <rect x="14" y="12" width="20" height="14" rx="1" fill="currentColor" opacity="0.1" />
    <rect x="18" y="34" width="12" height="3" rx="1" fill="currentColor" opacity="0.3" />
    <path d="M16 37H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const ServerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || iconClass} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="6" width="28" height="14" rx="2" fill="currentColor" opacity="0.15" />
    <rect x="10" y="6" width="28" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
    <circle cx="16" cy="13" r="2" fill="currentColor" opacity="0.5" />
    <rect x="22" y="11" width="10" height="4" rx="1" fill="currentColor" opacity="0.2" />
    <rect x="10" y="24" width="28" height="14" rx="2" fill="currentColor" opacity="0.15" />
    <rect x="10" y="24" width="28" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
    <circle cx="16" cy="31" r="2" fill="currentColor" opacity="0.5" />
    <rect x="22" y="29" width="10" height="4" rx="1" fill="currentColor" opacity="0.2" />
  </svg>
)

export const MobileIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || iconClass} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="4" width="20" height="40" rx="4" fill="currentColor" opacity="0.15" />
    <rect x="14" y="4" width="20" height="40" rx="4" stroke="currentColor" strokeWidth="2" />
    <circle cx="24" cy="36" r="2.5" fill="currentColor" opacity="0.5" />
    <rect x="18" y="10" width="12" height="20" rx="1" fill="currentColor" opacity="0.1" />
    <line x1="20" y1="8" x2="28" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)
