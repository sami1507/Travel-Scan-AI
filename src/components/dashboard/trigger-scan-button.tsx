"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Loader2 } from "lucide-react"

interface TriggerScanButtonProps {
  sourceConfigId: string
  onSuccess?: () => void
}

export default function TriggerScanButton({ sourceConfigId, onSuccess }: TriggerScanButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleTrigger = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/trigger-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceConfigId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger scan')
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button
        onClick={handleTrigger}
        disabled={loading}
        size="sm"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Run Scan
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  )
}
