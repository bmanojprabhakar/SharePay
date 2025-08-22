
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from './ui/label';

interface Group {
    id: string;
    name: string;
}

interface SelectGroupDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  groups: Group[];
}

export function SelectGroupDialog({ isOpen, setIsOpen, groups }: SelectGroupDialogProps) {
  const router = useRouter();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const handleNavigate = () => {
    if (selectedGroupId) {
      router.push(`/groups/${selectedGroupId}`);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select a Group</DialogTitle>
          <DialogDescription>
            Choose the group you want to add an expense to.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            <Label htmlFor="group-select">Group</Label>
             <Select onValueChange={setSelectedGroupId} value={selectedGroupId}>
                <SelectTrigger id="group-select">
                    <SelectValue placeholder="Select a group..." />
                </SelectTrigger>
                <SelectContent>
                {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                    {group.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleNavigate} disabled={!selectedGroupId}>
            Go to Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
