'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PERMISSION_LABELS, type Permission } from '@/lib/permission-defs';

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

interface CreateRoleFormProps {
  onCreated: () => void;
}

export function CreateRoleForm({ onCreated }: CreateRoleFormProps) {
  const t = useTranslations('dash');
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Permission[]>([]);
  const [creating, setCreating] = useState(false);

  const togglePermission = (permission: Permission) => {
    setSelected((prev) => prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]);
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) {
      toast({ title: t('incomplete'), description: t('incompleteMsg'), variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), permissions: selected }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('roleCreated'), description: t('roleCreatedMsg', { name: name.trim() }) });
        setName('');
        setDescription('');
        setSelected([]);
        onCreated();
      } else {
        toast({ title: t('error'), description: data.error || t('createFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: t('error'), description: t('createFailed'), variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 border border-border rounded-lg space-y-4">
      <div>
        <p className="font-medium text-sm mb-1">{t('createRole')}</p>
        <p className="text-xs text-muted-foreground">{t('createRoleDesc')}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role-name">{t('roleName')}</Label>
        <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('roleNamePlaceholder')} maxLength={50} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role-description">{t('descriptionOptional')}</Label>
        <Input id="role-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('descriptionPlaceholder')} maxLength={200} />
      </div>
      <div className="grid gap-2">
        <Label>{t('permissions')}</Label>
        <div className="grid sm:grid-cols-2 gap-2">
          {ALL_PERMISSIONS.map((permission) => (
            <label key={permission} className={`flex items-start gap-2 p-2.5 rounded-md border cursor-pointer transition-colors ${selected.includes(permission) ? 'border-coral/50 bg-coral/5' : 'border-border hover:bg-muted/50'}`}>
              <input type="checkbox" checked={selected.includes(permission)} onChange={() => togglePermission(permission)} className="mt-0.5 h-4 w-4 accent-coral" aria-label={PERMISSION_LABELS[permission].label} />
              <div>
                <p className="text-sm font-medium leading-tight">{PERMISSION_LABELS[permission].label}</p>
                <p className="text-xs text-muted-foreground">{PERMISSION_LABELS[permission].description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={creating} onClick={handleCreate}>
          {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          {t('createRoleBtn')}
        </Button>
      </div>
    </div>
  );
}
