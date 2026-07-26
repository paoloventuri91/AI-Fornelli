import { getDb } from '@/server/db';
import { getSettings } from '@/server/services/settings';
import { weekStartFor } from '@/server/services/planning';
import { listShopping } from '@/server/services/shopping';
import { ListClient } from './list-client';

export default function ListPage() {
  const db = getDb();
  const settings = getSettings(db);
  const today = new Date().toLocaleDateString('en-CA');
  const weekStart = weekStartFor(today, settings.weekStartDay);
  const items = listShopping(db, weekStart);

  return (
    <ListClient
      weekStart={weekStart}
      items={items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        checked: i.checked,
        source: i.source,
      }))}
    />
  );
}
