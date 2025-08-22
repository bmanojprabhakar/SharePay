'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'firebase/auth';
import { cn } from '@sharepay/shared';

interface BaseUser {
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  name?: string | null;
}

interface UserAvatarProps {
  user: (User | BaseUser) | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fallbackClassName?: string;
}

// Generate a consistent color based on email
function getAvatarColor(email: string): string {
  const colors = [
    'bg-red-500',
    'bg-blue-500', 
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-lime-500',
    'bg-amber-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name, display name, or email
function getInitials(user: User | BaseUser): string {
  // First try the name field
  if ((user as BaseUser).name) {
    return (user as BaseUser).name!
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  
  // Then try displayName
  if (user.displayName) {
    return user.displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  
  // Finally fallback to email
  if (user.email) {
    const emailParts = user.email.split('@')[0];
    if (emailParts.includes('.')) {
      return emailParts
        .split('.')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return emailParts.slice(0, 2).toUpperCase();
  }
  
  return 'U';
}

export function UserAvatar({ user, size = 'md', className, fallbackClassName }: UserAvatarProps) {
  if (!user) {
    return (
      <Avatar className={cn(
        size === 'sm' && 'h-8 w-8',
        size === 'md' && 'h-10 w-10', 
        size === 'lg' && 'h-12 w-12',
        className
      )}>
        <AvatarFallback className={cn('bg-gray-500 text-white', fallbackClassName)}>
          ?
        </AvatarFallback>
      </Avatar>
    );
  }

  const initials = getInitials(user);
  const colorClass = user.email ? getAvatarColor(user.email) : 'bg-gray-500';
  
  // For Google users, ensure we have the high-quality photo URL
  let photoURL = user.photoURL;
  if (photoURL && photoURL.includes('googleusercontent.com')) {
    // Remove size restrictions for better quality
    photoURL = photoURL.replace(/=s\d+-c/, '=s400-c');
    // Also handle other common size patterns
    photoURL = photoURL.replace(/=s\d+/, '=s400');
  }

  return (
    <div className={cn(
      'relative overflow-hidden rounded-full',
      size === 'sm' && 'h-8 w-8',
      size === 'md' && 'h-10 w-10',
      size === 'lg' && 'h-12 w-12',
      className
    )}>
      {photoURL ? (
        <img
          src={photoURL}
          alt={user.displayName || user.email || 'User avatar'}
          className="h-full w-full object-cover"
          onLoad={(e) => {
            e.currentTarget.style.display = 'block';
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            // Show fallback
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      ) : null}
      <div 
        className={cn(
          'absolute inset-0 flex items-center justify-center text-white font-semibold',
          colorClass,
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base',
          photoURL ? 'hidden' : 'flex',
          fallbackClassName
        )}
      >
        {initials}
      </div>
    </div>
  );
}

// Additional utility for getting user display name
export function getUserDisplayName(user: User | BaseUser): string {
  // First try the name field
  if ((user as BaseUser).name) {
    return (user as BaseUser).name!;
  }
  // Then try displayName
  if (user.displayName) {
    return user.displayName;
  }
  // Finally fallback to email
  if (user.email) {
    return user.email.split('@')[0];
  }
  return 'User';
}