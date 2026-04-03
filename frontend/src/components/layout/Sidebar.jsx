import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  User,
  Home,
  Utensils,
  ActivitySquare,
  BarChart,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Calendar,
  PanelLeft,
  ClipboardList,
  Leaf,
  Award
} from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';

// group navigation items for collapsible sections
const navGroups = [
  {
    title: "Main",
    items: [
      {
        title: 'Dashboard',
        icon: Home,
        href: '/dashboard',
      },
    ]
  },
  {
    title: "Nutrition",
    items: [
      {
        title: 'Meal Log',
        icon: ClipboardList,
        href: '/meal-log',
      },
      {
        title: 'Diet Recommendations',
        icon: Utensils,
        href: '/diet-recommendations',
      }
    ]
  },
  {
    title: "Health",
    items: [
      {
        title: 'Health Dashboard',
        icon: ActivitySquare,
        href: '/health-page',
      },
      {
        title: 'Future Health Insights',
        icon: BarChart,
        href: '/future-health',
      },
    ]
  },
  {
    title: "Account",
    items: [
      {
        title: 'Edit Profile',
        icon: User,
        href: '/profile?mode=edit',
      },
    ]
  }
];

// app logo component with animation
const AppLogo = ({ isCollapsed }) => (
  <div className={cn(
    "flex items-center transition-all duration-300",
    isCollapsed ? "justify-center" : "justify-start"
  )}>
    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/20">
      <Leaf className="h-5 w-5 text-primary animate-pulse" />
    </div>
    {!isCollapsed && (
      <span className="ml-2 text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent transition-opacity duration-300">
        NutriHealth
      </span>
    )}
  </div>
);

const Sidebar = ({ userName = 'User', userEmail = 'user@example.com', userImage = null, onLogout }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState([]);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const storedCollapseState = localStorage.getItem('sidebarCollapsed');
    if (storedCollapseState !== null) {
      setIsCollapsed(JSON.parse(storedCollapseState));
    }

    // load group collapsed states
    const storedGroupState = localStorage.getItem('sidebarGroupState');
    if (storedGroupState !== null) {
      setExpandedGroups(JSON.parse(storedGroupState));
    } else {
      // initialize with all groups expanded
      const initialState = {};
      navGroups.forEach(group => {
        initialState[group.title] = false;
      });
      setExpandedGroups(initialState);
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const toggleMobileMenu = () => {
    setIsMobileNavOpen(!isMobileNavOpen);
  };

  const toggleGroup = (groupTitle) => {
    const newGroupState = { 
      ...expandedGroups, 
      [groupTitle]: !expandedGroups[groupTitle] 
    };
    setExpandedGroups(newGroupState);
    localStorage.setItem('sidebarGroupState', JSON.stringify(newGroupState));
  };

  // generate initials from user name
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // check if a route is active (either exact match or nested route)
  const isRouteActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Mobile Menu Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleMobileMenu}
          className="rounded-full bg-background shadow-md hover:bg-primary/10 hover:text-primary transition-colors"
        >
          {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileNavOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-all duration-300"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-card border-r shadow-md",
          isCollapsed ? "w-20" : "w-64",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between bg-gradient-to-r from-background to-muted/30">
          <AppLogo isCollapsed={isCollapsed} />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden lg:flex hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform duration-300",
              isCollapsed && "rotate-180"
            )} />
          </Button>
        </div>

        <Separator className="opacity-50" />

        {/* Navigation Links */}
        <div className="px-3 py-4 overflow-y-auto">
          <div className="space-y-4">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {!isCollapsed && (
                  <div 
                    className="flex items-center justify-between mx-1 px-2 py-1.5 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => toggleGroup(group.title)}
                  >
                    <span>{group.title}</span>
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      expandedGroups[group.title] && "rotate-90"
                    )} />
                  </div>
                )}
                
                <div className={cn(
                  "space-y-1 transition-all duration-300 overflow-hidden",
                  !isCollapsed && expandedGroups[group.title] && "max-h-0 opacity-0",
                  !isCollapsed && !expandedGroups[group.title] && "max-h-96 opacity-100",
                  isCollapsed && "max-h-full opacity-100"
                )}>
                  {group.items.map((item) => (
                    <TooltipProvider key={item.href} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.href}
                            className={cn(
                              "flex items-center p-3 rounded-md transition-all duration-150 relative group",
                              isRouteActive(item.href) 
                                ? "bg-primary/10 text-primary font-medium" 
                                : "hover:bg-muted/80 text-foreground/80 hover:text-foreground hover:translate-x-1",
                              isCollapsed && "justify-center"
                            )}
                          >
                            <item.icon className={cn(
                              "h-5 w-5 flex-shrink-0 transition-all duration-150",
                              isRouteActive(item.href) 
                                ? "text-primary" 
                                : "text-muted-foreground group-hover:text-foreground",
                              isCollapsed ? "mr-0" : "mr-3"
                            )} />
                            
                            {!isCollapsed && (
                              <span className="truncate">{item.title}</span>
                            )}
                            
                            {isRouteActive(item.href) && (
                              <span className="absolute inset-y-0 left-0 w-1 bg-primary rounded-full" />
                            )}
                          </Link>
                        </TooltipTrigger>
                        {isCollapsed && (
                          <TooltipContent side="right" className="font-medium">
                            {item.title}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-muted/30 to-transparent">
          <Separator className="my-4 opacity-50" />
          
          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className={cn(
                "flex items-center mb-4 cursor-pointer p-2 rounded-md hover:bg-muted/80 transition-colors",
                isCollapsed && "justify-center"
              )}>
                <Avatar className="h-10 w-10 mr-3 flex-shrink-0 ring-2 ring-primary/20 transition-all hover:ring-primary/40">
                  <AvatarImage src={userImage} />
                  <AvatarFallback className="bg-primary/10 text-primary">{getInitials(userName)}</AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate max-w-[120px]">{userName}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">{userEmail}</span>
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link to="/profile?mode=edit" state={{ returnTo: location.pathname }}>
                <DropdownMenuItem className="hover:bg-muted/80 cursor-pointer transition-colors">
                  <User className="mr-2 h-4 w-4" />
                  <span>Edit Profile</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-500 cursor-pointer hover:bg-red-50 transition-colors">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Logout Button for collapsed state */}
          {isCollapsed && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-center p-2 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                    onClick={onLogout}
                  >
                    <LogOut className="h-4 w-4 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Logout
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </aside>
      
      {/* Content Margin Compensation */}
      <div className={cn(
        "lg:ml-64 transition-all duration-300",
        isCollapsed && "lg:ml-20"
      )}>
        {/* Content will go here in the parent component */}
      </div>
    </>
  );
};

export default Sidebar; 
 
 