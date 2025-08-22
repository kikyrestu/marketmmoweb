"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface VerificationStatusProps {
  verification: {
    status: "PENDING" | "APPROVED" | "REJECTED"
    submittedAt: Date
    verifiedAt?: Date | null
    notes?: string | null
  }
}

export function VerificationStatus({ verification }: VerificationStatusProps) {
  const statusColor = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800"
  }[verification.status]

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Seller Verification Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            <Badge className={statusColor}>
              {verification.status}
            </Badge>
          </div>

          <div>
            <span className="font-medium">Submitted on:</span>
            <p>{format(new Date(verification.submittedAt), "PPP")}</p>
          </div>

          {verification.verifiedAt && (
            <div>
              <span className="font-medium">Verified on:</span>
              <p>{format(new Date(verification.verifiedAt), "PPP")}</p>
            </div>
          )}

          {verification.notes && verification.status === "REJECTED" && (
            <div>
              <span className="font-medium">Reason for rejection:</span>
              <p className="text-red-600">{verification.notes}</p>
            </div>
          )}

          {verification.status === "APPROVED" && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mt-4">
              <p className="text-green-800">
                Congratulations! Your seller account has been verified. You can now start
                selling items on our platform.
              </p>
            </div>
          )}

          {verification.status === "PENDING" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-4">
              <p className="text-yellow-800">
                Your verification is being reviewed. This process usually takes 1-2
                business days. We will notify you once the review is complete.
              </p>
            </div>
          )}

          {verification.status === "REJECTED" && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
              <p className="text-red-800">
                Unfortunately, your verification was rejected. Please review the
                rejection reason and submit a new verification request with the
                corrected information.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
