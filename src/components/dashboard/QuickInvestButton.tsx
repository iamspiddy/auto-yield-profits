import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickInvestButtonProps {
  variant?: 'default' | 'mobile' | 'compact';
  className?: string;
}

const QuickInvestButton: React.FC<QuickInvestButtonProps> = ({ 
  variant = 'default', 
  className = '' 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/investments');
  };

  if (variant === 'mobile') {
    return (
      <Button 
        onClick={handleClick}
        className={`w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 text-lg font-semibold shadow-lg rounded-xl ${className}`}
      >
        <Sparkles className="h-5 w-5 mr-2" />
        Start Investing
      </Button>
    );
  }

  if (variant === 'compact') {
    return (
      <Button 
        onClick={handleClick}
        className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-lg rounded-lg ${className}`}
      >
        <ArrowUpRight className="h-4 w-4 mr-1" />
        Quick Invest
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleClick}
      className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 text-lg font-semibold shadow-lg rounded-xl ${className}`}
    >
      <TrendingUp className="h-5 w-5 mr-2" />
      Quick Invest
    </Button>
  );
};

export default QuickInvestButton;
