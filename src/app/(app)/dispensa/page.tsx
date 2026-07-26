import { getDb } from '@/server/db';
import { expiryStatus, listPantry } from '@/server/services/pantry';
import { PantryClient } from './pantry-client';

export default function PantryPage() {
  const db = getDb();
  const today = new Date().toLocaleDateString('en-CA');
  const items = listPantry(db).map((p) => ({
    id: p.id,
    name: p.name,
    quantity: p.quantity,
    unit: p.unit,
    expiresOn: p.expiresOn,
    status: expiryStatus(p.expiresOn, today),
  }));

  return <PantryClient items={items} />;
}
