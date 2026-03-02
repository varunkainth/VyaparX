"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { businessService } from "@/services/business.service"
import type { BusinessMember } from "@/types/business"
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
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import { Loader2 } from "lucide-react"

const updateRoleSchema = z.object({
    role: z.enum(["admin", "staff", "accountant", "viewer"]),
    is_active: z.enum(["true", "false"]),
})

type UpdateRoleFormValues = z.infer<typeof updateRoleSchema>

interface UpdateRoleModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    businessId: string
    member: BusinessMember
}

export function UpdateRoleModal({ isOpen, onClose, onSuccess, businessId, member }: UpdateRoleModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<UpdateRoleFormValues>({
        resolver: zodResolver(updateRoleSchema),
        defaultValues: {
            role: member.role as any,
            is_active: member.is_active ? "true" : "false",
        },
    })

    // Update default values if member prop changes
    useEffect(() => {
        if (member) {
            reset({
                role: member.role as any,
                is_active: member.is_active ? "true" : "false",
            })
        }
    }, [member, reset])

    const handleOpenChange = (open: boolean) => {
        if (isSubmitting) return
        if (!open) {
            onClose()
        }
    }

    const onSubmit = async (data: UpdateRoleFormValues) => {
        try {
            const isActive = data.is_active === "true"
            const roleChanged = data.role !== member.role
            const statusChanged = isActive !== member.is_active

            // Send both updates sequentially if changed
            if (roleChanged) {
                await businessService.updateMemberRole(businessId, member.user_id, {
                    role: data.role as any,
                })
            }

            if (statusChanged) {
                await businessService.updateMemberStatus(businessId, member.user_id, {
                    is_active: isActive,
                })
            }

            if (roleChanged || statusChanged) {
                toast.success("Member updated successfully!")
                onSuccess()
            } else {
                toast.info("No changes were made.")
            }

            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Update Team Member</DialogTitle>
                    <DialogDescription>
                        Manage role and access for {member.name || member.email?.split("@")[0] || member.user_id}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FieldGroup>
                        <Field>
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
                        </Field>

                        <Field className="mt-4">
                            <FieldLabel htmlFor="is_active">Status</FieldLabel>
                            <NativeSelect
                                id="is_active"
                                {...register("is_active")}
                                disabled={isSubmitting}
                            >
                                <option value="true">Active (Has Access)</option>
                                <option value="false">Deactivated (Removed)</option>
                            </NativeSelect>
                            {errors.is_active && (
                                <p className="text-xs text-destructive mt-1">{errors.is_active.message}</p>
                            )}
                            <FieldDescription className="text-xs mt-1">
                                Setting a user to Deactivated will immediately revoke their access to this business context.
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
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
