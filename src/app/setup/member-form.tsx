'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';

export type MemberDraft = {
  name: string;
  dietaryConstraints: string;
  preferences: string;
  portionFactor: number;
};

const PORTION_OPTIONS = [0.5, 1, 1.5, 2];

export function MemberForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  busy,
}: {
  initial?: Partial<MemberDraft>;
  submitLabel: string;
  onSubmit: (draft: MemberDraft) => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const t = useTranslations('member');
  const tc = useTranslations('common');
  const [name, setName] = useState(initial?.name ?? '');
  const [dietaryConstraints, setConstraints] = useState(
    initial?.dietaryConstraints ?? '',
  );
  const [preferences, setPreferences] = useState(initial?.preferences ?? '');
  const [portionFactor, setPortion] = useState(initial?.portionFactor ?? 1);

  function submit() {
    if (!name.trim()) return;
    onSubmit({ name, dietaryConstraints, preferences, portionFactor });
  }

  return (
    <Card className="flex flex-col gap-3">
      <Field label={t('name')} htmlFor="m-name">
        <Input
          id="m-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label={t('constraints')} htmlFor="m-constraints">
        <Input
          id="m-constraints"
          value={dietaryConstraints}
          onChange={(e) => setConstraints(e.target.value)}
          placeholder={t('constraintsHint')}
        />
      </Field>
      <Field label={t('preferences')} htmlFor="m-prefs">
        <Input
          id="m-prefs"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder={t('preferencesHint')}
        />
      </Field>
      <Field label={t('portionFactor')} htmlFor="m-portion">
        <Select
          id="m-portion"
          value={portionFactor}
          onChange={(e) => setPortion(Number(e.target.value))}
        >
          {PORTION_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}×
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex gap-2.5">
        {onCancel && (
          <Button type="button" onClick={onCancel} disabled={busy}>
            {tc('cancel')}
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          className="grow"
          onClick={submit}
          disabled={busy || !name.trim()}
        >
          {submitLabel}
        </Button>
      </div>
    </Card>
  );
}
