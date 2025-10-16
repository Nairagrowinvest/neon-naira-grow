import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsPopover } from "./NotificationsPopover";

export function TopNavbar() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      return data;
    },
  });

  const getInitials = () => {
    if (!profile?.full_name) return "U";
    return profile.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 border-b border-glow-purple/30 flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <SidebarTrigger className="lg:hidden" />
      
      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <NotificationsPopover />

        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/30 border border-glow-purple/20">
          <Avatar className="h-8 w-8 border-2 border-primary glow-purple">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
