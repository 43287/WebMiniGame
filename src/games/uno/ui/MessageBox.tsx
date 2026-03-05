import React from 'react';
import { Button } from '../../../components/ui.tsx';
import { motion, AnimatePresence } from 'motion/react';

interface MessageBoxProps {
  isOpen: boolean;
  title: string;
  message: string;
  buttons: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }[];
  footer?: React.ReactNode;
}

export function MessageBox({ isOpen, title, message, buttons, footer }: MessageBoxProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-4 border-black p-6 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 flex flex-col items-center gap-4 w-[90%] max-w-md"
        >
          <h3 className="text-2xl font-black text-center">{title}</h3>
          <p className="text-center font-bold">{message}</p>
          <div className="flex gap-4">
            {buttons.map((btn, index) => (
              <Button 
                key={index}
                className={
                  btn.variant === 'danger' ? "bg-red-500 hover:bg-red-600 text-white" :
                  btn.variant === 'secondary' ? "bg-gray-200 hover:bg-gray-300 text-black" :
                  "bg-black text-white hover:bg-gray-800"
                }
                onClick={btn.onClick}
              >
                {btn.label}
              </Button>
            ))}
          </div>
          {footer && (
            <div className="text-xs text-gray-500 max-w-xs text-center">
              {footer}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
