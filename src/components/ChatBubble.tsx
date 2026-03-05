import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from "motion/react";

export function ChatBubble({ message }: { message: string }) {
    const anchorRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{top: number, left: number} | null>(null);

    useEffect(() => {
        const updatePosition = () => {
             if (anchorRef.current) {
                // Don't render if hidden (e.g. mobile view hiding desktop sidebar)
                if (anchorRef.current.offsetParent === null) {
                    setCoords(null);
                    return;
                }

                const rect = anchorRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.top + rect.height / 2,
                    left: rect.right + 12 // 12px gap
                });
            }
        };
        
        updatePosition();
        // Update on scroll/resize
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [message]);

    if (!coords) return <div ref={anchorRef} className="absolute right-0 top-1/2 w-0 h-0" />;

    return (
        <>
            <div ref={anchorRef} className="absolute right-0 top-1/2 w-0 h-0" />
            {createPortal(
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8, x: -10, y: '-50%' }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: '-50%' }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="fixed z-[9999] bg-white border-2 border-black px-3 py-2 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] whitespace-nowrap font-bold"
                    style={{ 
                        top: coords.top, 
                        left: coords.left, 
                        // transform is handled by motion (y: '-50%')
                    }}
                >
                    {message}
                    <div className="absolute top-1/2 -left-[6px] -translate-y-1/2 w-3 h-3 bg-white border-b-2 border-l-2 border-black rotate-45"></div>
                </motion.div>,
                document.body
            )}
        </>
    );
}
