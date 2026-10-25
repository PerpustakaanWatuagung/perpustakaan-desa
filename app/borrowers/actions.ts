'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export type BorrowerActionResult = {
  success: boolean
  message: string
}

export type DeactivateBorrowerResult = {
  success: boolean
  message: string
}

export type ActivateBorrowerResult = {
  success: boolean
  message: string
}

function borrowerName(formData: FormData) {
  const value = formData.get('name')
  return typeof value === 'string' ? value.trim() : ''
}

function borrowerAddress(formData: FormData) {
  const value = formData.get('address')
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function borrowerId(formData: FormData) {
  const value = formData.get('id')
  return typeof value === 'string' ? value.trim() : ''
}

export async function createBorrower(formData: FormData): Promise<BorrowerActionResult> {
  const supabase = await createSupabaseServerClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    return { success: false, message: 'Sesi login tidak valid. Silakan masuk kembali.' }
  }

  const name = borrowerName(formData)
  const address = borrowerAddress(formData)

  if (!name) {
    return { success: false, message: 'Nama peminjam wajib diisi.' }
  }

  const { error } = await supabase
    .from('borrowers')
    .insert({ name, address })

  if (error) {
    return { success: false, message: `Gagal menambahkan peminjam: ${error.message}` }
  }

  revalidatePath('/borrowers')
  return { success: true, message: 'Peminjam berhasil ditambahkan.' }
}

export async function updateBorrower(formData: FormData): Promise<BorrowerActionResult> {
  const supabase = await createSupabaseServerClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    return { success: false, message: 'Sesi login tidak valid. Silakan masuk kembali.' }
  }

  const id = borrowerId(formData)
  const name = borrowerName(formData)
  const address = borrowerAddress(formData)

  if (!id) {
    return { success: false, message: 'Peminjam yang akan diubah tidak valid.' }
  }

  if (!name) {
    return { success: false, message: 'Nama peminjam wajib diisi.' }
  }

  const { data: updatedBorrower, error } = await supabase
    .from('borrowers')
    .update({ name, address })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    return { success: false, message: `Gagal memperbarui peminjam: ${error.message}` }
  }

  if (!updatedBorrower) {
    return { success: false, message: 'Peminjam tidak ditemukan.' }
  }

  revalidatePath('/borrowers')
  return { success: true, message: 'Peminjam berhasil diperbarui.' }
}

export async function deactivateBorrower(formData: FormData): Promise<DeactivateBorrowerResult> {
  const supabase = await createSupabaseServerClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    return { success: false, message: 'Sesi login tidak valid. Silakan masuk kembali.' }
  }

  const id = borrowerId(formData)

  if (!id) {
    return { success: false, message: 'Peminjam yang akan dinonaktifkan tidak valid.' }
  }

  const { data: deactivatedBorrower, error } = await supabase
    .from('borrowers')
    .update({ is_active: false })
    .eq('id', id)
    .eq('is_active', true)
    .select('id')
    .maybeSingle()

  if (error) {
    return { success: false, message: `Gagal menonaktifkan peminjam: ${error.message}` }
  }

  if (!deactivatedBorrower) {
    return { success: false, message: 'Peminjam tidak ditemukan atau sudah nonaktif.' }
  }

  revalidatePath('/borrowers')
  revalidatePath('/borrowers/archive')
  return { success: true, message: 'Peminjam berhasil dinonaktifkan.' }
}

export async function activateBorrower(formData: FormData): Promise<ActivateBorrowerResult> {
  const supabase = await createSupabaseServerClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    return { success: false, message: 'Sesi login tidak valid. Silakan masuk kembali.' }
  }

  const id = borrowerId(formData)

  if (!id) {
    return { success: false, message: 'Peminjam yang akan diaktifkan tidak valid.' }
  }

  const { data: activatedBorrower, error } = await supabase
    .from('borrowers')
    .update({ is_active: true })
    .eq('id', id)
    .eq('is_active', false)
    .select('id')
    .maybeSingle()

  if (error) {
    return { success: false, message: `Gagal mengaktifkan kembali peminjam: ${error.message}` }
  }

  if (!activatedBorrower) {
    return { success: false, message: 'Peminjam tidak ditemukan atau sudah aktif.' }
  }

  revalidatePath('/borrowers')
  revalidatePath('/borrowers/archive')
  return { success: true, message: 'Peminjam berhasil diaktifkan kembali.' }
}
