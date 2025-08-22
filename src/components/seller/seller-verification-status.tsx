"use client"

import { VerificationStatusBadge } from "@/components/seller/verification-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { SellerVerification } from "@prisma/client"
import Link from "next/link"

interface SellerVerificationStatusProps {
  verification: SellerVerification
}

export function SellerVerificationStatus({ verification }: SellerVerificationStatusProps) {
  return (
    <div className="container max-w-2xl py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Seller Verification Status</CardTitle>
              <CardDescription>
                Submitted on {formatDate(verification.createdAt)}
              </CardDescription>
            </div>
            <VerificationStatusBadge status={verification.status} />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Personal Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{verification.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Birth Date</p>
                <p className="font-medium">{formatDate(verification.birthDate)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{verification.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium">{verification.phoneNumber}</p>
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Bank Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Bank Name</p>
                <p className="font-medium">{verification.bankName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Account Number</p>
                <p className="font-medium">{verification.bankAccount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Account Holder</p>
                <p className="font-medium">{verification.bankHolder}</p>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Uploaded Documents</h3>
            <div className="grid grid-cols-3 gap-4">
              <a 
                href={verification.ktpUrl} 
                target="_blank"
                rel="noopener noreferrer" 
                className="block p-4 bg-muted rounded-lg text-center hover:bg-muted/80 transition-colors"
              >
                View KTP
              </a>
              <a 
                href={verification.selfieUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-muted rounded-lg text-center hover:bg-muted/80 transition-colors"
              >
                View Selfie
              </a>
              <a 
                href={verification.bankProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-muted rounded-lg text-center hover:bg-muted/80 transition-colors"
              >
                View Bank Proof
              </a>
            </div>
          </div>

          {/* Rejection Reason */}
          {verification.status === "REJECTED" && (
            <div className="p-4 bg-destructive/10 rounded-lg">
              <h3 className="font-semibold text-destructive mb-2">Rejection Reason</h3>
              <p className="text-destructive">
                {(verification as any)?.rejectReason ??
                  "Your application was rejected. Please review the requirements and submit a new application."}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/dashboard/seller">Back to Dashboard</Link>
          </Button>
          {verification.status === "REJECTED" && (
            <Button asChild>
              <Link href="/dashboard/seller/verify">Submit New Application</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
