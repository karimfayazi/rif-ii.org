'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import DIKPanialaGISMapSection from '@/components/DIKPanialaGISMap';

export default function TestingGisPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Testing GIS - DIK Paniala Maps</h1>
          <p className="text-gray-600 mt-1">Testing the extracted DIK District - Tehsil Wise - Paniala Maps component</p>
        </div>
      </div>

      {/* DIK Paniala GIS Map Section */}
      <DIKPanialaGISMapSection />
    </div>
  );
}
