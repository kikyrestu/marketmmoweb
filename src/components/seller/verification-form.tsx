"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"

const formSchema = z.object({
  // Personal Information
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  address: z.string().min(10, "Please enter your complete address"),
  phoneNumber: z.string().min(10, "Please enter a valid phone number"),
  birthDate: z.date(),

  // Bank Information
  bankName: z.string().min(2, "Please enter your bank name"),
  bankAccount: z.string().min(10, "Please enter your bank account number"),
  bankHolder: z.string().min(3, "Please enter the account holder name"),

  // Files
  ktpFile: z.any(),
  selfieFile: z.any(),
  bankProofFile: z.any(),
})

export function SellerVerificationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      address: "",
      phoneNumber: "",
      bankName: "",
      bankAccount: "",
      bankHolder: "",
    },
  })

  const uploadFile = async (file: File, type: string) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", type)

    const response = await fetch("/api/seller/verification/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload ${type}`)
    }

    const data = await response.json()
    return data.url
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true)
      setError("")

      // Upload files first
      const [ktpUrl, selfieUrl, bankProofUrl] = await Promise.all([
        uploadFile(values.ktpFile[0], "ktp"),
        uploadFile(values.selfieFile[0], "selfie"),
        uploadFile(values.bankProofFile[0], "bankProof"),
      ])

      // Submit verification data
      const response = await fetch("/api/seller/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          ktpUrl,
          selfieUrl,
          bankProofUrl,
        }),
      })

      if (!response.ok) {
        let msg = "Gagal submit verifikasi"
        try { msg = await response.text() } catch {}
        toast.error(msg)
        setError(msg)
        return
      }

      toast.success("Verifikasi berhasil dikirim!")
      window.location.href = "/dashboard/verification-status"
    } catch (err) {
      console.error(err)
      toast.error("Gagal submit verifikasi. Silakan coba lagi.")
      setError("Gagal submit verifikasi. Silakan coba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Seller Verification</h1>
        <p className="text-gray-600">
          Please complete the form below to verify your seller account. Make sure all
          information is accurate and documents are clear.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
          {error}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {isSubmitting && (
            <div className="space-y-4 mb-6">
              {[...Array(4)].map((_,i)=>(<div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />))}
            </div>
          )}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Personal Information</h2>
            
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your legal full name" {...field} aria-label="Nama lengkap" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Birth Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Your complete address" {...field} aria-label="Alamat" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+62..." {...field} aria-label="Nomor HP" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Bank Information</h2>
            
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your bank name" {...field} aria-label="Nama bank" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Your bank account number" {...field} aria-label="Nomor rekening" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Name as shown on bank account" {...field} aria-label="Nama pemilik rekening" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Document Upload</h2>
            
            <FormField
              control={form.control}
              name="ktpFile"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>KTP Image</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      aria-label="Upload foto KTP"
                      onChange={(e) => onChange(e.target.files)}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a clear photo of your KTP
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selfieFile"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Verification Selfie</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      aria-label="Upload selfie verifikasi"
                      onChange={(e) => onChange(e.target.files)}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a selfie of you holding a paper with "marketmmoind#{format(new Date(), 'yyyyMMdd')}#[your full name]"
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankProofFile"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Bank Account Proof</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      aria-label="Upload bukti rekening bank"
                      onChange={(e) => onChange(e.target.files)}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload proof of your bank account (e.g., book account page showing your name and account number)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" className="w-full" aria-label="Submit verifikasi" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Verification"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
