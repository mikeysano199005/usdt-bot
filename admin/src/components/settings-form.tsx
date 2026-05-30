'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings } from '@/lib/types';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const schema = z.object({
  exchange_rate: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid number'),
  upi_id: z.string().min(1),
  bank_account_name: z.string().min(1),
  bank_account_number: z.string().min(1),
  bank_ifsc: z.string().min(1),
  bank_name: z.string().min(1),
  support_contact: z.string().min(1),
  support_response_hours: z.string().regex(/^\d+$/),
});

type FormData = z.infer<typeof schema>;

interface SettingsFormProps {
  settings: Settings;
  onSaved: (settings: Settings) => void;
}

export function SettingsForm({ settings, onSaved }: SettingsFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: settings,
  });

  const onSubmit = async (data: FormData) => {
    try {
      const updated = await api.put<Settings>('/settings', data);
      onSaved(updated);
      toast.success('Settings saved successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      toast.error(message);
    }
  };

  const Field = ({ name, label, placeholder }: { name: keyof FormData; label: string; placeholder?: string }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        {...register(name)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Exchange Rate</h3>
        <Field name="exchange_rate" label="INR per USDT" placeholder="88.50" />
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">UPI Payment</h3>
        <Field name="upi_id" label="UPI ID" placeholder="merchant@upi" />
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Bank Transfer</h3>
        <div className="space-y-3">
          <Field name="bank_account_name" label="Account Holder Name" />
          <Field name="bank_account_number" label="Account Number" />
          <Field name="bank_ifsc" label="IFSC Code" />
          <Field name="bank_name" label="Bank Name" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Support</h3>
        <div className="space-y-3">
          <Field name="support_contact" label="Support Contact (Discord username or link)" placeholder="@yourusername" />
          <Field name="support_response_hours" label="Response Time (hours)" placeholder="2" />
        </div>
      </section>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
      >
        {isSubmitting ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}
