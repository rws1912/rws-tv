"use client"

import { useState, useEffect } from 'react';

interface RotatePhoneProps {
    isVisible: boolean;
    setIsVisible: React.Dispatch<React.SetStateAction<boolean>>;
}
export default function RotatePhone({ isVisible, setIsVisible }: RotatePhoneProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 3000); // Animation duration + 1 second

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="text-white text-center">
                <div className="relative w-24 h-40 mx-auto mb-4">
                    {/* Phone outline */}
                    <div className="absolute inset-0 border-4 border-white rounded-lg transform animate-rotate">
                        {/* Screen */}
                        <div className="absolute inset-2 bg-gray-800 rounded-sm"></div>
                    </div>
                    {/* Arrows */}
                    <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 animate-arrow-left">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 animate-arrow-right">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </div>
                </div>
                <p className="text-xl font-bold animate-pulse">Rotate your phone</p>
            </div>
        </div>
    );
}