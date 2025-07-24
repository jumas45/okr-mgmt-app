import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
  error?: string;
  placeholder?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({ label, value, onChange, options, required, error, placeholder }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [highlighted, setHighlighted] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const filtered = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));

  React.useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlighted(h => Math.max(h - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter' && filtered[highlighted]) {
      onChange(filtered[highlighted].value);
      setIsOpen(false);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      e.preventDefault();
    }
  }

  const selected = options.find(opt => opt.value === value);
  const hasValue = !!selected;

  return (
    <div className="relative w-full" ref={containerRef} tabIndex={-1}>
      <div
        className={`block w-full px-3 py-2 bg-transparent border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 cursor-pointer ${error ? 'border-red-500' : 'border-gray-300'} ${isOpen || hasValue ? 'pt-5' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        role="combobox"
        aria-controls="dropdown-listbox"
      >
        <span className={`absolute left-3 top-2 text-gray-500 pointer-events-none transition-all duration-200 ${isOpen || hasValue ? '-top-2 text-xs text-blue-600 bg-white dark:bg-gray-900 px-1' : ''} ${error ? 'text-red-500' : ''}`}>{label}{required && <span className="text-red-500">*</span>}</span>
        <span className="block truncate text-gray-900 dark:text-gray-100">{selected ? selected.label : placeholder || 'Select...'}</span>
      </div>
      {isOpen && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-blue-200 rounded shadow max-h-60 overflow-y-auto animate-fade-in" role="listbox" id="dropdown-listbox">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border-b border-blue-100 focus:outline-none"
            placeholder="Search..."
            autoFocus
            onKeyDown={handleKeyDown}
          />
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-gray-400 text-sm">No matches</div>
          ) : (
            filtered.map((opt, i) => (
              <div
                key={opt.value}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-800 ${i === highlighted ? 'bg-blue-100 dark:bg-blue-700' : ''}`}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                onMouseEnter={() => setHighlighted(i)}
                role="option"
                aria-selected={value === opt.value}
                tabIndex={-1}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
      {error && <span className="text-xs text-red-500 mt-1 block">{error}</span>}
    </div>
  );
};

export default SearchableDropdown; 