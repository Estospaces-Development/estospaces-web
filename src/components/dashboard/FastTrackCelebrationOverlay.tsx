'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Building2, CheckCircle2, Sparkles } from 'lucide-react';

interface FastTrackCelebrationOverlayProps {
    active: boolean;
    title: string;
    subtitle: string;
    role?: 'user' | 'manager' | 'admin';
    footerAction?: React.ReactNode;
    onComplete?: () => void;
}

type ParticleShape = 'circle' | 'square' | 'streamer' | 'diamond' | 'house' | 'spark';

interface Particle {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    size: number;
    color: string;
    rotation: number;
    spin: number;
    wobble: number;
    wobbleSpeed: number;
    opacity: number;
    shape: ParticleShape;
    lifetime: number;
    delayMs: number;
    gravity: number;
    drag: number;
    trailLength: number;
}

const COLORS = ['#f97316', '#fb923c', '#facc15', '#22c55e', '#38bdf8', '#f8fafc', '#fdba74'];
const PARTICLE_SHAPES: ParticleShape[] = ['streamer', 'square', 'diamond', 'circle', 'spark', 'house'];
const CELEBRATION_DURATION_MS = 6200;
const PARTICLE_COUNT = 420;

const randomBetween = (minimum: number, maximum: number) => minimum + Math.random() * (maximum - minimum);

const createParticle = (width: number, height: number, index: number): Particle => {
    const lane = index % 6;
    const wave = Math.floor(index / 52);
    let x = randomBetween(width * 0.08, width * 0.92);
    let y = randomBetween(-height * 0.16, -12);
    let velocityX = randomBetween(-3.4, 3.4);
    let velocityY = randomBetween(1.6, 7.4);

    if (lane === 1) {
        x = randomBetween(-36, width * 0.12);
        y = randomBetween(height * 0.14, height * 0.52);
        velocityX = randomBetween(4.6, 9.6);
        velocityY = randomBetween(-8.8, 0.8);
    } else if (lane === 2) {
        x = randomBetween(width * 0.88, width + 36);
        y = randomBetween(height * 0.14, height * 0.52);
        velocityX = randomBetween(-9.6, -4.6);
        velocityY = randomBetween(-8.8, 0.8);
    } else if (lane === 3) {
        x = randomBetween(width * 0.36, width * 0.64);
        y = randomBetween(height * 0.12, height * 0.24);
        velocityX = randomBetween(-6.4, 6.4);
        velocityY = randomBetween(-10.6, -2.2);
    } else if (lane === 4) {
        x = randomBetween(width * 0.12, width * 0.34);
        y = randomBetween(-22, height * 0.08);
        velocityX = randomBetween(1.2, 5.2);
        velocityY = randomBetween(1.2, 5.4);
    } else if (lane === 5) {
        x = randomBetween(width * 0.66, width * 0.88);
        y = randomBetween(-22, height * 0.08);
        velocityX = randomBetween(-5.2, -1.2);
        velocityY = randomBetween(1.2, 5.4);
    }

    const shape = PARTICLE_SHAPES[index % PARTICLE_SHAPES.length];
    const isSpark = shape === 'spark';
    const isStreamer = shape === 'streamer';

    return {
        x,
        y,
        velocityX,
        velocityY,
        size: isSpark ? randomBetween(5, 9) : isStreamer ? randomBetween(12, 19) : randomBetween(7, 15),
        color: COLORS[index % COLORS.length],
        rotation: randomBetween(0, Math.PI * 2),
        spin: randomBetween(-0.18, 0.18),
        wobble: randomBetween(0, Math.PI * 2),
        wobbleSpeed: randomBetween(0.08, 0.24),
        opacity: 1,
        shape,
        lifetime: randomBetween(CELEBRATION_DURATION_MS * 0.44, CELEBRATION_DURATION_MS * 0.88),
        delayMs: wave * 145 + randomBetween(0, 210),
        gravity: isSpark ? 0.11 : randomBetween(0.12, 0.2),
        drag: isSpark ? 0.989 : randomBetween(0.991, 0.996),
        trailLength: isStreamer ? randomBetween(14, 24) : randomBetween(6, 15),
    };
};

const drawSpark = (context: CanvasRenderingContext2D, particle: Particle) => {
    const arm = particle.size * 0.72;
    context.strokeStyle = particle.color;
    context.lineWidth = Math.max(1.15, particle.size * 0.14);
    context.beginPath();
    context.moveTo(-arm, 0);
    context.lineTo(arm, 0);
    context.moveTo(0, -arm);
    context.lineTo(0, arm);
    context.moveTo(-arm * 0.7, -arm * 0.7);
    context.lineTo(arm * 0.7, arm * 0.7);
    context.moveTo(-arm * 0.7, arm * 0.7);
    context.lineTo(arm * 0.7, -arm * 0.7);
    context.stroke();
};

