import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Utensils } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

const LogMealPopup = ({ isOpen, onClose, success, mealName }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Auto-close after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
      <Card className={`max-w-md w-full shadow-lg transform transition-all duration-300 ${success ? 'bg-green-50' : 'bg-red-50'}`}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`p-3 rounded-full ${success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {success ? (
                <Check className="h-8 w-8" />
              ) : (
                <AlertCircle className="h-8 w-8" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                {success ? "Meal Logged Successfully" : "Failed to Log Meal"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {success 
                  ? `"${mealName}" has been added to your food diary.` 
                  : "There was an error logging your meal. Please try again."}
              </p>
            </div>
            
            {success && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Utensils className="mr-1 h-4 w-4" />
                <span>You're making progress toward your nutrition goals!</span>
              </div>
            )}
            
            <Button 
              onClick={() => {
                setIsVisible(false);
                onClose();
              }} 
              variant={success ? "outline" : "default"}
              className="mt-2"
            >
              {success ? "Continue" : "Close"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogMealPopup; 