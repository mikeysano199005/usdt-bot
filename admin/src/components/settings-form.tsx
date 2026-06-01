'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings } from '@/lib/types';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const schema = z.object({
  exchange_rate: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid number'),
  rate_markup_percent: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid percentage'),
  upi_id: z.string().min(1),
  bank_account_name: z.string().min(1),
  bank_account_number: z.string().min(1),
  bank_ifsc: z.string().min(1),
  bank_name: z.string().min(1),
  our_wallet_trc20: z.string().min(1, 'Required for sell orders'),
  our_wallet_bep20: z.string().min(1, 'Required for sell orders'),
  our_wallet_erc20: z.string().min(1, 'Required for sell orders'),
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
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const Field = ({ name, label, placeholder, mono }: { name: keyof FormData; label: string; placeholder?: string; mono?: boolean }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        {...register(name)}
        placeholder={placeholder}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mono ? 'font-mono' : ''}`}
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      <section>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">💱 Exchange Rate</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field name="exchange_rate" label="Fallback Rate (INR per USDT)" placeholder="88.50" />
          <Field name="rate_markup_percent" label="Live Rate Markup %" placeholder="2" />
        </div>
        <p className="text-xs text-gray-400 mt-2">Live rate is fetched automatically. Markup % is added for buy orders, deducted for sell orders.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">📱 UPI Payment</h3>
        <Field name="upi_id" label="UPI ID" placeholder="merchant@upi" />
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">🏦 Bank Transfer</h3>
        <div className="space-y-3">
          <Field name="bank_account_name" label="Account Holder Name" />
          <Field name="bank_account_number" label="Account Number" mono />
          <Field name="bank_ifsc" label="IFSC Code" mono />
          <Field name="bank_name" label="Bank Name" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">💼 Our USDT Wallets (for Sell Orders)</h3>
        <p className="text-xs text-gray-500 mb-1">When users sell USDT, they send it to these wallets. Make sure they are correct.</p>
        <div className="flex gap-2 mb-3">
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full border border-blue-100">✅ Trust Wallet</span>
          <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 text-xs font-medium px-2 py-1 rounded-full border border-yellow-100">✅ Binance Web3 Wallet</span>
        </div>
        <div className="space-y-3">
          <Field name="our_wallet_trc20" label="TRC20 Wallet Address (Trust Wallet / Binance Web3)" placeholder="T..." mono />
          <Field name="our_wallet_bep20" label="BEP20 Wallet Address (Trust Wallet / Binance Web3)" placeholder="0x..." mono />
          <Field name="our_wallet_erc20" label="ERC20 Wallet Address (Trust Wallet / Binance Web3)" placeholder="0x..." mono />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">🛟 Support</h3>
        <div className="space-y-3">
          <Field name="support_contact" label="Support Contact" placeholder="@yourusername" />
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
