import React from 'react';

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, value, onChange, type = 'text', name, required, error, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const hasValue = value !== undefined && value !== '' && value !== null;
    return (
      <div className="relative w-full">
        <input
          ref={ref}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          required={required}
          className={`block w-full px-3 py-2 bg-transparent border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${isFocused || hasValue ? 'pt-5' : ''}`}
          {...props}
        />
        <label
          className={`absolute left-3 top-2 text-gray-500 pointer-events-none transition-all duration-200
            ${isFocused || hasValue ? '-top-2 text-xs text-blue-600 bg-white dark:bg-gray-900 px-1' : ''}
            ${error ? 'text-red-500' : ''}`}
        >
          {label}{required && <span className="text-red-500">*</span>}
        </label>
        {error && <span className="text-xs text-red-500 mt-1 block">{error}</span>}
      </div>
    );
  }
);

export default FloatingLabelInput; 