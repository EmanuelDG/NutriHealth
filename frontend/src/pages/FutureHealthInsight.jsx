import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { useToast } from '../components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { futureInsightApi } from '../services/api';

const FutureHealthInsight = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState(null);
  const [activeTab, setActiveTab] = useState('predictions');
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading insights...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);

  const loadingMessages = [
    'Analyzing your health data...',
    'Processing nutritional information...',
    'Generating future health predictions...',
    'Finalizing your personalized insights...'
  ];
  
  useEffect(() => {
    let isMounted = true;
    const fetchInsights = async () => {
      try {
        setLoading(true);
        setLoadingMessage('Loading insights...');
        setLoadingProgress(30);
        
        // First check if user profile is complete
        try {
          const profileResponse = await fetch('/api/users/profile');
          const profileData = await profileResponse.json();
          
          const hasCompleteProfile = profileData && 
                                    profileData.height && 
                                    profileData.weight && 
                                    profileData.age;
          
          if (!hasCompleteProfile) {
            if (isMounted) {
              setError('profile_incomplete');
              setLoading(false);
              return;
            }
          }
        } catch (profileError) {
          console.warn('Could not verify profile completeness:', profileError);
        }
        
        const response = await futureInsightApi.getInsights();
        
        if (isMounted && response && response.data) {
          setInsights(response.data);
          
          toast({
            title: 'Success',
            description: 'Health insights loaded successfully.',
            variant: 'default'
          });
        }
      } catch (err) {
        console.error('Error fetching insights:', err);
        
        if (isMounted) {
          if (err.response && err.response.status === 400) {
            setError('profile_incomplete');
          } else {
            setError(err.message || 'Failed to load health insights');
          }
          
          toast({
            title: 'Error',
            description: 'Failed to load health insights. Try generating new ones.',
            variant: 'destructive'
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setLoadingProgress(0);
        }
      }
    };
    
    fetchInsights();
    
    return () => {
      isMounted = false;
    };
  }, [toast]);

  useEffect(() => {
    let interval;
    if (loading) {
      let stage = 0;
      interval = setInterval(() => {
        stage = (stage + 1) % loadingMessages.length;
        setLoadingStage(stage);
        setLoadingMessage(loadingMessages[stage]);
        
        setLoadingProgress(prev => {
          const newProgress = Math.min(prev + 5, 95);
          return newProgress;
        });
      }, 5000);
    } else {
      setLoadingProgress(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const generateNewInsights = async () => {
    if (isFetching || requestInProgress) return;
    
    const now = Date.now();
    if (now - lastFetchTime < 5000) {
      console.log('Skipping duplicate request');
      return;
    }
    
    try {
      setIsFetching(true);
      setRequestInProgress(true);
      setLoading(true);
      setError(null);
      setLastFetchTime(now);
      setLoadingMessage(loadingMessages[0]);
      setLoadingProgress(10);
      
      const response = await futureInsightApi.generateInsights();
      
      if (response && response.data) {
        console.log('API Response:', response.data);
        setInsights(response.data);
        toast({
          title: 'Success',
          description: 'New health insights generated successfully.',
          variant: 'default'
        });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error generating insights:', err);
      setError(err.message || 'Failed to generate new insights');
      toast({
        title: 'Error',
        description: 'Failed to generate new insights. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setIsFetching(false);
      setRequestInProgress(false);
      setLoadingProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center w-full max-w-md px-6">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6" />
          <p className="text-xl font-medium mb-4">{loadingMessage}</p>
          <Progress value={loadingProgress} className="w-full mb-2" />
          <p className="text-sm text-muted-foreground">
            This may take up to 2 minutes. Please wait while we {loading === 'Loading saved insights...' ? 'load' : 'generate'} your personalized health insights...
          </p>
        </div>
      </div>
    );
  }
  
  if (error) {
    if (error === 'profile_incomplete') {
      return (
        <div className="p-8 max-w-4xl mx-auto">
          <Alert className="mb-6">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <AlertTitle className="text-lg font-semibold">Profile Information Needed</AlertTitle>
            <AlertDescription className="mt-2 text-base">
              <p className="mb-4">To generate personalized health insights, we need your health information first.</p>
              <p className="mb-4">Please complete your profile and log meals so we can provide accurate future health predictions tailored to you.</p>
            </AlertDescription>
          </Alert>
          <div className="flex gap-4 justify-center mt-4">
            <Button 
              onClick={() => window.location.href = '/profile?mode=edit'}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Complete Your Profile
            </Button>
            <Button 
              onClick={() => {
                setError(null);
                generateNewInsights();
              }} 
              variant="outline" 
              disabled={isFetching}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Anyway
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => {
            setError(null);
            generateNewInsights();
          }} 
          className="mt-4"
          variant="outline" 
          disabled={isFetching}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }
  
  if (!insights) {
    return (
      <div className="p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Insights Available</AlertTitle>
          <AlertDescription>
            Click the button below to generate your health insights.
          </AlertDescription>
        </Alert>
        <Button 
          onClick={generateNewInsights}
          className="mt-4"
          disabled={isFetching}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate Insights
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Future Health Insights</h1>
        <Button 
          onClick={generateNewInsights}
          disabled={isFetching}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate New Insights
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predictions">Health Predictions</TabsTrigger>
          <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Prevention</TabsTrigger>
        </TabsList>
        
        <TabsContent value="predictions" className="space-y-4">
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Data-Based Insights</AlertTitle>
            <AlertDescription>
              These predictions are based solely on your logged data and profile information. For more accurate insights, please ensure you regularly log your activities, meals, and health metrics.
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>Health Trajectory</CardTitle>
              <CardDescription>Projected health outcomes based on logged patterns</CardDescription>
            </CardHeader>
            <CardContent>
              {insights?.long_term_predictions?.length > 0 ? (
                <>
                  <div className="mb-6 p-4 border-2 border-muted bg-muted/50 rounded-lg">
                    <h3 className="font-semibold mb-2">Current Lifestyle Analysis</h3>
                    {insights.lifestyle_trajectory && (
                      <div className="space-y-2">
                        {insights.lifestyle_trajectory.weight_trend && (
                          <div className="text-sm">
                            <span className="font-medium">Weight Status: </span>
                            <span className="text-muted-foreground">{insights.lifestyle_trajectory.weight_trend}</span>
                          </div>
                        )}
                        {insights.lifestyle_trajectory.fitness_projection && (
                          <div className="text-sm">
                            <span className="font-medium">Activity Level: </span>
                            <span className="text-muted-foreground">{insights.lifestyle_trajectory.fitness_projection}</span>
                          </div>
                        )}
                        {insights.lifestyle_trajectory.nutrition_quality && (
                          <div className="text-sm">
                            <span className="font-medium">Nutrition Status: </span>
                            <span className="text-muted-foreground">{insights.lifestyle_trajectory.nutrition_quality}</span>
                          </div>
                        )}
                        {insights.lifestyle_trajectory.long_term_outlook && (
                          <div className="text-sm mt-3 p-2 bg-background rounded">
                            <span className="font-medium">Overall Assessment: </span>
                            <span className="text-muted-foreground">{insights.lifestyle_trajectory.long_term_outlook}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {insights.long_term_predictions.map((prediction, index) => (
                    <div key={index} className="mb-6 p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">{prediction.health_outcome}</h3>
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <span>Projected timeframe: {prediction.timeframe}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{prediction.description}</p>
                      <div className="mt-2 bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium mb-1">Based on Current Patterns:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {insights.lifestyle_trajectory.weight_trend && (
                            <li>Weight trends</li>
                          )}
                          {insights.lifestyle_trajectory.fitness_projection && (
                            <li>Activity levels</li>
                          )}
                          {insights.lifestyle_trajectory.nutrition_quality && (
                            <li>Nutritional intake</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No predictions available yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="risks" className="space-y-4">
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Data-Based Analysis</AlertTitle>
            <AlertDescription>
              This risk analysis is generated based on your logged health data and profile information. Regular and accurate logging of your activities, nutrition, and health metrics will improve the accuracy of these insights.
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>Health Risk Analysis</CardTitle>
              <CardDescription>Identified potential health considerations based on logged data</CardDescription>
            </CardHeader>
            <CardContent>
              {insights?.disease_prevention_insights?.length > 0 ? (
                insights.disease_prevention_insights.map((insight, index) => (
                  <div key={index} className="mb-4 p-4 border rounded-lg">
                    <p className="text-sm">{insight}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No risk analysis available yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recommendations" className="space-y-4">
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Data-Based Prevention Insights</AlertTitle>
            <AlertDescription>
              These prevention recommendations are generated based on your logged activities and health data. For personalized recommendations that better reflect your lifestyle, please ensure you consistently log your daily activities, nutrition, and health metrics.
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>Personalized Prevention Recommendations</CardTitle>
              <CardDescription>Suggested preventive steps based on your logged health data</CardDescription>
            </CardHeader>
            <CardContent>
              {insights?.actionable_recommendations?.length > 0 ? (
                insights.actionable_recommendations.map((recommendation, index) => (
                  <div key={index} className="mb-4 p-4 border rounded-lg">
                    <p className="text-sm">{recommendation}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recommendations available yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FutureHealthInsight; 