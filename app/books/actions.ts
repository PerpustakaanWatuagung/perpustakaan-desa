'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export type CreateBookResult = {
  success: boolean
  message: string
}

export type UpdateBookResult = {
  success: boolean
  message: string
}

export type DeactivateBookResult = {
  success: boolean
  message: string
}

export type ActivateBookResult = {
  success: boolean
  message: string
}

function optionalText(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function validId(value: FormDataEntryValue | null) {
  return typeof value === 'string' && /^\d+$/.test(value.trim()) ? value.trim() : null
}

export async function createBook(formData: FormData): Promise<CreateBookResult> {
  const supabase = await createSupabaseServerClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    return { success: false, message: 'Sesi login tidak valid. Silakan masuk kembali.' }
  }

  const categoryValue = formData.get('category_id')
  const categoryId = typeof categoryValue === 'string' ? categoryValue.trim() : ''
  const authorCode = optionalText(formData, 'author_code')

  if (!/^\d+$/.test(categoryId)) {
    return { success: false, message: 'Kategori wajib dipilih dari daftar yang tersedia.' }
  }

  if (authorCode && !/^[A-Za-z0-9]{3}$/.test(authorCode)) {
    return { success: false, message: 'Kode Pengarang harus terdiri dari tiga karakter huruf atau angka.' }
  }

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle()

  if (categoryError) {
    return { success: false, message: `Gagal memeriksa kategori: ${categoryError.message}` }
  }

  if (!category) {
    return { success: false, message: 'Kategori yang dipilih tidak tersedia.' }
  }

  const { error: insertError } = await supabase
    .from('books')
    .insert({
      classification_number: optionalText(formData, 'classification_number'),
      author_code: authorCode,
      title: optionalText(formData, 'title'),
      title_initial: optionalText(formData, 'title_initial'),
      category_id: categoryId,
      is_active: true,
    })

  if (insertError) {
    return { success: false, message: `Gagal menambahkan buku: ${insertError.message}` }
  }

  revalidatePath('/books')
  return { success: true, message: 'Buku berhasil ditambahkan.' }
}

export async function updateBook(formData: FormData): Promise<UpdateBookResult> {
  const supabase = await createSupabaseServerClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    return { success: false, message: 'Sesi login tidak valid. Silakan masuk kembali.' }
  }

  const bookId = validId(formData.get('id'))
  const categoryId = validId(formData.get('category_id'))
  const authorCode = optionalText(formData, 'author_code')

  if (!bookId) {
    return { success: false, message: 'Buku yang akan diubah tidak valid.' }
  }

  if (!categoryId) {
    return { success: false, message: 'Kategori wajib dipilih dari daftar yang tersedia.' }
  }

  if (authorCode && !/^[A-Za-z0-9]{3}$/.test(authorCode)) {
    return { success: false, message: 'Kode Pengarang harus terdiri dari tiga karakter huruf atau angka.' }
  }

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle()

  if (categoryError) {
    return { success: false, message: `Gagal memeriksa kategori: ${categoryError.message}` }
  }

  if (!category) {
    return { success: false, message: 'Kategori yang dipilih tidak tersedia.' }
  }

  const { data: updatedBook, error: updateError } = await supabase
    .from('books')
    .update({
      classification_number: optionalText(formData, 'classification_number'),
      author_code: authorCode,
      title: optionalText(formData, 'title'),
      title_initial: optionalText(formData, 'title_initial'),
      category_id: categoryId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookId)
    .eq('is_active', true)
    .select('id')
    .maybeSingle()

  if (updateError) {
    return { success: false, message: `Gagal memperbarui buku: ${updateError.message}` }
  }

  if (!updatedBook) {
    return { success: false, message: 'Buku tidak ditemukan atau sudah tidak aktif.' }
  }

  revalidatePath('/books')
  return { success: true, message: 'Buku berhasil diperbarui.' }
}

export async function deactivateBook(formData: FormData): Promise<DeactivateBookResult> {
  const supabase = await createSupabaseServerClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    return { success: false, message: 'Sesi login tidak valid. Silakan masuk kembali.' }
  }

  const bookId = validId(formData.get('id'))

  if (!bookId) {
    return { success: false, message: 'Buku yang akan dinonaktifkan tidak valid.' }
  }

  const { data: deactivatedBook, error: deactivateError } = await supabase
    .from('books')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookId)
    .eq('is_active', true)
    .select('id')
    .maybeSingle()

  if (deactivateError) {
    return { success: false, message: `Gagal menonaktifkan buku: ${deactivateError.message}` }
  }

  if (!deactivatedBook) {
    return { success: false, message: 'Buku tidak ditemukan atau sudah nonaktif.' }
  }

  revalidatePath('/books')
  return { success: true, message: 'Buku berhasil dinonaktifkan.' }
}

export async function activateBook(formData: FormData): Promise<ActivateBookResult> {
  const supabase = await createSupabaseServerClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    return { success: false, message: 'Sesi login tidak valid. Silakan masuk kembali.' }
  }

  const bookId = validId(formData.get('id'))

  if (!bookId) {
    return { success: false, message: 'Buku yang akan diaktifkan tidak valid.' }
  }

  const { data: activatedBook, error: activateError } = await supabase
    .from('books')
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookId)
    .eq('is_active', false)
    .select('id')
    .maybeSingle()

  if (activateError) {
    return { success: false, message: `Gagal mengaktifkan kembali buku: ${activateError.message}` }
  }

  if (!activatedBook) {
    return { success: false, message: 'Buku tidak ditemukan atau sudah aktif.' }
  }

  revalidatePath('/books/archive')
  revalidatePath('/books')
  return { success: true, message: 'Buku berhasil diaktifkan kembali.' }
}
