// @ts-nocheck
"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from "@/components/ui/context-menu";
import { useRouter } from "next/navigation";
import {
  UserPlus, FolderKanban, Receipt, Clock, FileText,
  TicketPlus, BarChart3, Users, Calendar, Settings
} from "lucide-react";

interface CommandDeckProps {
  children: React.ReactNode;
  className?: string;
}

export default function CommandDeck({ children, className }: CommandDeckProps) {
  const router = useRouter();

  return (
    <ContextMenu>
      <ContextMenuTrigger className={className} asChild>
        <div>{children}</div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-64">
        {/* Quick Create */}
        <div className="border-b border-border mb-1 pb-1">
          <ContextMenuItem onClick={() => router.push('/crm')}>
            <UserPlus className="mr-2 h-4 w-4 text-primary" /> Nuovo Cliente
            <ContextMenuShortcut>⌘N</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => router.push('/projects')}>
            <FolderKanban className="mr-2 h-4 w-4 text-accent" /> Nuovo Progetto
          </ContextMenuItem>
          <ContextMenuItem onClick={() => router.push('/erp/quotes/new')}>
            <FileText className="mr-2 h-4 w-4 text-[var(--color-warning)]" /> Nuovo Preventivo
          </ContextMenuItem>
          <ContextMenuItem onClick={() => router.push('/support')}>
            <TicketPlus className="mr-2 h-4 w-4 text-destructive" /> Nuovo Ticket
          </ContextMenuItem>
        </div>

        {/* Navigation */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <BarChart3 className="mr-2 h-4 w-4 text-muted-foreground" /> ERP
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-52">
            <ContextMenuItem onClick={() => router.push('/erp/invoices')}>Fatture</ContextMenuItem>
            <ContextMenuItem onClick={() => router.push('/erp/quotes')}>Preventivi</ContextMenuItem>
            <ContextMenuItem onClick={() => router.push('/erp/expenses')}>Spese</ContextMenuItem>
            <ContextMenuItem onClick={() => router.push('/erp/reports')}>Report</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Users className="mr-2 h-4 w-4 text-muted-foreground" /> Team
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onClick={() => router.push('/team')}>Membri</ContextMenuItem>
            <ContextMenuItem onClick={() => router.push('/tasks')}>Task</ContextMenuItem>
            <ContextMenuItem onClick={() => router.push('/time')}>Ore</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Quick Access */}
        <div className="border-t border-border mt-1 pt-1">
          <ContextMenuItem onClick={() => router.push('/calendar')}>
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" /> Calendario
          </ContextMenuItem>
          <ContextMenuItem onClick={() => router.push('/time')}>
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" /> Registra Ore
          </ContextMenuItem>
          <ContextMenuItem onClick={() => router.push('/settings')}>
            <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Impostazioni
          </ContextMenuItem>
        </div>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export { CommandDeck };
