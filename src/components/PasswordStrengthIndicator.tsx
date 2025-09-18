import React from 'react';
import { Progress } from '@/components/ui/progress';
import { validatePassword, getPasswordStrengthText, getPasswordStrengthColor } from '@/utils/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export const PasswordStrengthIndicator = ({ password, className = '' }: PasswordStrengthIndicatorProps) => {
  const { score, feedback } = validatePassword(password);
  
  if (!password) return null;

  const strengthText = getPasswordStrengthText(score);
  const colorClass = getPasswordStrengthColor(score);
  const progressValue = (score / 4) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Passwortstärke:</span>
        <span className={`text-sm font-medium ${colorClass}`}>{strengthText}</span>
      </div>
      <Progress value={progressValue} className="h-2" />
      {feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {feedback.map((item, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="text-orange-500">•</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};