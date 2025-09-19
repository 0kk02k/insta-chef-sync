import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddManualItemDialogProps {
  onItemAdd: (item: {
    ingredient_name: string;
    amount: number | null;
    unit: string | null;
  }) => Promise<void>;
}

const AddManualItemDialog = ({ onItemAdd }: AddManualItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [ingredient_name, setIngredientName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ingredient_name.trim()) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie einen Zutatennamen ein.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onItemAdd({
        ingredient_name: ingredient_name.trim(),
        amount: amount ? parseFloat(amount) : null,
        unit: unit.trim() || null,
      });

      toast({
        title: 'Erfolg',
        description: 'Zutat wurde zur Liste hinzugefügt.',
      });

      // Reset form
      setIngredientName('');
      setAmount('');
      setUnit('');
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Fehler beim Hinzufügen der Zutat.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-orange-warm to-pink-vibrant hover:from-orange-warm/90 hover:to-pink-vibrant/90"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zutat hinzufügen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ingredient">Zutat *</Label>
            <Input
              id="ingredient"
              placeholder="z.B. Tomaten, Milch, Olivenöl..."
              value={ingredient_name}
              onChange={(e) => setIngredientName(e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Menge</Label>
              <Input
                id="amount"
                type="number"
                step="0.1"
                placeholder="z.B. 2"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Einheit</Label>
              <Input
                id="unit"
                placeholder="z.B. kg, L, Stück"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Hinzufügen...' : 'Hinzufügen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddManualItemDialog;