import React from 'react';
import { AlertCircle, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 flex flex-col gap-4 relative animate-scaleIn">
        <button disabled={isLoading} onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="font-sans font-black text-lg text-slate-800 tracking-tight">{title}</h3>
        </div>
        <p className="font-sans text-sm text-slate-600 ml-12">{message}</p>
        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(); }}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-sans text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfirm(); }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans text-xs font-bold text-white bg-red-500 hover:bg-red-600 shadow-sm transition-colors disabled:opacity-50"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
