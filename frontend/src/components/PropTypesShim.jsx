// This file re-exports all UI components with proper path resolution
// It serves as a compatibility layer to avoid path issues

// card components
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

// form and input components
export { Button } from './ui/button';
export { Input } from './ui/input';
export { Label } from './ui/label';
export { Textarea } from './ui/textarea';
export { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from './ui/form';

// layout components
export { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
export { Separator } from './ui/separator';
export { ScrollArea } from './ui/scroll-area';

// feedback components 
export { Progress } from './ui/progress';
export { Alert, AlertDescription, AlertTitle } from './ui/alert';
export { Badge } from './ui/badge';
export { Toast, ToastProvider, ToastViewport } from './ui/toast';

// Dialog components
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
export { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

// Data display
export { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
export { Calendar } from './ui/calendar';

// Misc
export { Switch } from './ui/switch';
export { Checkbox } from './ui/checkbox'; 