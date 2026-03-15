import React, { useState, useEffect, useRef } from 'react';

interface AutocompleteInputProps {
  type: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function AutocompleteInput({ type, label, value, onChange, placeholder, className }: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/suggestions?type=${type}`);
        const data = await res.json();
        setSuggestions(data);
      } catch (e) {
        console.error("Failed to fetch suggestions", e);
      }
    };
    fetchSuggestions();
  }, [type]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveSuggestion = async (val: string) => {
    if (!val.trim()) return;
    try {
      await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value: val })
      });
      // Refresh local suggestions
      if (!suggestions.includes(val)) {
        setSuggestions([...suggestions, val]);
      }
    } catch (e) {
      console.error("Failed to save suggestion", e);
    }
  };

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(value.toLowerCase()) && s !== value
  );

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    e.target.value = '';
    e.target.value = val;
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef} dir="ltr">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
          {label}:
        </label>
      )}
      <div className="flex">
        {label && (
          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-sm">
            {label}
          </span>
        )}
        <input
          type="text"
          value={value ?? ''}
          onFocus={handleFocus}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onBlur={() => handleSaveSuggestion(value)}
          placeholder={placeholder}
          className={`flex-1 block w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 ${
            label ? 'rounded-none rounded-r-md' : 'rounded-md'
          }`}
        />
      </div>
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-900 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 dark:ring-zinc-700 overflow-auto focus:outline-none sm:text-sm">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              className="text-gray-900 dark:text-zinc-100 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-emerald-600 hover:text-white"
              onClick={() => {
                onChange(suggestion);
                setShowSuggestions(false);
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