const drawHouse = (context: CanvasRenderingContext2D, particle: Particle) => {
    const bodyWidth = particle.size;
    const bodyHeight = particle.size * 0.72;
    const roofHeight = particle.size * 0.54;

    context.beginPath();
    context.moveTo(0, -(bodyHeight * 0.5 + roofHeight));
    context.lineTo(bodyWidth * 0.62, -bodyHeight * 0.2);
    context.lineTo(bodyWidth * 0.62, bodyHeight * 0.54);
    context.lineTo(-bodyWidth * 0.62, bodyHeight * 0.54);
    context.lineTo(-bodyWidth * 0.62, -bodyHeight * 0.2);
    context.closePath();
    context.fill();

    context.fillStyle = 'rgba(255,255,255,0.72)';
    context.fillRect(-bodyWidth * 0.14, bodyHeight * 0.02, bodyWidth * 0.28, bodyHeight * 0.52);
};

const drawParticle = (context: CanvasRenderingContext2D, particle: Particle) => {
    const offsetX = Math.sin(particle.wobble) * 7;
    const offsetY = Math.cos(particle.wobble * 0.65) * 2.4;

    context.save();
    context.globalAlpha = particle.opacity;
    context.translate(particle.x + offsetX, particle.y + offsetY);
    context.rotate(particle.rotation);

    context.fillStyle = particle.color;
    context.strokeStyle = particle.color;

    if (particle.shape !== 'circle') {
        context.save();
        context.globalAlpha = particle.opacity * 0.24;
        context.fillStyle = particle.color;
        context.fillRect(-1, -particle.trailLength, 2, particle.trailLength);
        context.restore();
    }

    if (particle.shape === 'circle') {
        context.beginPath();
        context.arc(0, 0, particle.size * 0.48, 0, Math.PI * 2);
        context.fill();
    } else if (particle.shape === 'streamer') {
        context.fillRect(-particle.size * 0.16, -particle.size * 1.24, particle.size * 0.32, particle.size * 2.48);
    } else if (particle.shape === 'diamond') {
        context.rotate(Math.PI / 4);
        context.fillRect(-particle.size * 0.46, -particle.size * 0.46, particle.size * 0.92, particle.size * 0.92);
    } else if (particle.shape === 'spark') {
        drawSpark(context, particle);
    } else if (particle.shape === 'house') {
        drawHouse(context, particle);
    } else {
        context.fillRect(-particle.size * 0.5, -particle.size * 0.4, particle.size, particle.size * 0.8);
    }

    context.restore();
};

