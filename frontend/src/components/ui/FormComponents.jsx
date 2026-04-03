import React from 'react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Info } from 'lucide-react';
import { Label } from './ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

// FormField component that handles common field properties
export const FormField = ({ 
  label, 
  error, 
  tooltip, 
  required, 
  className, 
  children 
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center space-x-2">
        {label && (
          <Label className="font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      {children}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

// Text Input Field
export const TextField = ({ 
  label, 
  placeholder, 
  type = "text", 
  value, 
  onChange, 
  error, 
  tooltip, 
  required, 
  className,
  ...props 
}) => {
  return (
    <FormField
      label={label}
      error={error}
      tooltip={tooltip}
      required={required}
      className={className}
    >
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={cn(error && "border-destructive")}
        {...props}
      />
    </FormField>
  );
};

// TextArea Field
export const TextAreaField = ({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  error, 
  tooltip, 
  required, 
  className,
  ...props 
}) => {
  return (
    <FormField
      label={label}
      error={error}
      tooltip={tooltip}
      required={required}
      className={className}
    >
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={cn(error && "border-destructive")}
        {...props}
      />
    </FormField>
  );
};

// Select Field
export const SelectField = ({ 
  label, 
  placeholder = "Select an option", 
  value, 
  onChange, 
  options = [], 
  error, 
  tooltip, 
  required, 
  className,
  ...props 
}) => {
  return (
    <FormField
      label={label}
      error={error}
      tooltip={tooltip}
      required={required}
      className={className}
    >
      <Select value={value} onValueChange={onChange} {...props}>
        <SelectTrigger className={cn(error && "border-destructive")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
};

// Checkbox Field
export const CheckboxField = ({ 
  label, 
  checked, 
  onChange, 
  error, 
  tooltip, 
  description, 
  className,
  ...props 
}) => {
  return (
    <FormField
      error={error}
      tooltip={tooltip}
      className={cn("flex items-start space-x-3 space-y-0", className)}
    >
      <Checkbox 
        checked={checked} 
        onCheckedChange={onChange}
        id={`checkbox-${label}`}
        className="mt-1"
        {...props}
      />
      <div className="space-y-1 leading-none">
        <Label 
          htmlFor={`checkbox-${label}`}
          className="font-medium cursor-pointer"
        >
          {label}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </FormField>
  );
};

// Switch Field
export const SwitchField = ({ 
  label, 
  checked, 
  onChange, 
  error, 
  tooltip, 
  description, 
  className,
  ...props 
}) => {
  return (
    <FormField
      error={error}
      tooltip={tooltip}
      className={cn("flex justify-between items-center", className)}
    >
      <div className="space-y-1 leading-none">
        <Label className="font-medium">{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch 
        checked={checked} 
        onCheckedChange={onChange}
        {...props}
      />
    </FormField>
  );
};

// Radio Group Field
export const RadioField = ({ 
  label, 
  value, 
  onChange, 
  options = [], 
  error, 
  tooltip, 
  required, 
  className,
  ...props 
}) => {
  return (
    <FormField
      label={label}
      error={error}
      tooltip={tooltip}
      required={required}
      className={className}
    >
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="flex flex-col space-y-2"
        {...props}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={`radio-${option.value}`} />
            <Label htmlFor={`radio-${option.value}`} className="cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </FormField>
  );
};

// Date Picker Field
export const DatePickerField = ({ 
  label, 
  value, 
  onChange, 
  error, 
  tooltip, 
  required, 
  className,
  ...props 
}) => {
  return (
    <FormField
      label={label}
      error={error}
      tooltip={tooltip}
      required={required}
      className={className}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              error && "border-destructive"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            {...props}
          />
        </PopoverContent>
      </Popover>
    </FormField>
  );
};

// Form group for organizing related fields
export const FormGroup = ({ title, description, children, className }) => {
  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <div className="space-y-1">
          <h3 className="text-lg font-medium">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

// Form section divider
export const FormDivider = ({ className }) => {
  return (
    <div className={cn("h-px bg-border my-6", className)} />
  );
};

// Form Error Alert
export const FormError = ({ title = "Error", description, className }) => {
  if (!description) return null;
  
  return (
    <Alert variant="destructive" className={cn("mb-6", className)}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
};

// Form Success Alert
export const FormSuccess = ({ title = "Success", description, className }) => {
  if (!description) return null;
  
  return (
    <Alert variant="success" className={cn("mb-6 border-green-700 bg-green-50 text-green-800", className)}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}; 
 
 