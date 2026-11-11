import { Construction } from 'lucide-react';

export default function ComingSoon({ name }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-gray-400">
      <Construction className="w-12 h-12 text-gray-300" />
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-700">{name}</h2>
        <p className="text-sm mt-1">This module is coming soon.</p>
      </div>
    </div>
  );
}
