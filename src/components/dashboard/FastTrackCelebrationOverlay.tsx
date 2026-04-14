'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Building2, CheckCircle2, Sparkles } from 'lucide-react';

interface FastTrackCelebrationOverlayProps {
    active: boolean;
    title: string;
    subtitle: string;
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
const CELEBRATION_DURATION_MS = 5600;
const PARTICLE_COUNT = 340;

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

    return (
        <div className="pointer-events-none fixed inset-0 z-[220] overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.12))] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.22),rgba(2,6,23,0.46))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.74),transparent_32%)] dark:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.12),transparent_30%)]" />
            <div className="absolute -left-10 top-4 h-72 w-72 rounded-full bg-orange-300/28 blur-3xl" />
            <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-amber-300/18 blur-3xl" />
            <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-emerald-300/14 blur-3xl" />
            <div className="absolute bottom-8 right-1/4 h-64 w-64 rounded-full bg-sky-300/12 blur-3xl" />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

            <div className="absolute inset-x-0 top-5 flex justify-center px-4 sm:top-8">
                <div className="relative w-full max-w-3xl">
                    <div className="absolute inset-0 rounded-[2.3rem] bg-[linear-gradient(135deg,rgba(249,115,22,0.28),rgba(250,204,21,0.14),rgba(34,197,94,0.18))] blur-2xl" />
                    <div className="absolute -left-3 top-10 h-20 w-20 rounded-full border border-white/40 bg-white/30 blur-md dark:border-white/10 dark:bg-white/6" />
                    <div className="absolute -right-4 top-16 h-24 w-24 rounded-full border border-orange-200/60 bg-orange-200/25 blur-md dark:border-orange-400/20 dark:bg-orange-500/8" />

                    <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,247,237,0.9))] px-6 py-6 text-center shadow-[0_36px_120px_-38px_rgba(15,23,42,0.48)] backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.92),rgba(15,23,42,0.84))] sm:px-8 sm:py-7">
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.66),rgba(255,255,255,0.18))] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
                        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/70 to-transparent" />

                        <div className="relative flex flex-col items-center">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-700 shadow-sm dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-200">
                                <Sparkles className="h-3.5 w-3.5" />
                                24-Hour Fast Track
                            </div>

                            <div className="mb-5 w-full max-w-2xl rounded-[2rem] border border-orange-100/80 bg-white/58 px-5 py-5 shadow-[0_20px_60px_-42px_rgba(249,115,22,0.6)] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] sm:px-6">
                                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-5">
                                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center sm:h-28 sm:w-28">
                                        <div className="absolute inset-0 rounded-full border border-orange-200/80 bg-[radial-gradient(circle,rgba(251,146,60,0.22),rgba(255,255,255,0.14)_60%,transparent_78%)] dark:border-orange-400/20 dark:bg-[radial-gradient(circle,rgba(249,115,22,0.24),rgba(15,23,42,0.04)_58%,transparent_78%)]" />
                                        <div className="absolute inset-[10px] rounded-full border border-white/80 bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-white/10 dark:bg-slate-950/72" />
                                        <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/80 bg-[linear-gradient(160deg,#fb923c,#f97316_42%,#f59e0b)] text-white shadow-[0_20px_48px_-22px_rgba(249,115,22,0.88)] sm:h-20 sm:w-20">
                                            <Building2 className="h-8 w-8 sm:h-9 sm:w-9" />
                                        </div>
                                        <div className="absolute bottom-0 right-1 flex h-8 w-8 items-center justify-center rounded-xl border border-white/90 bg-emerald-50 text-emerald-600 shadow-lg dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                                            <CheckCircle2 className="h-4.5 w-4.5" />
                                        </div>
                                    </div>

                                    <div className="flex max-w-md flex-col items-center text-center sm:items-start sm:text-left">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                                            Completion verified
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                            Documents are aligned, the workspace is ready, and the next handoff can start without extra follow-up.
                                        </p>
                                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700 shadow-sm dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-200">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Workspace ready
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1.5 text-emerald-700 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Verified handoff
                                </span>
                                <span className="rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200">
                                    Estospaces workspace
                                </span>
                            </div>

                            <div className="mt-4 h-px w-full max-w-md bg-gradient-to-r from-transparent via-orange-200/80 to-transparent dark:via-orange-400/20" />

                            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[2.35rem]">
                                {title}
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                                {subtitle}
                            </p>
                            <p className="mt-3 max-w-xl text-xs font-medium uppercase tracking-[0.2em] text-slate-500/90 dark:text-slate-400 sm:text-[13px]">
                                Documents, viewing, and next-step handoff are aligned.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
