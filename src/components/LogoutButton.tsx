"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";

export function LogoutButton({ isMobile }: { isMobile?: boolean }) {
  if (isMobile) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => signOut({ callbackUrl: "/login" })} 
        className="text-slate-600 hover:text-red-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-colors h-11"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
      Logout
    </Button>
  );
}
