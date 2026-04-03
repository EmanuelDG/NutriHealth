import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';


const HealthDisclaimer = ({ 
  variant = 'alert', 
  requireConsent = false,
  onConsent = () => {},
  className = ''
}) => {
  const [disclaimer, setDisclaimer] = useState('Loading health disclaimer...');
  const [hasConsented, setHasConsented] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  // fetch the disclaimer from the API  
  useEffect(() => {
    const fetchDisclaimer = async () => {
      try {
        const response = await api.get('/privacy/disclaimer');
        setDisclaimer(response.data.disclaimer);
      } catch (error) {
        console.error('Failed to fetch health disclaimer:', error);
        setDisclaimer(
          'The health information and recommendations provided by this application are for informational purposes only and are not intended to be a substitute for professional medical advice, diagnosis, or treatment.'
        );
      }
    };

    // Check if user has previously consented
    const checkConsent = () => {
      const storedConsent = localStorage.getItem('health_disclaimer_consent');
      if (storedConsent === 'true') {
        setHasConsented(true);
        if (!requireConsent) {
          setShowDisclaimer(false);
        }
      }
    };

    fetchDisclaimer();
    checkConsent();
  }, [requireConsent]);

  // Handle consent action
  const handleConsent = async (consented) => {
    // Record consent in localStorage
    localStorage.setItem('health_disclaimer_consent', consented);
    setHasConsented(consented);
    
    // Hide the disclaimer if consented or not required
    if (consented || !requireConsent) {
      setShowDisclaimer(false);
    }
    
    // Try to record consent on the server
    try {
      await api.post('/privacy/consent', {
        consent_type: 'health_disclaimer',
        consented: consented
      });
    } catch (error) {
      console.error('Failed to record consent:', error);
    }
    
    // Call the callback with the consent status
    onConsent(consented);
  };

  // Dismiss the disclaimer
  const dismissDisclaimer = () => {
    setShowDisclaimer(false);
  };


  if (!showDisclaimer && !requireConsent) {
    return null;
  }
  

  if (hasConsented && !requireConsent) {
    return null;
  }

  // Different rendering options based on variant
  if (variant === 'alert') {
    return (
      <Alert variant="destructive" className={`my-4 ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Health Information Disclaimer</AlertTitle>
        <AlertDescription className="mt-2">
          {disclaimer}
          {!hasConsented && (
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => handleConsent(true)}>
                I Understand
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (variant === 'card') {
    return (
      <Card className={`my-4 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
            Health Information Disclaimer
          </CardTitle>
          <CardDescription>
            Important information about using this application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-line text-sm">{disclaimer}</div>
          
          {requireConsent && !hasConsented && (
            <>
              <Separator className="my-4" />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => handleConsent(false)}>
                  Decline
                </Button>
                <Button onClick={() => handleConsent(true)}>
                  I Accept
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Minimal version
  return (
    <div className={`text-xs text-muted-foreground my-2 ${className}`}>
      <strong>Disclaimer:</strong> {disclaimer.split('\n\n')[0]}
      {!hasConsented && (
        <Button 
          variant="link" 
          size="sm" 
          className="p-0 h-auto text-xs"
          onClick={() => handleConsent(true)}
        >
          I Understand
        </Button>
      )}
    </div>
  );
};

export default HealthDisclaimer; 