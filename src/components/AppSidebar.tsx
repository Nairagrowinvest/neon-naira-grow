import { Home, TrendingUp, ArrowRightLeft, Users, Settings, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "My Investments", url: "/dashboard/investments", icon: TrendingUp },
  { title: "Transactions", url: "/dashboard/transactions", icon: ArrowRightLeft },
  { title: "Referrals", url: "/dashboard/referrals", icon: Users },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to logout");
    } else {
      toast.success("Logged out successfully");
      navigate("/auth");
    }
  };

  return (
    <Sidebar className="border-r border-glow-purple">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-purple">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              NairaGrow
            </h1>
            <p className="text-xs text-muted-foreground">Grow your wealth</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground px-6">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-6 py-3 transition-all ${
                          isActive
                            ? "border-l-2 border-primary bg-muted/50 text-primary glow-purple"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6">
        <Button
          variant="outline"
          className="w-full border-glow-purple hover:bg-destructive/20"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
