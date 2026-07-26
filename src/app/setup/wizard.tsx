'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Chip } from '@/components/ui/chip';
import { Stepper } from '@/components/ui/stepper';
import { Avatar } from '@/components/ui/avatar';
import { SlotMatrix, type SlotInput } from '@/components/slot-matrix';
import { CURATED_MODELS } from '@/lib/ai-models';
import { cn } from '@/lib/cn';
import {
  addProfileAction,
  deleteProfileAction,
  finishSetupAction,
  saveMealSlotsAction,
  setAiModelAction,
  setLanguageAction,
} from '@/server/actions';
import { MemberForm, type MemberDraft } from './member-form';

type WizProfile = {
  id: number;
  name: string;
  color: string;
  dietaryConstraints: string;
  preferences: string;
  portionFactor: number;
};

const OVERRIDE = '__override__';

export function SetupWizard({
  initialLanguage,
  initialModel,
  initialProfiles,
  initialSlots,
  hasApiKey,
}: {
  initialLanguage: string;
  initialModel: string;
  initialProfiles: WizProfile[];
  initialSlots: SlotInput[];
  hasApiKey: boolean;
}) {
  const t = useTranslations('wizard');
  const tc = useTranslations('common');
  const router = useRouter();
  const [pending, start] = useTransition();

  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState(initialLanguage);
  const [profiles, setProfiles] = useState<WizProfile[]>(initialProfiles);
  const [adding, setAdding] = useState(initialProfiles.length === 0);
  const [slots, setSlots] = useState<SlotInput[]>(
    initialSlots.length ? initialSlots : [{ name: t('slotDinner'), days: [1, 2, 3, 4, 5, 6, 7] }],
  );
  const knownModel = CURATED_MODELS.some((m) => m.id === initialModel);
  const [model, setModel] = useState(knownModel ? initialModel : OVERRIDE);
  const [override, setOverride] = useState(knownModel ? '' : initialModel);
  const [error, setError] = useState<string | null>(null);

  // ── Step 1: lingua ──
  function chooseLanguage(next: string) {
    setLanguage(next);
    start(async () => {
      await setLanguageAction(next);
      router.refresh(); // aggiorna le stringhe UI nella nuova lingua
    });
  }

  // ── Step 2: membri ──
  function addMember(draft: MemberDraft) {
    setError(null);
    start(async () => {
      try {
        const created = await addProfileAction(draft);
        setProfiles((prev) => [...prev, created as WizProfile]);
        setAdding(false);
      } catch {
        setError('add');
      }
    });
  }
  function removeMember(id: number) {
    start(async () => {
      await deleteProfileAction(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    });
  }

  // ── Step 3: slot ──
  function onSlotsChange(next: SlotInput[]) {
    setSlots(next);
    start(async () => {
      await saveMealSlotsAction(next);
    });
  }

  // ── Step 4: modello + fine ──
  const effectiveModel = model === OVERRIDE ? override.trim() : model;
  function finish() {
    setError(null);
    start(async () => {
      try {
        if (effectiveModel) await setAiModelAction(effectiveModel);
        await finishSetupAction();
      } catch {
        setError('finish');
      }
    });
  }

  const canFinish = profiles.length > 0 && slots.some((s) => s.days.length > 0);

  return (
    <div>
      <Stepper total={4} current={step} />

      {step === 0 && (
        <section>
          <h1 className="mb-0.5 font-display text-[1.35rem] text-balance">
            {t('step1Title')}
          </h1>
          <p className="mb-4 text-[0.88rem] text-muted">{t('step1Sub')}</p>
          <div className="flex flex-col gap-2.5">
            <LangChoice
              flag="🇮🇹"
              title={t('langItalian')}
              hint={t('langItalianHint')}
              selected={language === 'it'}
              onClick={() => chooseLanguage('it')}
            />
            <LangChoice
              flag="🇬🇧"
              title={t('langEnglish')}
              hint={t('langEnglishHint')}
              selected={language === 'en'}
              onClick={() => chooseLanguage('en')}
            />
          </div>
          <div className="mt-4.5 flex gap-2.5">
            <Button
              variant="primary"
              block
              onClick={() => setStep(1)}
              disabled={pending}
            >
              {tc('continue')}
            </Button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 className="mb-0.5 font-display text-[1.35rem] text-balance">
            {t('step2Title')}
          </h1>
          <p className="mb-4 text-[0.88rem] text-muted">{t('step2Sub')}</p>
          <div className="flex flex-col gap-2.5">
            {profiles.map((p) => (
              <Card key={p.id} className="flex items-center gap-2.5">
                <Avatar name={p.name} color={p.color} />
                <span className="min-w-0 grow">
                  <b>{p.name}</b>
                  <br />
                  <span className="text-[0.82rem] text-muted">
                    {p.dietaryConstraints || t('noConstraints')} ·{' '}
                    {t('portion', { factor: p.portionFactor })}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeMember(p.id)}
                  className="text-[0.82rem] font-semibold text-bad"
                  disabled={pending}
                >
                  {tc('delete')}
                </button>
              </Card>
            ))}
            {adding ? (
              <MemberForm
                submitLabel={tc('add')}
                onSubmit={addMember}
                onCancel={
                  profiles.length > 0 ? () => setAdding(false) : undefined
                }
                busy={pending}
              />
            ) : (
              <Button onClick={() => setAdding(true)}>
                + {t('addMember')}
              </Button>
            )}
          </div>
          <WizNav
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
            nextLabel={tc('continue')}
            nextDisabled={profiles.length === 0 || pending}
          />
        </section>
      )}

      {step === 2 && (
        <section>
          <h1 className="mb-0.5 font-display text-[1.35rem] text-balance">
            {t('step3Title')}
          </h1>
          <p className="mb-4 text-[0.88rem] text-muted">{t('step3Sub')}</p>
          <SlotMatrix initial={slots} onChange={onSlotsChange} />
          <WizNav
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextLabel={tc('continue')}
            nextDisabled={pending}
          />
        </section>
      )}

      {step === 3 && (
        <section>
          <h1 className="mb-0.5 font-display text-[1.35rem] text-balance">
            {t('step4Title')}
          </h1>
          <p className="mb-4 text-[0.88rem] text-muted">{t('step4Sub')}</p>
          <div className="mb-2.5">
            <Chip tone={hasApiKey ? 'good' : 'bad'}>
              {hasApiKey ? `✓ ${t('keyFound')}` : `✕ ${t('keyMissing')}`}
            </Chip>
          </div>
          <div className="flex flex-col gap-2.5">
            <Field label={t('model')} htmlFor="wiz-model">
              <Select
                id="wiz-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {CURATED_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
                <option value={OVERRIDE}>Override…</option>
              </Select>
            </Field>
            {model === OVERRIDE && (
              <Input
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                placeholder="es. mistralai/mistral-large"
                aria-label={t('model')}
              />
            )}
          </div>
          {error === 'finish' && (
            <p className="mt-3 text-[0.85rem] text-bad">
              {tc('comingSoonBody')}
            </p>
          )}
          <WizNav
            onBack={() => setStep(2)}
            onNext={finish}
            nextLabel={t('finish')}
            nextDisabled={!canFinish || pending}
          />
        </section>
      )}
    </div>
  );
}

function LangChoice({
  flag,
  title,
  hint,
  selected,
  onClick,
}: {
  flag: string;
  title: string;
  hint: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[var(--radius-card)] border-[1.5px] p-3.5 text-left',
        selected ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
      )}
    >
      <span className="text-[1.4rem]">{flag}</span>
      <span className="grow">
        <b>{title}</b>
        <br />
        <span className="text-[0.82rem] text-muted">{hint}</span>
      </span>
      {selected && <span>✓</span>}
    </button>
  );
}

function WizNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  const tc = useTranslations('common');
  return (
    <div className="mt-4.5 flex gap-2.5">
      <Button onClick={onBack}>{tc('back')}</Button>
      <Button
        variant="primary"
        className="grow"
        onClick={onNext}
        disabled={nextDisabled}
      >
        {nextLabel}
      </Button>
    </div>
  );
}
