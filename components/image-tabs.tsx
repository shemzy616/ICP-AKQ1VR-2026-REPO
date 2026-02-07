'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils'; // Make sure you have this utility, or just use template literals

export default function ImageTabs() {
  const [activeTab, setActiveTab] = useState('organize');

  // Helper to get classes based on active state
  const getTabStyle = (tabName: string) => {
    return cn(
      "px-6 py-3 rounded-full text-sm font-medium transition-all duration-200",
      activeTab === tabName
        ? "bg-black text-white shadow-md hover:bg-zinc-800" // Active: Black & White
        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-black" // Inactive: Grey & Dark Grey
    );
  };

  return (
    <section className='py-16'>
      <div className='container mx-auto px-4'>
        <div className='mx-auto max-w-6xl'>
          
          {/* Tabs */}
          <div className='flex flex-wrap gap-3 justify-center mb-12'>
            <button 
              onClick={() => setActiveTab('organize')} 
              className={getTabStyle('organize')}
            >
              Organize Applications
            </button>
            
            <button 
              onClick={() => setActiveTab('hired')} 
              className={getTabStyle('hired')}
            >
              Get Hired
            </button>
            
            <button 
              onClick={() => setActiveTab('boards')} 
              className={getTabStyle('boards')}
            >
              Manage Boards
            </button>
          </div>

          {/* Image Display */}
          <div className='relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-2xl shadow-zinc-200/50'>
            {activeTab === 'organize' && (
              <Image
                src='/hero-images/hero1.png'
                alt='Organize Applications interface'
                width={1200}
                height={600}
                priority
                className="w-full h-auto"
              />
            )}
            
            {activeTab === 'hired' && (
              <Image
                src='/hero-images/hero2.png'
                alt='Get Hired interface'
                width={1200}
                height={600}
                className="w-full h-auto"
              />
            )}

            {activeTab === 'boards' && (
              <Image
                src='/hero-images/hero3.png'
                alt='Manage Boards interface'
                width={1200}
                height={600}
                className="w-full h-auto"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
