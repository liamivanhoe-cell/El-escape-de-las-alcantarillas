import React from 'react';
import { Character } from '../types';

interface CharacterIconProps {
  character: Character;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const CharacterIcon: React.FC<CharacterIconProps> = ({ character, size = 'md', className = '' }) => {
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-12 h-12 text-xs',
    lg: 'w-20 h-20 text-sm',
    xl: 'w-32 h-32 text-lg'
  };

  const baseStyle = "flex items-center justify-center font-bold shadow-lg transform transition-transform hover:scale-105";
  
  // Coin shape (circle) vs Bill shape (rectangle)
  const shapeClass = character.type === 'coin' 
    ? `rounded-full ${character.borderColor ? `border-4 ${character.borderColor}` : ''}` 
    : 'rounded-sm aspect-[2/1] border border-green-800'; // Bill aspect ratio

  // Special handling for Bills to make them look rectangular even with fixed width/height containers
  // We'll use a container for Bills if needed, but for now simple aspect ratio tweak in CSS
  const displayStyle = character.type === 'bill' 
    ? { width: sizeClasses[size].split(' ')[0], height: 'auto', aspectRatio: '2/1' }
    : {};

  return (
    <div 
      className={`${baseStyle} ${shapeClass} ${character.color} ${character.textColor} ${sizeClasses[size]} ${className}`}
      style={character.type === 'bill' ? { aspectRatio: '2.5/1' } : {}}
    >
      {character.type === 'coin' ? (
        <div className="flex flex-col items-center leading-none">
            <span>{character.name.split(' ')[0]}</span>
            <span className="text-[0.6em]">{character.name.split(' ')[1]?.substring(0,3)}</span>
        </div>
      ) : (
         <span>{character.value}</span>
      )}
    </div>
  );
};
