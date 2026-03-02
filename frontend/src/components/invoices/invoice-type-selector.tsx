"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InvoiceTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceTypeSelector({ open, onOpenChange }: InvoiceTypeSelectorProps) {
  const router = useRouter();

  const handleSelect = (type: "sales" | "purchase") => {
    router.push(`/invoices/create?type=${type}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Select the type of invoice you want to create
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button
            variant="default"
            onClick={() => handleSelect("sales")}
            className="w-full"
          >
            Sales Invoice
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSelect("purchase")}
            className="w-full"
          >
            Purchase Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}