"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, ArrowRight, Mic, MicOff, Loader2, MapPin, Home, TrendingUp, Eye, Heart, FileText, Map as MapIcon, Sparkles, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
// import { useProperties } from '@/contexts/PropertiesContext'; // Use new PropertyContext
import { useUserLocation } from '@/contexts/LocationContext';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';

const LakshmiAssistant = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeLocation } = useUserLocation();
    const { savedProperties } = useSavedProperties();

    // Mock properties contexts for now
    const viewedProperties: any[] = [];
    const appliedProperties: any[] = [];

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [onboardingCompleted, setOnboardingCompleted] = useState(false);
    const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);
    const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);

    // Draggable button state
    const [buttonPosition, setButtonPosition] = useState<{ x: number | null, y: number | null }>({ x: null, y: null });
    const [isDragging, setIsDragging] = useState(false);
    const [hasDragged, setHasDragged] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Time-based greeting
    const getTimeBasedGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    // Initialize Chat
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const onboardingKey = user ? `lakshmi_onboarding_${user.id}` : 'lakshmi_onboarding_guest';
            const hasCompleted = localStorage.getItem(onboardingKey) === 'true';

            if (hasCompleted) {
                setOnboardingCompleted(true);
                setShowOnboarding(false);
            } else {
                setShowOnboarding(true);
            }
        }
    }, [user]);

    // Welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const userName = user?.name?.split(' ')[0] || 'there';
            const greeting = getTimeBasedGreeting();
            const welcomeMessage = {
                id: Date.now() + Math.random(),
                type: 'bot',
                text: `${greeting}, ${userName}! 👋\n\nI'm Lakshmi, your AI property assistant. I can help you:\n\n• Find properties near you\n• Search by price, bedrooms, or location\n• Navigate the dashboard\n• Answer property questions\n\nWhat would you like to explore today?`,
                data: null,
                timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
        }
    }, [isOpen]); // user in dep array causing loop if not careful? No, user is stable from context ideally.

    // Drag handlers
    const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!buttonRef.current) return;

        // Prevent default only for touch to avoid scrolling, careful with mouse to allow click
        // e.preventDefault(); 

        setIsDragging(true);
        setHasDragged(false);

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const rect = buttonRef.current.getBoundingClientRect();
        setDragOffset({
            x: clientX - rect.left,
            y: clientY - rect.top
        });
    }, []);

    const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        setHasDragged(true);

        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

        const buttonWidth = buttonRef.current?.offsetWidth || 140;
        const buttonHeight = buttonRef.current?.offsetHeight || 44;

        const newX = Math.max(0, Math.min(window.innerWidth - buttonWidth, clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - buttonHeight, clientY - dragOffset.y));

        setButtonPosition({ x: newX, y: newY });
    }, [isDragging, dragOffset]);

    const handleDragEnd = useCallback(() => {
        setTimeout(() => setIsDragging(false), 10);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (text: string | null = null) => {
        const messageText = text || inputValue.trim();
        if (!messageText || isProcessing) return;

        // Add user message
        const userMsg = {
            id: Date.now(),
            type: 'user',
            text: messageText,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsProcessing(true);

        // Simulate response
        setTimeout(() => {
            const botMsg = {
                id: Date.now() + 1,
                type: 'bot',
                text: "I'm currently in demo mode, but I can help you navigate! Try clicking on 'Dashboard', 'Saved Properties', or browsing the 'Discover' section.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
            setIsProcessing(false);
        }, 1000);
    };

    const getButtonStyle = () => {
        if (buttonPosition.x !== null && buttonPosition.y !== null) {
            return { left: buttonPosition.x, top: buttonPosition.y, right: 'auto', bottom: 'auto' };
        }
        return { right: 24, bottom: 24 };
    };

    return (
        <>
            {!isOpen && (
                <div
                    ref={buttonRef}
                    className="fixed z-40"
                    style={getButtonStyle() as React.CSSProperties}
                >
                    <button
                        onMouseDown={handleDragStart as any}
                        onTouchStart={handleDragStart as any}
                        onClick={() => {
                            if (!hasDragged) setIsOpen(true);
                            setHasDragged(false);
                        }}
                        className={`px-4 py-3 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 relative select-none ${isDragging ? 'cursor-grabbing scale-105 opacity-90' : 'cursor-grab hover:scale-105'}`}
                    >
                        <Bot size={20} />
                        <span className="font-medium text-sm whitespace-nowrap">Ask Lakshmi</span>
                    </button>
                </div>
            )}

            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700 font-sans">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <Bot size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">Lakshmi Assistant</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    <span className="text-xs text-white/90">Online</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl p-3.5 text-sm shadow-sm ${msg.type === 'user'
                                        ? 'bg-orange-500 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-none'
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 rounded-tl-none shadow-sm flex gap-1.5">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                            className="flex items-center gap-2"
                        >
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="w-full pl-4 pr-10 py-3 bg-gray-100 dark:bg-gray-900 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-black rounded-xl text-sm transition-all outline-none"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors"
                                >
                                    <Mic size={18} />
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isProcessing}
                                className="p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                        <div className="text-center mt-2">
                            <span className="text-[10px] text-gray-400">Powered by Estospaces AI</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default LakshmiAssistant;

