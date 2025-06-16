
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/context/AuthContext';
import { Truck, LayoutDashboard, ScanLine, FileText, Clock, Wrench, LogOut, Menu, UserCircle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['supervisor'] }, // Dashboard only for supervisor
  { href: '/inspection', label: 'Inspection', icon: ScanLine, roles: ['operator', 'supervisor'] },
  { href: '/report', label: 'Forklift Report', icon: FileText, roles: ['operator', 'supervisor'] },
  { href: '/downtime', label: 'Downtime Log', icon: Clock, roles: ['operator', 'supervisor'] },
  { href: '/data-management', label: 'Data Management', icon: Database, roles: ['supervisor'] },
  { href: '/tools', label: 'Tools', icon: Wrench, roles: ['operator', 'supervisor'] },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const visibleNavItems = allNavItems.filter(item => user && item.roles.includes(user.role));

  const logoLinkHref = user?.role === 'operator' ? '/inspection' : '/dashboard';

  const NavLink = ({ href, label, icon: Icon, onClick }: { href: string, label: string, icon: React.ElementType, onClick?: () => void }) => (
    <Link href={href} passHref>
      <Button
        variant={pathname === href ? 'secondary' : 'ghost'}
        className={cn(
          "w-full justify-start text-left",
          pathname === href && "bg-primary/10 text-primary hover:bg-primary/20"
        )}
        onClick={() => {
          if (onClick) onClick();
          setIsMobileMenuOpen(false);
        }}
      >
        <Icon className="mr-2 h-5 w-5" />
        {label}
      </Button>
    </Link>
  );

  const UserProfile = () => (
    <div className="flex items-center space-x-3 p-4 border-t border-border">
      <UserCircle className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="font-medium text-sm">{user?.username}</p>
        <p className="text-xs text-muted-foreground">{user?.role}</p>
      </div>
    </div>
  );

  const renderNavLinks = (isMobile = false) => (
    <nav className={cn("flex flex-col gap-1 p-2", isMobile ? "mt-4" : "md:flex-row md:items-center md:gap-2 lg:gap-3")}>
      {visibleNavItems.map((item) => (
        isMobile ? (
          <NavLink key={item.href} {...item} />
        ) : (
          <Link key={item.href} href={item.href} passHref>
            <Button
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              className={cn(
                "text-sm font-medium",
                pathname === item.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="mr-1 h-4 w-4 md:hidden lg:inline-block" />
              {item.label}
            </Button>
          </Link>
        )
      ))}
    </nav>
  );

  if (!isClient) {
    return ( 
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Truck className="h-7 w-7 text-primary" />
            <span className="ml-2 font-headline text-xl font-semibold">ForkLift Check</span>
          </div>
          <div className="h-8 w-8 bg-muted rounded-md animate-pulse md:hidden"></div>
          <div className="hidden md:flex items-center space-x-2">
            {/* Simplified skeleton for nav items */}
            {[...Array(5)].map((_, i) => <div key={i} className="h-8 w-24 bg-muted rounded-md animate-pulse"></div>)}
            <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href={logoLinkHref} className="flex items-center">
          <Truck className="h-7 w-7 text-primary" />
          <span className="ml-2 font-headline text-xl font-semibold">ForkLift Check</span>
        </Link>

        <div className="hidden md:flex items-center">
          {renderNavLinks(false)}
          <Button variant="ghost" size="icon" onClick={logout} className="ml-2 text-muted-foreground hover:text-destructive">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Log out</span>
          </Button>
        </div>
        

        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-border text-left">
                <SheetTitle>
                  <Link href={logoLinkHref} className="flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
                    <Truck className="h-7 w-7 text-primary" />
                    <span className="ml-2 font-headline text-xl font-semibold">ForkLift Check</span>
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <div className="flex-grow overflow-y-auto">
                {renderNavLinks(true)}
              </div>
              <UserProfile />
              <div className="p-2 border-t border-border">
                <Button variant="ghost" onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="w-full justify-start text-destructive hover:bg-destructive/10">
                  <LogOut className="mr-2 h-5 w-5" />
                  Log out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
