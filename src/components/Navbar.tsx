import { Link } from 'react-router-dom';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { GraduationCap, LayoutDashboard, Settings } from 'lucide-react';

export function Navbar() {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 min-w-screen">
        <NavigationMenu>
          <NavigationMenuList>
          <NavigationMenuItem>
              <Link to="/random-seat-planning">
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Random seat planning
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/">
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/seating">
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Seating Planner
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/settings">
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}