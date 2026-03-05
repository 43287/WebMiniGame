
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../components/ui.tsx';

interface HandLayoutProps<T> {
    items: T[];
    renderItem: (item: T, index: number, isPlayable?: boolean) => React.ReactNode;
    onItemClick?: (item: T) => void;
    isMyTurn?: boolean;
    className?: string;
    cardWidth?: number; // Default 96 (w-24) or 80 (w-20)
}

export function HandLayout<T extends { id: string }>({ 
    items, 
    renderItem, 
    onItemClick,
    isMyTurn = false,
    className,
    cardWidth: initialCardWidth = 96
}: HandLayoutProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [overlap, setOverlap] = useState(0);
    const [scale, setScale] = useState(1);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    useEffect(() => {
        if (items.length <= 1) {
            setOverlap(0);
            setScale(1);
            return;
        }

        const isSmallScreen = window.innerWidth < 640;
        const cardWidth = isSmallScreen ? 80 : initialCardWidth;
        // Padding adjustment if needed, but we rely on containerWidth
        const availableWidth = containerWidth; 
        
        const totalWidthNeeded = items.length * cardWidth;
        let newScale = 1;

        if (totalWidthNeeded <= availableWidth) {
            setOverlap(0);
        } else {
            // Calculate needed overlap
            // Total = Card + (N-1)*(Card - Overlap)
            const visibleWidth = (availableWidth - cardWidth) / (items.length - 1);
            let newOverlap = cardWidth - visibleWidth;
            const overlapPercentage = newOverlap / cardWidth;

            // Scale down logic from UNO Board
            if (overlapPercentage > 0.60) {
                newScale = 0.8;
            } else if (scale === 0.8 && overlapPercentage < 0.35) {
                newScale = 1;
            } else if (scale === 1 && overlapPercentage > 0.5) {
                newScale = 0.8;
            } else if (scale !== 1 && scale !== 0.8) {
                // Reset if scale was something else
                newScale = 1;
            } else {
                newScale = scale; // Keep current
            }

            const scaledCardWidth = cardWidth * newScale;
            const scaledTotalWidth = items.length * scaledCardWidth;

            if (scaledTotalWidth <= availableWidth) {
                newOverlap = 0;
            } else {
                const scaledVisibleWidth = (availableWidth - scaledCardWidth) / (items.length - 1);
                newOverlap = scaledCardWidth - scaledVisibleWidth;
            }

            if (newOverlap < 0) newOverlap = 0;
            if (newOverlap > scaledCardWidth) newOverlap = scaledCardWidth;

            setOverlap(Math.max(0, newOverlap));
        }
        setScale(newScale);

    }, [containerWidth, items.length, initialCardWidth]);

    return (
        <div 
            className={cn("flex justify-center w-full overflow-x-hidden py-4 px-2 min-h-[120px]", className)} 
            ref={containerRef}
        >
            <div 
                className="flex transition-all duration-300 ease-out items-end"
                style={{ 
                    // When overlapping, we rely on negative margin. 
                    // When not overlapping, we can use gap.
                    gap: overlap === 0 ? '0.5rem' : '0',
                    justifyContent: overlap === 0 ? 'center' : 'flex-start',
                    width: overlap > 0 ? 'max-content' : 'auto',
                    minWidth: overlap > 0 ? 'auto' : '100%' 
                }}
            >
                <AnimatePresence mode='popLayout'>
                    {items.map((item, index) => (
                        <motion.div
                            layout
                            key={item.id}
                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                            animate={{ 
                                scale: scale, 
                                opacity: 1, 
                                y: 0,
                                marginLeft: index === 0 ? 0 : -overlap,
                                zIndex: index
                            }}
                            whileHover={{ 
                                scale: 1.1, 
                                y: -30, 
                                zIndex: 100, 
                                transition: { duration: 0.1 }
                            }}
                            exit={{ scale: 0.8, opacity: 0, y: -50, transition: { duration: 0.2 } }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="relative cursor-pointer"
                            style={{ zIndex: index }}
                            onClick={() => onItemClick && onItemClick(item)}
                        >
                            {renderItem(item, index)}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
