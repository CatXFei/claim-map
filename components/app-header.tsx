"use client"

import { Network } from "lucide-react"

export function AppHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-2 relative z-10">
      <div className="flex items-center">
        <div className="flex items-center space-x-1.5">
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-1.5 rounded-md shadow-sm">
            <Network className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">ClaimMap</h1>
          </div>
        </div>
      </div>
    </header>
  )
}
