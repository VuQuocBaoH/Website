import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatTime12Hour = (time24: string): string => {
  if (!time24 || typeof time24 !== 'string') {
    return '';
  }

  const [hourString, minuteString] = time24.split(':');
  if (!hourString || !minuteString) {
    return ''; 
  }

  let hour = parseInt(hourString, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';

  hour = hour % 12;
  if (hour === 0) { 
    hour = 12;
  }

  return `${hour}:${minuteString} ${ampm}`;
};
