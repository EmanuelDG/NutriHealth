import * as React from "react"
import {
  ActivitySquare,
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Utensils,
  Calendar,
  BarChart
} from "lucide-react"

import { NavMain } from "src/components/nav-main"
import { NavProjects } from "src/components/nav-projects"
import { NavUser } from "src/components/nav-user"
import { TeamSwitcher } from "src/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "./ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Health Status",
      url: "#",
      icon: ActivitySquare,
      items: [
        {
          title: "Overview",
          url: "#",
        },
        {
          title: "BMI Trends",
          url: "#",
        },
        {
          title: "Nutrition",
          url: "#",
        },
        {
          title: "Exercise Logs",
          url: "#",
        },
      ],
    },
    {
      title: "Diet Recommendations",
      url: "#",
      icon: Utensils,
      items: [
        {
          title: "Meal Suggestions",
          url: "#",
        },
        {
          title: "Meal Planning",
          url: "#",
        },
        {
          title: "Favorites",
          url: "#",
        },
        {
          title: "Nutrition Analysis",
          url: "#",
        },
      ],
    },
    {
      title: "Future Health Insights",
      url: "#",
      icon: BarChart,
      items: [
        {
          title: "Health Trajectory",
          url: "#",
        },
        {
          title: "Risk Factors",
          url: "#",
        },
        {
          title: "Prevention",
          url: "#",
        },
        {
          title: "Action Plan",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({
  ...props
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
