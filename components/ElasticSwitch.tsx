
import React from 'react';

interface Props {
  checked: boolean;
  onChange: () => void;
  id?: string;
  disabled?: boolean;
}

export const ElasticSwitch: React.FC<Props> = ({ checked, onChange, id, disabled }) => (
  <button
    id={id}
    onClick={disabled ? undefined : onChange}
    type="button"
    disabled={disabled}
    className={`
      relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent 
      transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2
      ${checked ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    <span className="sr-only">Toggle</span>
    <span
      aria-hidden="true"
      className={`
        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 
        transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
        ${checked ? 'translate-x-5' : 'translate-x-0'}
      `}
    />
  </button>
);