export default function FastTrackCelebrationOverlay({
    active,
    title,
    subtitle,
    role = 'manager',
    footerAction,
    onComplete,
}: FastTrackCelebrationOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const onCompleteRef = useRef(onComplete);
    const [visible, setVisible] = useState(active);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        setVisible(active);
    }, [active]);

    useEffect(() => {
        if (!active || !visible) {
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
        if (prefersReducedMotion) {
            const timeoutId = window.setTimeout(() => {
                setVisible(false);
                onCompleteRef.current?.();
            }, 2200);

            return () => {
                window.clearTimeout(timeoutId);
            };
        }

        const devicePixelRatio = Math.max(window.devicePixelRatio || 1, 1);
        let viewportWidth = window.innerWidth;
        let viewportHeight = window.innerHeight;

        const resizeCanvas = () => {
            viewportWidth = window.innerWidth;
            viewportHeight = window.innerHeight;
            canvas.width = Math.floor(viewportWidth * devicePixelRatio);
            canvas.height = Math.floor(viewportHeight * devicePixelRatio);
            canvas.style.width = `${viewportWidth}px`;
            canvas.style.height = `${viewportHeight}px`;
            context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        };

        resizeCanvas();

        const particles = Array.from({ length: PARTICLE_COUNT }, (_, index) => createParticle(viewportWidth, viewportHeight, index));
        const startedAt = performance.now();
        let animationFrameId = 0;

        const render = (now: number) => {
            const elapsed = now - startedAt;
            context.clearRect(0, 0, viewportWidth, viewportHeight);

            particles.forEach((particle) => {
                const particleAge = elapsed - particle.delayMs;
                if (particleAge <= 0) {
                    return;
                }

                const fadeStart = particle.lifetime * 0.56;
                if (particleAge > fadeStart) {
                    particle.opacity = Math.max(0, 1 - (particleAge - fadeStart) / Math.max(particle.lifetime - fadeStart, 1));
                }

                particle.x += particle.velocityX;
                particle.y += particle.velocityY;
                particle.velocityX *= particle.drag;
                particle.velocityY += particle.gravity;
                particle.rotation += particle.spin;
                particle.wobble += particle.wobbleSpeed;

                if (particle.opacity > 0 && particleAge < particle.lifetime && particle.y < viewportHeight + 72) {
                    drawParticle(context, particle);
                }
            });

            if (elapsed < CELEBRATION_DURATION_MS) {
                animationFrameId = window.requestAnimationFrame(render);
                return;
            }

            context.clearRect(0, 0, canvas.width, canvas.height);
            setVisible(false);
            onCompleteRef.current?.();
        };

        animationFrameId = window.requestAnimationFrame(render);
        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.cancelAnimationFrame(animationFrameId);
            context.clearRect(0, 0, viewportWidth, viewportHeight);
        };
    }, [active, visible]);

    if (!visible) {
        return null;
    }

    const overlayCopy = role === 'user'
        ? {
            eyebrow: 'Your 24-hour journey is complete',
            note: 'Everything is now in place. Take a moment and enjoy the milestone.',
            milestone: 'Keys and handover confirmed',
            footer: 'You can open the full journey details any time from your dashboard.',
        }
        : {
            eyebrow: 'Journey closed successfully',
            note: 'Every final step is aligned and the handover is fully wrapped up.',
            milestone: 'Completion and handover verified',
            footer: 'The journey is now closed cleanly with the final records in place.',
        };

    return (
        <div
            data-fast-track-celebration-overlay="true"
            className="pointer-events-none fixed inset-0 z-[10050] overflow-hidden"
        >
            <div className="absolute inset-0 bg-slate-950/54 backdrop-blur-[18px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.24),transparent_28%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.14),transparent_30%)]" />
            <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400/12 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 blur-2xl" />
            <div className="absolute -left-12 top-10 h-72 w-72 rounded-full bg-orange-400/14 blur-3xl" />
            <div className="absolute -right-10 bottom-8 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

            <div className="absolute inset-0 flex items-center justify-center px-4 py-6 sm:px-6">
                <div className="relative w-full max-w-2xl">
                    <div className="absolute inset-0 rounded-[2.6rem] bg-[radial-gradient(circle,rgba(249,115,22,0.26),rgba(15,23,42,0.12)_58%,transparent_74%)] blur-3xl" />

                    <div className="pointer-events-auto relative overflow-hidden rounded-[2.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))] px-6 py-8 text-center shadow-[0_60px_150px_-42px_rgba(0,0,0,0.82)] backdrop-blur-2xl sm:px-10 sm:py-10">
                        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(251,146,60,0.14),transparent_26%,rgba(255,255,255,0.04)_52%,transparent_78%)]" />
                        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/60 to-transparent" />
                        <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-orange-300/10 blur-3xl" />

                        <div className="relative flex flex-col items-center">
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-100">
                                <Sparkles className="h-3.5 w-3.5" />
                                {overlayCopy.eyebrow}
                            </div>

                            <div className="relative mt-7 flex h-32 w-32 items-center justify-center sm:h-36 sm:w-36">
                                <div className="absolute inset-0 rounded-full border border-orange-200/30 bg-orange-400/10" />
                                <div className="absolute inset-[10px] rounded-full border border-white/12 bg-white/5" />
                                <div className="absolute inset-[24px] rounded-[2rem] bg-[linear-gradient(160deg,#fb923c,#f97316_42%,#f59e0b)] shadow-[0_30px_90px_-26px_rgba(249,115,22,0.9)]" />
                                <div className="absolute inset-[24px] rounded-[2rem] border border-white/30" />
                                <div className="relative flex h-20 w-20 items-center justify-center text-white sm:h-24 sm:w-24">
                                    <Building2 className="h-11 w-11 sm:h-12 sm:w-12" />
                                </div>
                                <div className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-emerald-400/18 text-emerald-100 shadow-lg shadow-emerald-900/20">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </div>

                            <h2
                                data-fast-track-celebration-title="true"
                                className="mt-8 text-3xl font-semibold tracking-tight text-white sm:text-[3rem]"
                            >
                                {title}
                            </h2>
                            <p className="mt-4 max-w-xl text-base leading-7 text-slate-200/92">
                                {subtitle}
                            </p>

                            <div className="mt-6 max-w-xl rounded-[1.6rem] border border-white/10 bg-white/6 px-5 py-4 text-sm leading-6 text-slate-200/86">
                                {overlayCopy.note}
                            </div>

                            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-emerald-100">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {overlayCopy.milestone}
                                </span>
                            </div>

                            <p className="mt-4 max-w-lg text-xs leading-5 text-slate-300/72 sm:text-sm">
                                {overlayCopy.footer}
                            </p>
                            {footerAction ? (
                                <div className="mt-5 flex justify-center">
                                    {footerAction}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
