import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  glowColor?: "purple" | "cyan" | "pink";
}

export function StatsCard({ title, value, icon: Icon, trend, glowColor = "purple" }: StatsCardProps) {
  const glowClass = glowColor === "cyan" ? "glow-cyan" : glowColor === "pink" ? "glow-pink" : "glow-purple";
  const borderGlowClass = glowColor === "cyan" ? "border-glow-cyan" : glowColor === "pink" ? "border-glow-pink" : "border-glow-purple";

  return (
    <Card className={`gradient-card border ${borderGlowClass} ${glowClass} transition-all hover:scale-105`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {value}
        </div>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}
