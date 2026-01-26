"use client";

import { motion, useSpring, useTransform, useMotionValue, useIsPresent } from "framer-motion";
import { useEffect } from "react";

interface AnimatedNumberProps {
    value: number;
    format?: (val: number) => string;
    className?: string;
    springOptions?: {
        stiffness?: number;
        damping?: number;
        mass?: number;
    };
}

export function AnimatedNumber({
    value,
    format = (v) => Math.round(v).toLocaleString("id-ID"),
    className = "",
    springOptions = { stiffness: 75, damping: 15, mass: 1 }
}: AnimatedNumberProps) {
    const spring = useSpring(value, springOptions);
    const display = useTransform(spring, (current) => format(current));

    useEffect(() => {
        spring.set(value);
    }, [value, spring]);

    return <motion.span className={className}>{display}</motion.span>;
}

export function AnimatedPriceChange({
    value,
    percent
}: {
    value: number;
    percent: number
}) {
    const isPositive = value >= 0;

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            key={value} // Re-animate on value change
            className={`flex items-center gap-1 font-mono font-semibold ${isPositive ? "text-profit" : "text-loss"
                }`}
        >
            <span className="text-sm">
                {isPositive ? "↗ +" : "↘ "}
            </span>
            <AnimatedNumber
                value={percent}
                format={(v) => v.toFixed(2)}
                className="text-sm"
            />
            <span className="text-sm">%</span>
        </motion.div>
    );
}
