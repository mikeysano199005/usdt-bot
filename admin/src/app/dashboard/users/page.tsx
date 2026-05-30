'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { User } from '@/lib/types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ users: User[]; total: number }>('/users')
      .then((d) => { setUsers(d.users); setTotal(d.total); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed'));
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total users</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Discord ID', 'Username', 'Display Name', 'Joined', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No users yet</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-gray-600">{user.discord_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{user.username ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.display_name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/users/${user.id}`} className="text-sm text-indigo-600 hover:text-indigo-800">
                      View Orders →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
