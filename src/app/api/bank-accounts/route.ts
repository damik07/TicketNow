// src/app/api/bank-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic';

// 🧠 Algoritmo matemático para validar Dígitos Verificadores del CBU/CVU argentino
function validarCBU(cbu: string): boolean {
  if (cbu.length !== 22 || !/^\d+$/.test(cbu)) return false;

  const ponderadoresBloque1 = [7, 1, 3, 9, 7, 1, 3];
  const ponderadoresBloque2 = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];

  // Validación Bloque 1 (Banco y Sucursal)
  let suma1 = 0;
  for (let i = 0; i < 7; i++) {
    suma1 += parseInt(cbu[i]) * ponderadoresBloque1[i];
  }
  const digitoVerificador1 = (10 - (suma1 % 10)) % 10;
  if (parseInt(cbu[7]) !== digitoVerificador1) return false;

  // Validación Bloque 2 (Número de Cuenta)
  let suma2 = 0;
  for (let i = 0; i < 13; i++) {
    suma2 += parseInt(cbu[8 + i]) * ponderadoresBloque2[i];
  }
  const digitoVerificador2 = (10 - (suma2 % 10)) % 10;
  if (parseInt(cbu[21]) !== digitoVerificador2) return false;

  return true;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 })
    }

    const accounts = await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    // Mapeamos al formato snake_case que espera tu frontend para no romper la vista
    const mappedAccounts = accounts.map(acc => ({
      id: acc.id,
      user_id: acc.userId,
      alias: acc.alias || '',
      cbu: acc.cbu,
      bank_name: acc.bankName,
      account_holder: acc.accountHolder,
      is_default: acc.isDefault
    }))

    return NextResponse.json(mappedAccounts)
  } catch (error) {
    console.error('Error al obtener cuentas bancarias:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { cbu, alias, bank_name, account_holder, is_default } = body

    if (!cbu || !account_holder || !bank_name) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
    }

    // 1. 🛡️ Validar estructura matemática real del CBU/CVU
    if (!validarCBU(cbu)) {
      return NextResponse.json({ 
        error: 'El CBU/CVU ingresado no pasa los dígitos verificadores bancarios.' 
      }, { status: 400 })
    }

    // 2. 🛡️ Control de Identidad Cruzada
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const nombreUsuario = (dbUser.full_name || "").toLowerCase().trim()
    const nombreTitularCuenta = (account_holder || "").toLowerCase().trim()

    const palabrasUsuario = nombreUsuario.split(" ")
    const palabrasTitular = nombreTitularCuenta.split(" ")
    
    // Validamos que al menos una palabra clave (nombre o apellido) con más de 2 letras coincida
    const coincideIdentidad = palabrasUsuario.some(palabra => 
      palabra.length > 2 && palabrasTitular.includes(palabra)
    )

    if (!coincideIdentidad) {
      return NextResponse.json({ 
        error: 'Validación de CUIT/Identidad Fallida: La cuenta bancaria debe estar a nombre del usuario registrado.' 
      }, { status: 403 })
    }

    // 3. Ejecutamos en transacción respetando el modelo de datos exacto de tu DB
    const newAccount = await prisma.$transaction(async (tx) => {
      if (is_default) {
        await tx.bankAccount.updateMany({
          where: { userId: session.user.id },
          data: { isDefault: false }
        })
      }

      return await tx.bankAccount.create({
        data: {
          userId: session.user.id,
          cbu,
          alias: alias || null,
          bankName: bank_name,
          accountHolder: account_holder,
          isDefault: is_default
        }
      })
    })

    // Retornamos mapeando a snake_case tal cual como lo tenías planeado
    return NextResponse.json({
      id: newAccount.id,
      user_id: newAccount.userId,
      cbu: newAccount.cbu,
      alias: newAccount.alias || '',
      bank_name: newAccount.bankName,
      account_holder: newAccount.accountHolder,
      is_default: newAccount.isDefault
    })
  } catch (error) {
    console.error('Error al crear cuenta bancaria:', error)
    return NextResponse.json({ error: 'Error al guardar la cuenta' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Cambiar cuenta predeterminada: desactiva las otras primero
    await prisma.$transaction(async (tx) => {
      await tx.bankAccount.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false }
      })

      await tx.bankAccount.update({
        where: { id },
        data: { isDefault: true }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al actualizar cuenta predeterminada:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await prisma.bankAccount.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar cuenta bancaria:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}