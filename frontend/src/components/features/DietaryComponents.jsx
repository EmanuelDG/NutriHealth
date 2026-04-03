import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { cn } from '../lib/utils';
import { StatCard, ProgressCard } from './DataCards';
import { 
  Apple, 
  Beef, 
  Carrot, 
  Fish, 
  Egg, 
  Milk, 
  Wheat, 
  AlertTriangle,
  Utensils,
  ActivitySquare,
  Droplets,
  Scale,
  Heart,
  Brain
} from 'lucide-react';

// Nutrient progress display
export const NutrientProgress = ({
  nutrient,
  current,
  target,
  unit = 'g',
  className,
  ...props
}) => {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  const status = percentage >= 100 ? 'complete' : percentage >= 70 ? 'good' : 'low';

  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{nutrient}</span>
        <span className="text-sm text-muted-foreground">
          {current}{unit} / {target}{unit}
        </span>
      </div>
      <Progress value={percentage} className={cn(
        status === 'complete' ? "text-green-600" : 
        status === 'good' ? "text-amber-500" : 
        "text-red-500"
      )} />
    </div>
  );
};

// Component to display daily nutrient intake summaries
export const DailyNutrientSummary = ({
  nutrients = [],
  className,
  ...props
}) => {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader>
        <CardTitle>Daily Nutrient Intake</CardTitle>
        <CardDescription>Your progress toward daily recommended values</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {nutrients.map((nutrient, index) => (
          <React.Fragment key={index}>
            <NutrientProgress 
              nutrient={nutrient.name}
              current={nutrient.current}
              target={nutrient.target}
              unit={nutrient.unit}
            />
            {index < nutrients.length - 1 && <Separator className="my-2" />}
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
};

// Food group breakdown
export const FoodGroupBreakdown = ({
  foodGroups = [],
  className,
  ...props
}) => {
  // Map food groups to icons
  const getIcon = (group) => {
    const groupLower = group.toLowerCase();
    if (groupLower.includes('fruit')) return Apple;
    if (groupLower.includes('vegetable')) return Carrot;
    if (groupLower.includes('protein') || groupLower.includes('meat')) return Beef;
    if (groupLower.includes('fish') || groupLower.includes('seafood')) return Fish;
    if (groupLower.includes('dairy') || groupLower.includes('milk')) return Milk;
    if (groupLower.includes('grain') || groupLower.includes('cereal')) return Wheat;
    if (groupLower.includes('egg')) return Egg;
    return Utensils;
  };

  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader>
        <CardTitle>Food Group Balance</CardTitle>
        <CardDescription>Distribution of your food intake by group</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {foodGroups.map((group, index) => {
          const Icon = getIcon(group.name);
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm font-medium">{group.name}</span>
                </div>
                <Badge variant="outline">
                  {group.percentage}%
                </Badge>
              </div>
              <Progress value={group.percentage} className={
                group.percentage >= group.recommended.min && 
                group.percentage <= group.recommended.max 
                  ? "text-green-600" 
                  : "text-amber-500"
              } />
              <p className="text-xs text-muted-foreground">
                Recommended: {group.recommended.min}%-{group.recommended.max}%
              </p>
              {index < foodGroups.length - 1 && <Separator className="my-2" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

// Allergy and dietary restriction badge
export const DietaryTag = ({
  restriction,
  type = 'allergy', 
  severity = 'high',
  className,
  ...props
}) => {
  const getTagStyles = () => {
    if (type === 'allergy') {
      return severity === 'high' 
        ? 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' 
        : severity === 'medium'
          ? 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
          : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    }
    
    if (type === 'medical') {
      return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
    }
    
    if (type === 'religious') {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200';
    }
    
    return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
  };

  return (
    <Badge 
      className={cn(
        getTagStyles(),
        className
      )}
      variant="outline"
      {...props}
    >
      {type === 'allergy' && severity === 'high' && (
        <AlertTriangle className="h-3 w-3 mr-1" />
      )}
      {restriction}
    </Badge>
  );
};

// Meal card component
export const MealCard = ({
  meal,
  foods = [],
  totalCalories,
  totalProtein,
  totalCarbs,
  totalFat,
  image,
  className,
  ...props
}) => {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader>
        <CardTitle>{meal}</CardTitle>
        <CardDescription>
          {totalCalories} calories | {totalProtein}g protein | {totalCarbs}g carbs | {totalFat}g fat
        </CardDescription>
      </CardHeader>
      <CardContent>
        {image && (
          <div className="w-full h-32 rounded-md mb-4 overflow-hidden">
            <img 
              src={image} 
              alt={meal} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <ul className="space-y-2">
          {foods.map((food, index) => (
            <li key={index} className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium">{food.name}</span>
                {food.allergies && food.allergies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {food.allergies.map((allergy, aIndex) => (
                      <DietaryTag 
                        key={aIndex} 
                        restriction={allergy.name} 
                        type="allergy"
                        severity={allergy.severity}
                        className="text-xs py-0"
                      />
                    ))}
                  </div>
                )}
              </div>
              <span className="text-sm text-muted-foreground">{food.calories} cal</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

// Health metrics cards
export const CalorieCard = ({ current, target, className, ...props }) => {
  return (
    <ProgressCard
      title="Daily Calories"
      current={current}
      target={target}
      unit="cal"
      icon={ActivitySquare}
      description="Your calorie intake for today"
      className={className}
      {...props}
    />
  );
};

export const WaterIntakeCard = ({ current, target, className, ...props }) => {
  return (
    <ProgressCard
      title="Water Intake"
      current={current}
      target={target}
      unit="mL"
      icon={Droplets}
      description="Your hydration level for today"
      className={className}
      {...props}
    />
  );
};

export const BMICard = ({ value, category, className, ...props }) => {
  return (
    <StatCard
      title="BMI"
      value={value}
      description={`Category: ${category}`}
      icon={Scale}
      className={className}
      {...props}
    />
  );
};

// Disease risk assessment card
export const DiseaseRiskCard = ({
  conditions = [],
  className,
  ...props
}) => {
  // Get icon based on condition type
  const getConditionIcon = (condition) => {
    const typeLower = condition.toLowerCase();
    if (typeLower.includes('heart') || typeLower.includes('cardio')) return Heart;
    if (typeLower.includes('brain') || typeLower.includes('neuro')) return Brain;
    return AlertTriangle;
  };

  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader>
        <CardTitle>Health Risk Assessment</CardTitle>
        <CardDescription>Based on your diet and health profile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {conditions.map((condition, index) => {
          const Icon = getConditionIcon(condition.type);
          const riskColor = 
            condition.risk === 'high' ? 'text-red-500' :
            condition.risk === 'moderate' ? 'text-amber-500' :
            'text-green-500';
            
          return (
            <div key={index} className="flex items-start space-x-3">
              <Icon className={cn("h-5 w-5 mt-0.5", riskColor)} />
              <div>
                <h4 className="text-sm font-medium flex items-center">
                  {condition.name}
                  <Badge className={cn(
                    "ml-2 text-xs",
                    condition.risk === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                    condition.risk === 'moderate' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-green-100 text-green-800 border-green-200'
                  )} variant="outline">
                    {condition.risk} risk
                  </Badge>
                </h4>
                <p className="text-xs text-muted-foreground mt-1">{condition.recommendation}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}; 