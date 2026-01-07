/**
 * WHOIS Form Component
 * Input form for domain WHOIS queries
 */

'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils/cn'
import { isValidDomain } from '@/lib/utils/validation'

interface WhoisFormProps {
  /** Current domain value */
  value: string

  /** Handler for value changes */
  onChange: (value: string) => void

  /** Handler for form submission */
  onSubmit: (domain: string) => void

  /** Whether query is in progress */
  isLoading?: boolean
}

/**
 * WHOIS query form component
 * Provides controlled input with basic client-side validation
 */
export function WhoisForm({ value, onChange, onSubmit, isLoading = false }: WhoisFormProps) {
  const t = useTranslations('whois')
  const [inputError, setInputError] = React.useState<string | null>(null)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (inputError) {
      setInputError(null)
    }
    onChange(event.target.value)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = value.trim()

    // Validation: required
    if (!trimmed) {
      setInputError(t('form.errors.required'))
      return
    }

    // Validation: domain format
    if (!isValidDomain(trimmed)) {
      setInputError(t('form.errors.invalid'))
      return
    }

    setInputError(null)
    onSubmit(trimmed.toLowerCase())
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-border bg-card p-6 shadow-sm"
      noValidate
    >
      <div className="space-y-2">
        <label htmlFor="whois-domain" className="text-sm font-medium text-foreground">
          {t('form.label')}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="whois-domain"
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={t('form.placeholder')}
            className={cn(
              'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              inputError && 'border-destructive focus-visible:ring-destructive'
            )}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="whois-domain-description whois-domain-error"
            aria-invalid={Boolean(inputError)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t('form.submitting') : t('form.submit')}
          </button>
        </div>
        <p id="whois-domain-description" className="text-xs text-muted-foreground">
          {t('form.helper')}
        </p>
        {inputError && (
          <p id="whois-domain-error" className="text-xs font-medium text-destructive">
            {inputError}
          </p>
        )}
      </div>
    </form>
  )
}
