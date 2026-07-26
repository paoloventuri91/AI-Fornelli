'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { SlotMatrix, type SlotInput } from '@/components/slot-matrix';
import { CURATED_MODELS } from '@/lib/ai-models';
import {
  addProfileAction,
  deleteProfileAction,
  saveMealSlotsAction,
  setAiModelAction,
  setLanguageAction,
  setWeekStartAction,
  updateProfileAction,
} from '@/server/actions';
import { MemberForm, type MemberDraft } from '@/app/setup/member-form';

type SProfile = {
  id: number;
  name: string;
  color: string;
  dietaryConstraints: string;
  preferences: string;
  portionFactor: number;
};

const OVERRIDE = '__override__';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.05em] text-muted">
        {title}
      </h4>
      {children}
    </div>
  );
}

export function SettingsClient({
  language,
  model,
  weekStartDay,
  profiles: initialProfiles,
  slots: initialSlots,
}: {
  language: string;
  model: string;
  weekStartDay: number;
  profiles: SProfile[];
  slots: SlotInput[];
}) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const router = useRouter();
  const [, start] = useTransition();

  const [profiles, setProfiles] = useState(initialProfiles);
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const known = CURATED_MODELS.some((m) => m.id === model);
  const [modelSel, setModelSel] = useState(known ? model : OVERRIDE);
  const [override, setOverride] = useState(known ? '' : model);

  function changeLanguage(next: string) {
    start(async () => {
      await setLanguageAction(next);
      router.refresh();
    });
  }
  function changeModel(id: string) {
    setModelSel(id);
    if (id !== OVERRIDE) start(() => setAiModelAction(id));
  }
  function saveOverride() {
    if (modelSel === OVERRIDE && override.trim())
      start(() => setAiModelAction(override.trim()));
  }
  function changeWeekStart(day: number) {
    start(() => setWeekStartAction(day));
  }
  function addMember(draft: MemberDraft) {
    start(async () => {
      const created = await addProfileAction(draft);
      setProfiles((p) => [...p, created as SProfile]);
      setAdding(false);
    });
  }
  function saveMember(id: number, draft: MemberDraft) {
    start(async () => {
      const updated = await updateProfileAction(id, draft);
      setProfiles((p) => p.map((x) => (x.id === id ? (updated as SProfile) : x)));
      setEditing(null);
    });
  }
  function removeMember(id: number) {
    start(async () => {
      await deleteProfileAction(id);
      setProfiles((p) => p.filter((x) => x.id !== id));
    });
  }
  function saveSlots(next: SlotInput[]) {
    start(() => saveMealSlotsAction(next));
  }

  return (
    <div className="p-4 md:mx-auto md:max-w-2xl md:p-8">
      <h2 className="mb-4 font-display text-[1.45rem] md:text-[1.7rem]">
        {t('title')}
      </h2>

      <Section title={t('languageSection')}>
        <Card className="flex items-center gap-2.5">
          <span className="grow">{t('languageLabel')}</span>
          <Select
            aria-label={t('languageLabel')}
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="w-auto"
          >
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </Select>
        </Card>
        <p className="mt-1.5 px-0.5 text-[0.82rem] text-muted">
          {t('languageNote')}
        </p>
      </Section>

      <Section title={t('aiSection')}>
        <Card className="flex flex-col gap-2.5">
          <Field label={t('modelLabel')} htmlFor="set-model">
            <Select
              id="set-model"
              value={modelSel}
              onChange={(e) => changeModel(e.target.value)}
            >
              {CURATED_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
              <option value={OVERRIDE}>{t('overrideLabel')}…</option>
            </Select>
          </Field>
          {modelSel === OVERRIDE && (
            <Field label={t('overrideLabel')} htmlFor="set-override">
              <Input
                id="set-override"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                onBlur={saveOverride}
                placeholder={t('overridePlaceholder')}
              />
            </Field>
          )}
        </Card>
      </Section>

      <Section title={t('weekSection')}>
        <Card className="flex items-center gap-2.5">
          <span className="grow">{t('weekStartLabel')}</span>
          <Select
            aria-label={t('weekStartLabel')}
            value={weekStartDay}
            onChange={(e) => changeWeekStart(Number(e.target.value))}
            className="w-auto"
          >
            <option value={1}>{t('monday')}</option>
            <option value={7}>{t('sunday')}</option>
          </Select>
        </Card>
      </Section>

      <Section title={t('membersSection')}>
        <div className="flex flex-col gap-2.5">
          {profiles.map((p) =>
            editing === p.id ? (
              <MemberForm
                key={p.id}
                initial={p}
                submitLabel={tc('save')}
                onSubmit={(d) => saveMember(p.id, d)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <Card key={p.id} className="flex items-center gap-2.5">
                <Avatar name={p.name} color={p.color} />
                <span className="min-w-0 grow">
                  <b>{p.name}</b>
                  <br />
                  <span className="text-[0.82rem] text-muted">
                    {[p.dietaryConstraints, p.preferences]
                      .filter(Boolean)
                      .join(' · ') || `${p.portionFactor}×`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(p.id)}
                  className="text-[0.82rem] font-semibold text-accent"
                >
                  {tc('edit')}
                </button>
                <button
                  type="button"
                  onClick={() => removeMember(p.id)}
                  className="text-[0.82rem] font-semibold text-bad"
                >
                  {tc('delete')}
                </button>
              </Card>
            ),
          )}
          {adding ? (
            <MemberForm
              submitLabel={tc('add')}
              onSubmit={addMember}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <Button onClick={() => setAdding(true)}>+ {tc('add')}</Button>
          )}
        </div>
        <div className="mt-3">
          <SlotMatrix initial={initialSlots} onChange={saveSlots} />
        </div>
      </Section>

      <p className="mt-6 text-center text-[0.82rem] text-muted">
        {t('version')}
      </p>
    </div>
  );
}
