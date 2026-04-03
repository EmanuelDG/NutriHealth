import React from 'react';
import { cn } from '../lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { Separator } from './ui/separator';
import { Activity, Calendar, BarChart, AlertTriangle, ChevronRight, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Button } from "./ui/button";

// Basic card for showing a single metric
export const StatCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  trendValue, 
  className,
  ...props 
}) => {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center mt-4">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={cn(
              "text-xs font-medium",
              trend === 'up' ? "text-green-500" : "text-red-500"
            )}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Progress card for showing progress towards a goal
export const ProgressCard = ({ 
  title, 
  current, 
  target, 
  unit = '', 
  percentage,
  icon: Icon, 
  description, 
  className,
  ...props 
}) => {
  // Calculate percentage if not provided
  const progressPercentage = percentage || Math.round((current / target) * 100);
  
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold">
            {current}{unit} <span className="text-sm text-muted-foreground font-normal">/ {target}{unit}</span>
          </div>
          <Badge variant="outline" className="font-medium">
            {progressPercentage}%
          </Badge>
        </div>
        <Progress value={progressPercentage} />
        
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};


export const TimelineCard = ({ 
  title, 
  description, 
  events = [], 
  className,
  ...props 
}) => {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ol className="relative border-l border-muted">
          {events.map((event, index) => (
            <li key={index} className="mb-6 ml-4 last:mb-0">
              <div className="absolute w-3 h-3 bg-primary rounded-full -left-1.5 border border-background"></div>
              <time className="mb-1 text-xs font-normal text-muted-foreground">
                {event.date}
              </time>
              <h3 className="text-sm font-medium">{event.title}</h3>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};

// Health status card with colored indicator
export const HealthStatusCard = ({
  title,
  status,
  description,
  details = [],
  className,
  ...props
}) => {
  // Get color based on status
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'good':
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
      case 'at risk':
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
      case 'needs attention':
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Badge className={getStatusColor(status)}>
            {status}
          </Badge>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {details.length > 0 && (
          <div className="space-y-2">
            {details.map((detail, index) => (
              <div key={index} className="flex items-start">
                <ChevronRight className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{detail}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Alert card for warnings, information or success messages
export const AlertCard = ({ title, message, type = 'info', onClose }) => {
  const getIconByType = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getClassByType = () => {
    switch (type) {
      case 'error':
        return 'border-red-500 text-red-500';
      case 'success':
        return 'border-green-500 text-green-500';
      case 'warning':
        return 'border-yellow-500 text-yellow-500';
      case 'info':
      default:
        return 'border-blue-500 text-blue-500';
    }
  };

  return (
    <Alert className={`mb-4 ${getClassByType()}`}>
      {getIconByType()}
      <div className="flex w-full justify-between">
        <div>
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </div>
        {onClose && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 rounded-full" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
};

// Loading skeleton card
export const SkeletonCard = ({ className, ...props }) => {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
};

// Data table card for displaying structured data
export const DataTableCard = ({
  title,
  description,
  headers = [],
  rows = [],
  className,
  ...props
}) => {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="px-4 py-2 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-muted/30">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}; 
 
 