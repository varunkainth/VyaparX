"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { businessService } from "@/services/business.service"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/error-handler"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import { Loader2 } from "lucide-react"

const inviteSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    role: z.enum(["admin", "staff", "accountant", "viewer"]),
})

type InviteFormValues = z.infer<typeof inviteSchema>

interface InviteMemberModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    businessId: string
}

export function InviteMemberModal({ isOpen, onClose, onSuccess, businessId }: InviteMemberModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<InviteFormValues>({
        resolver: zodResolver(inviteSchema),
        defaultValues: {
            email: "",
            role: "viewer" as any, // default
        },
    })

    // Prevent dialog close while submitting
    const handleOpenChange = (open: boolean) => {
        if (isSubmitting) return
        if (!open) {
            reset()
            onClose()
        }
    }

    const onSubmit = async (data: InviteFormValues) => {
        try {
            await businessService.inviteMember(businessId, {
                email: data.email,
                // @ts-ignore - The schema guarantees it's one of the allowed types.
                role: data.role,
            })
            toast.success("Member invited successfully!")
            reset()
            onSuccess()
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                        Send an invitation for a user to join this business. The user must already be registered on VyaparX.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="email">Email Address</FieldLabel>
                            <Input
                                id="email"
                                placeholder="user@example.com"
                                type="email"
                                {...register("email")}
                                disabled={isSubmitting}
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                            )}
                        </Field>

                        <Field className="mt-4">
                            <FieldLabel htmlFor="role">Role</FieldLabel>
                            <NativeSelect
                                id="role"
                                {...register("role")}
                                disabled={isSubmitting}
                            >
                                <option value="admin">Admin</option>
                                <option value="staff">Staff</option>
                                <option value="accountant">Accountant</option>
                                <option value="viewer">Viewer</option>
                            </NativeSelect>
                            {errors.role && (
                                <p className="text-xs text-destructive mt-1">{errors.role.message}</p>
                            )}
                            <FieldDescription className="text-xs mt-1">
                                Owners cannot be assigned. Owners must transfer ownership manually.
                            </FieldDescription>
                        </Field>
                    </FieldGroup>
                    <DialogFooter className="mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Inviting...
                                </>
                            ) : (
                                "Send Invite"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
