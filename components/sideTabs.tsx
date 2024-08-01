"use client";

import React, { useState, useEffect } from 'react';

interface TableInfo {
  status: string;
  header: string;
}

interface SideTabsProps {
  tables: TableInfo[];
  onTabClick: (status: string) => void;
}

const headerColors: { [key: string]: string } = {
  'A - Current Active Projects': 'bg-blue-200',
  'B - Holdback Projects': 'bg-yellow-200',
  'C - Maintenance Holdback Projects': 'bg-green-200',
  'D - Finished Projects': 'bg-red-200',
};

const SideTabs: React.FC<SideTabsProps> = ({ tables, onTabClick }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  return (
    <div className="fixed left-0 top-1/2 transform -translate-y-1/2">
      {tables.map((table, index) => (
        <div
          key={index}
          className="relative mb-2"
          onMouseEnter={() => !isMobile && setHoveredIndex(index)}
          onMouseLeave={() => !isMobile && setHoveredIndex(null)}
        >
          <button
            className={`
              py-2 px-3 text-left rounded-r-lg shadow-md
              transition-all duration-300 ease-in-out
              ${!isMobile && hoveredIndex === index ? 'w-auto min-w-[150px]' : 'w-12'}
              ${headerColors[table.header] || 'bg-gray-200'}
            `}
            onClick={() => onTabClick(table.status)}
          >
            <span className={`whitespace-nowrap ${!isMobile && hoveredIndex === index ? 'opacity-100' : 'opacity-0'}`}>
              {table.header}
            </span>
            <span className={`absolute left-2 top-1/2 transform -translate-y-1/2 ${!isMobile && hoveredIndex === index ? 'opacity-0' : 'opacity-100'}`}>
              {table.header[0]}
            </span>
          </button>
        </div>
      ))}
    </div>
  )
};

export default SideTabs;