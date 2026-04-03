import React from 'react';
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export function DatePicker({
  date,
  setDate,
  className,
  disabled,
  placeholder = "Pick a date",
}) {
  // Generate years from 1900 to current year
  const years = Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => 1900 + i).reverse();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // State for year and month selection
  const [selectedYear, setSelectedYear] = React.useState(date ? date.getFullYear() : new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState(date ? date.getMonth() : new Date().getMonth());

  // Update calendar view when year or month changes
  const handleYearChange = (year) => {
    setSelectedYear(parseInt(year));
    const newDate = new Date(date || new Date());
    newDate.setFullYear(year);
    if (!date) setDate(newDate);
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(months.indexOf(month));
    const newDate = new Date(date || new Date());
    newDate.setMonth(months.indexOf(month));
    if (!date) setDate(newDate);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex gap-2 p-3">
            {/* Year Selector */}
            <Select
              value={selectedYear.toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Month Selector */}
            <Select
              value={months[selectedMonth]}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            month={new Date(selectedYear, selectedMonth)}
            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
} 